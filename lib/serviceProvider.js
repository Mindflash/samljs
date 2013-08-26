var ejs = require('ejs');
var util = require('./util.js');
var fs = require('fs');
var _ = require('lodash');
var zlib = require('zlib');
var querystring = require('querystring');

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
			
			var url = settings.idp.spInitiatedRedirectUrl + "?" +  querystring.stringify(queryStringArgs);

			cb(null, url);
		};
		
		generateAuthRequestXML(finish);
	};
	
	var processAuthResponsePost = function(samlResponse, cb) {
		var xml = util.decode(samlResponse, "base64", "ascii");

		var parse = function(err, verifiedXml) {
			if(err) return cb(err);

			util.parseXml(verifiedXml, function(err, responseObj) {
				if(err) return cb(err);
				
				generateProfileFromReponse(responseObj, cb);
			});
		};
		
		var verify = function(err) {
			if(err) return cb(err);

			if(settings.idp.publicCert && !util.verifyResponse(xml, settings.idp.publicCert)) {
				return cb("Response could not be verified using idp certificate.")
			}

			if(settings.verifyAuthResponsePostSig) {
				settings.verifyAuthResponsePostSig(xml, parse);
			} else {
				parse(null, xml);
			}
		};
				
		if(settings.verifyAuthResponsePreSig) {
			settings.verifyAuthResponsePreSig(xml, verify);
		} else {
			verify();
		}		
	};
	
	function generateProfileFromReponse(doc, callback) {
		var response = util.getXmlElement(doc, 'Response');
		if (response) {
			var assertion = util.getXmlElement(response, 'Assertion');
			if (!assertion) {
				return callback(new Error('Missing SAML assertion'), null);
			}

			profile = {};
			var issuer = util.getXmlElement(assertion[0], 'Issuer');
			if (issuer) {
				profile.issuer = issuer[0]._;
			}

			var subject = util.getXmlElement(assertion[0], 'Subject');
			if (subject) {
				var nameID = util.getXmlElement(subject[0], 'NameID');
				if (nameID) {
					profile.subject = { value : nameID[0]._ };

					if (nameID[0].$.Format) {
						profile.subject.format = nameID[0].$.Format;
					}
				}
			}

			var conditions = util.getXmlElement(assertion[0], 'Conditions');
			if(conditions) {
				profile.conditions = {};
				if(conditions[0].$.NotBefore) {
					profile.conditions.NotBefore = conditions[0].$.NotBefore;
				}
				if(conditions[0].$.NotOnOrAfter) {
					profile.conditions.NotOnOrAfter = conditions[0].$.NotOnOrAfter;
				}
			}
			
			var attributeStatement = util.getXmlElement(assertion[0], 'AttributeStatement');
			if (!attributeStatement) {
				return callback(new Error('Missing AttributeStatement'), null);
			}

			var attributes = util.getXmlElement(attributeStatement[0], 'Attribute');

			if (attributes) {
				var attribs = profile.attributes = {};
				attributes.forEach(function (attribute) {
					var value = util.getXmlElement(attribute, 'AttributeValue');
					if (typeof value[0] === 'string') {
						attribs[attribute.$.Name] = { value : value[0] };
					} else {
						attribs[attribute.$.Name] = { value : value[0]._ };
					}
					if(attribute.$.NameFormat) {
						attribs[attribute.$.Name].format = attribute.$.NameFormat;
					}
				});
			}


			if (!profile.mail && profile['urn:oid:0.9.2342.19200300.100.1.3']) {
				// See http://www.incommonfederation.org/attributesummary.html for definition of attribute OIDs
				profile.mail = profile['urn:oid:0.9.2342.19200300.100.1.3'];
			}

			if (!profile.email && profile.mail) {
				profile.email = profile.mail;
			}

			callback(null, profile);
		}
	}
	
	return {
		generateAuthRequestRedirectURL : generateAuthRequestRedirectURL,
		processAuthResponsePost : processAuthResponsePost
	};
};
