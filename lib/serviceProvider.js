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
		// optional: used to sign all outgoing requests to the IDP. IDP must have record of this cert.
		"privateCert" : null,
		"authRequestParams" : null,
		"authResponseParams" : null
	});
	
	if(settings.authRequestParams) {
		_.defaults(settings.authRequestParams, {
			"version" : "2.0",
			"protocolBinding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
			// required
			"assertionConsumerServiceUrl" : null,
			// required
			"spInitiatedRedirectUrl" : null,
			// required
			"issuer" : null,
			"nameIdFormat" : "urn:oasis:names:tc:SAML:1.1:nameid-format:transient",
			"nameIdAllowCreate" : "true",
			// optional
			"relayState" : null,
			"requestedAuthenticationContext" : {
				"comparison" : "exact",
				"authenticationContextClassRef" : "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"
			}		
		});
	}

	if(settings.authResponseParams) {
		_.defaults(settings.authResponseParams, {
			// required. obtain from idp
			"cert" : null
		});
	}
	
	
	var generateAuthRequestXML = function(cb) {
		var pack = function (err, xml) {
			if(err) return cb(err);
			util.deflateAndEncode(xml, cb);
		};
		
		var render = function(err, ejsTemplate) {
			if (err) return cb(err);
			
			settings.authRequestParams.uniqueId = util.generateUniqueId();
			settings.authRequestParams.issueInstant = new Date().toISOString();

			var renderedXML = ejs.render(ejsTemplate.toString(), settings.authRequestParams);

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

			if(settings.authRequestParams.relayState) {
				queryStringArgs.RelayState = settings.authRequestParams.relayState;
			}
			
			if (settings.privateCert) {
				queryStringArgs.SigAlg = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
				queryStringArgs.Signature = util.signRequest(querystring.stringify(queryStringArgs), settings.privateCert);
			}
			
			var url = settings.authRequestParams.spInitiatedRedirectUrl + "?" +  querystring.stringify(queryStringArgs);

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

			if(settings.authResponseParams.cert && !util.verifyResponse(xml, settings.authResponseParams.cert)) {
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
				profile.issuer = issuer[0];
			}

			var subject = util.getXmlElement(assertion[0], 'Subject');
			if (subject) {
				var nameID = util.getXmlElement(subject[0], 'NameID');
				if (nameID) {
					profile.nameID = nameID[0]._;

					if (nameID[0].$.Format) {
						profile.nameIDFormat = nameID[0].$.Format;
					}
				}
			}

			var attributeStatement = util.getXmlElement(assertion[0], 'AttributeStatement');
			if (!attributeStatement) {
				return callback(new Error('Missing AttributeStatement'), null);
			}

			var attributes = util.getXmlElement(attributeStatement[0], 'Attribute');

			if (attributes) {
				attributes.forEach(function (attribute) {
					var value = util.getXmlElement(attribute, 'AttributeValue');
					if (typeof value[0] === 'string') {
						profile[attribute.$.Name] = value[0];
					} else {
						profile[attribute.$.Name] = value[0]._;
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
