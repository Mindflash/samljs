var zlib = require('zlib');
var crypto = require('crypto');
var xml2js = require('xml2js');
var xmldom = require('xmldom');
var xmlCrypto = require('xml-crypto');
var _ = require('lodash');

function generateUniqueId() {
	var chars = "abcdef0123456789";
	var uniqueID = "";
	for (var i = 0; i < 20; i++) {
		uniqueID += chars.substr(Math.floor((Math.random()*15)), 1);
	}
	return "_" + uniqueID;
}
module.exports.generateUniqueId = generateUniqueId;

module.exports.cleanXML = function(xml) {
	return xml.replace(/\>\s*\</g, "><");
}

module.exports.deflateAndEncode = function(xml, cb) {
	zlib.deflateRaw(xml, function(err, deflatedXML) {
		if(err) return cb(err);
		deflatedXML = deflatedXML.toString("base64");
		cb(null, deflatedXML);
	});
};

module.exports.decode = function(content, sourceEncoding, targetEncoding) {
	return Buffer(content, sourceEncoding).toString(targetEncoding);
};

function certToPEM(cert) {
	cert = cert.match(/.{1,64}/g).join('\n');
	cert = "-----BEGIN CERTIFICATE-----\n" + cert;
	cert = cert + "\n-----END CERTIFICATE-----\n";
	return cert;
}
module.exports.certToPEM = certToPEM;

module.exports.signRequest = function(request, cert) {
	var signer = crypto.createSign('RSA-SHA1');
	signer.update(request);
	return signer.sign(cert, 'base64');
};

module.exports.parseXml = function(xmlString, cb) {
	var parser = new xml2js.Parser({explicitRoot:true});

	parser.parseString(xmlString, function (err, doc) {
		if(err) return cb(err);
		
		cb(null, doc);
	});
};

module.exports.verifyResponse = function(xml, cert) {
	if(!xml) return false;
	var doc = new xmldom.DOMParser().parseFromString(xml);
	var signature = xmlCrypto.xpath(doc, "//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']")[0];
	if(!signature) return false;
	var sig = new xmlCrypto.SignedXml();
	sig.keyInfoProvider = {
		getKeyInfo: function (key) {
			return "<X509Data></X509Data>";
		},
		getKey: function (keyInfo) {
			return certToPEM(cert);
		}
	};
	sig.loadSignature(signature.toString());
	return sig.checkSignature(xml);
};

module.exports.getXmlElement = function(parentElement, elementName) {
	// TODO: this is janky, find a better way
	if (parentElement['saml:' + elementName]) {
		return parentElement['saml:' + elementName];
	} else if (parentElement['samlp:'+elementName]) {
		return parentElement['samlp:'+elementName];
	}
	return parentElement[elementName];
};

module.exports.generateAuthRequestParams = function(settings, overrides) {
	overrides = overrides || {};
	
	// these are the parameters to the ejs template
	return _.defaults(overrides, {
		"uniqueId" : generateUniqueId(),
		"issueInstant" : new Date().toISOString(),
		"version" : "2.0",
		"protocolBinding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
		"assertionConsumerServiceUrl" : settings.sp.assertionConsumerServiceUrl,
		"spInitiatedRedirectUrl" : settings.idp.spInitiatedRedirectUrl,
		"issuer" : settings.sp.issuer,
		"nameIdFormat" : settings.sp.nameIdFormat || "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
		"nameIdAllowCreate" : settings.sp.nameIdAllowCreate || "true",
		"relayState" : null,
		"requestedAuthenticationContext" : {
			"comparison" : "exact",
			"authenticationContextClassRef" : "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"
		}
	});
};