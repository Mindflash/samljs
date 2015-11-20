var ejs = require('ejs');
var util = require('./util.js');
var fs = require('fs');
var _ = require('lodash');
var zlib = require('zlib');
var querystring = require('querystring');
var urlUtil = require('url');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;

module.exports = function(settings) {
	settings = settings || {};
	
	_.defaults(settings, {
		// optional: raw ejs template string
		"authRequestTemplateXML" : null,
		// optional: will use this file if authRequestTemplateXML is not supplied
		"authRequestTemplateXMLFile" : __dirname + "/../xml-templates/authnRequest-default.ejs",
		// optional: function hook to alter/inspect xml packet before packing
		"verifyAuthRequest" : null,
		// optional: function hook to alter/inspect xml packet before verifying signing, cannot alter xml
		"verifyAuthResponsePreSig" : null,
		// optional: function hook to alter/inspect xml packet after verifying signing, can alter xml
		"verifyAuthResponsePostSig" : null,
		// optional: will be passed to idp via auth request, then passed back from idp to sp in auth response
		"relayState" : null,
		// required
		"sp" : null,
		// required
		"idp" : null
	});
	
	if(settings.sp) {
		_.defaults(settings.dp, {
			// required
			"assertionConsumerServiceUrl" : null,
			// required
			"issuer" : null,
			"nameIdFormat" : "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
			"nameIdAllowCreate" : "true",
			// optional, for signing auth requests. idp must have public key.
			// (not currently implemented)
			"privateCert" : null,
			"publicCert" : null
		});
	}

	if(settings.idp) {
		_.defaults(settings.idp, {
			// required, unless spInitiatedPostUrl is supplied
			"spInitiatedRedirectUrl" : null,
			// required, unless spInitiatedRedirectUrl is supplied
			// (not currently implemented)
			"spInitiatedPostUrl" : null,
			// required
			"issuer" : null,
			// required to verify auth responses
			"publicCert" : null
		});
	}	
	
	var generateAuthRequestXML = function(cb) {
		var pack = function (err, xml) {
			if(err) return cb(err);
			util.deflateAndEncode(xml, cb);
		};
		
		var render = function(err, ejsTemplate) {
			if (err) return cb(err);
			
			var authRequestParams = util.generateAuthRequestParams(settings);
			var renderedXML = ejs.render(ejsTemplate.toString(), authRequestParams);

			if(settings.verifyAuthRequest) {
				settings.verifyAuthRequest(renderedXML, pack);
			} else {
				pack(null, renderedXML);	
			}			
		};
		
		if(settings.authRequestTemplateXML) {
			render(null, settings.authRequestTemplateXML);
		} else {
			fs.readFile(settings.authRequestTemplateXMLFile, render);
		}		
	};
	
	var generateAuthRequestRedirectURL = function(cb) {
		var finish = function(err, samlRequest) {
			if(err) return cb(err);

			var queryStringArgs = {
				SAMLRequest: samlRequest
			};

			if(settings.relayState) {
				queryStringArgs.RelayState = settings.relayState;
			}
			
			if (settings.sp.privateCert) {
				queryStringArgs.SigAlg = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
				queryStringArgs.Signature = util.signRequest(querystring.stringify(queryStringArgs), settings.sp.privateCert);
			}
			
			var delimiter = urlUtil.parse(settings.idp.spInitiatedRedirectUrl).search ? "&" : "?";
			var url = settings.idp.spInitiatedRedirectUrl + delimiter +  querystring.stringify(queryStringArgs);

			cb(null, url);
		};
		
		generateAuthRequestXML(finish);
	};
	
	var processAuthResponsePost = function(postBody, cb) {
		var samlResponse = postBody.SAMLResponse;
		if(!samlResponse) {
			return cb(Error("SAMLResponse not found in posted body."));
		}
		
		var xml = util.decode(samlResponse, "base64", "utf8");
		var doc;

		var parse = function(err) {
			if(err) return cb(err);
			generateProfileFromResponse(postBody, doc, cb);
		};
		
		var verify = function(err) {
			if(err) return cb(err);

			doc = new dom().parseFromString(xml);

			if(settings.idp.publicCert && !util.verifyResponse(doc, xml, settings.idp.publicCert)) {
				return cb("Response could not be verified using idp certificate.")
			}

			if(settings.verifyAuthResponsePostSig) {
				settings.verifyAuthResponsePostSig(xml, parse);
			} else {
				parse();
			}
		};
				
		if(settings.verifyAuthResponsePreSig) {
			settings.verifyAuthResponsePreSig(xml, verify);
		} else {
			verify();
		}		
	};
	
	var generateProfileFromResponse = function(postBody, doc, cb) {
		var profile = {};
		
		var response = xpath.select1("*[local-name(.)='Response']", doc);
		if (!response) {
			return cb(new Error("No document response"));
		}
		
		var assertion = xpath.select1("*[local-name(.)='Assertion']", response);
		if (!assertion) {
			return cb(new Error("No document assertion"));
		}
		
		var issuer = xpath.select1("*[local-name(.)='Issuer']", response);
		if(issuer) {
			profile.issuer = issuer.firstChild.data;
		}
		
		var subject = xpath.select1("*[local-name(.)='Subject']", assertion);
		if(subject) {
			var nameID = xpath.select1("*[local-name(.)='NameID']", subject);
			if(nameID) {
				profile.subject = { 
					value : nameID.firstChild.data,
					format : nameID.getAttribute("Format")
				};
			}
		}
		
		var conditions = xpath.select1("*[local-name(.)='Conditions']", assertion);
		if(conditions) {
			profile.conditions = {
				NotBefore: conditions.getAttribute("NotBefore"),
				NotOnOrAfter: conditions.getAttribute("NotOnOrAfter")
			};
		}

		var attributes = xpath.select("*[local-name(.)='AttributeStatement']/*[local-name(.)='Attribute']", assertion);
		if (attributes) {
			var attribs = profile.attributes = {};
			attributes.forEach(function (attribute) {
				var name = attribute.getAttribute("Name");
				var val = xpath.select1("*[local-name(.)='AttributeValue']", attribute);
				if(name && val && val.firstChild) {
					attribs[name.toLowerCase()] = {
						value : val.firstChild.data,
						format : attribute.getAttribute("NameFormat")
					}
				}
			});

			if (!profile.attributes.mail && profile.attributes['urn:oid:0.9.2342.19200300.100.1.3']) {
				// See http://www.incommonfederation.org/attributesummary.html for definition of attribute OIDs
				profile.attributes.mail = profile.attributes['urn:oid:0.9.2342.19200300.100.1.3'];
			}

			if (!profile.attributes.email && profile.attributes.mail) {
				profile.attributes.email = profile.attributes.mail;
			}
		}

		if(postBody.RelayState) {
			profile.relayState = postBody.RelayState;
		}

		return cb(null, profile);		
	};
	
	return {
		generateAuthRequestRedirectURL : generateAuthRequestRedirectURL,
		processAuthResponsePost : processAuthResponsePost,
		generateProfileFromResponse : generateProfileFromResponse
	};
};
