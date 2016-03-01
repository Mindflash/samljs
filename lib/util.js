var zlib = require('zlib');
var crypto = require('crypto');
var xmldom = require('xmldom');
var xmlCrypto = require('xml-crypto');
var xpath = require('xpath');
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

module.exports.inflateAndDecode = function(base64, cb) {
	var decoded = new Buffer(base64, 'base64');
	zlib.inflateRaw(decoded, function(err, inflatedXML) {
		if(err) return cb(err);
		cb(null, inflatedXML.toString());
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

function PEMToCert(pem) {
	var cert = [];
	_.each(pem.split("\n"), function(line) {
		if(line && line.indexOf("----") != 0) cert.push(line);
	});
	return cert.join("\n");
}

module.exports.certToPEM = certToPEM;
module.exports.PEMToCert = PEMToCert;

module.exports.signRequest = function(request, cert) {
	var signer = crypto.createSign('RSA-SHA1');
	signer.update(request);
	return signer.sign(cert, 'base64');
};

module.exports.verifyResponse = function(doc, xml, cert) {
	if(!doc) return false;
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

module.exports.signAuthenticationResponse = function (xml, privateCertPem, cert) {
	if(!xml) return false;
	var sig = new xmlCrypto.SignedXml();
	sig.addReference("//*[local-name(.)='Assertion']", [
		"http://www.w3.org/2000/09/xmldsig#enveloped-signature",
		"http://www.w3.org/2001/10/xml-exc-c14n#"
	]);
	sig.signingKey = new Buffer(privateCertPem).toString('ascii');
	sig.keyInfoProvider = {
		getKeyInfo: function (key) {
			return "<X509Data><X509Certificate>" + PEMToCert(cert) + "</X509Certificate></X509Data>";
		}
	};
	sig.computeSignature(xml);
	
	// need to insert the signature in the assertion
	var dom = new xmldom.DOMParser();
	var signedXmlDom = dom.parseFromString(sig.getOriginalXmlWithIds());
	var signatureXmlDom = dom.parseFromString(sig.getSignatureXml());
	
	var subjectElement = signedXmlDom.getElementsByTagName("saml:Subject")[0];
	signedXmlDom.documentElement.insertBefore(signatureXmlDom.documentElement, subjectElement);
	
	return '<?xml version="1.0" encoding="UTF-8"?>' + "\n" + signedXmlDom.toString(); 
};

module.exports.generateAuthRequestParams = function(settings, overrides) {
	var params = overrides || {};
	
	// these are the parameters to the ejs template
	_.defaults(params, {
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
			"authenticationContextClassRef" : settings.idp.authenticationContextClassRef || "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"
		}
	});

	if(settings.idp.noAuthContext) params.requestedAuthenticationContext = null;
	return params;
};

module.exports.generateAuthResponseParams = function(settings, overrides) {
	overrides = overrides || {};

	var now = new Date();
	
	// these are the parameters to the ejs template
	return _.defaults(overrides, {
		responseId: generateUniqueId(),
		assertionId: generateUniqueId(),
		spAssertionId: settings.sp.authRequestId,
		timestamp: now.toISOString(),
		notOnOrAfter: settings.conditions.notOnOrAfter,
		acsUrl: settings.sp.acsUrl,
		issuer: settings.idp.issuer,
		nameQualifier: settings.idp.nameQualifier,
		email: settings.subject.email,
		sessIndex: settings.subject.sessIdEncrypted,
		attributes: settings.subject.attributes,
		conditions: settings.idp.excludeConditions ? null : settings.conditions,
		excludeInResponseTo: settings.idp.excludeInResponseTo || false
	});	
};
