var util = require('./util.js');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var _ = require('lodash');
var util = require('./util.js');
var ejs = require('ejs');
var fs = require("fs");

module.exports = function() {
	
	var authRequestTemplateXMLFile = __dirname + "/../xml-templates/authnResponse-default.ejs";
	
	function decodeAndParseAuthenticationRequest(requestParams, cb) {
		decodeAuthenticationRequest(requestParams, function(err, xml) {
			if(err) return cb(err);

			var doc = new dom().parseFromString(xml);
			parseAuthenticationRequest(doc, function (err, requestData) {
				if(err) return cb(err);
				if(requestParams.RelayState) {
					requestData.relayState = requestParams.RelayState;
				}
				cb(null, requestData);
			});
		});
	}

	function parseAuthenticationRequest(doc, cb) {
		var requestData = {};
		var request = xpath.select1("*[local-name(.)='AuthnRequest']", doc);
		if (!request) {
			return cb(new Error("No document request"));
		}
		
		requestData.authRequestId = request.getAttribute("ID");
		requestData.issueInstant = request.getAttribute("IssueInstant");
		requestData.acsUrl = request.getAttribute("AssertionConsumerServiceURL");
		
		var issuer = xpath.select1("*[local-name(.)='Issuer']", request);
		if(!issuer) {
			return cb(new Error("No document issuer"));			
		}
		requestData.issuer = issuer.firstChild.data;
		
		requestData.nameIDPolicies = [];
		var nameIds = xpath.select("*[local-name(.)='NameIDPolicy']", request);
		if(nameIds) {
			for (var i = 0; i < nameIds.length; i++) {
				var nameId = nameIds[i];
				requestData.nameIDPolicies.push({
					allowCreate: nameId.getAttribute('AllowCreate'),
					format: nameId.getAttribute('Format')
				});
			}
		}
		
		cb(null, requestData);
	}
	
	function decodeAuthenticationRequest(requestParams, cb) {
		// TODO: might eventually want to handle signed requests (not used frequently)
		if(!requestParams.SAMLRequest) {
			return cb(new Error("Request parameters contain no SAMLRequest property"));
		}
		if(requestParams.binding === "redirect") {
			return util.inflateAndDecode(requestParams.SAMLRequest, cb);
		} else {
			cb(null, util.decode(requestParams.SAMLRequest, "base64", "utf8"));
		}
	}
	
	function generateAuthenticationResponse(settings, cb) {
		var ejsParams = util.generateAuthResponseParams(settings);
		var xmlTemplate = fs.readFileSync(authRequestTemplateXMLFile).toString();
		var xml = ejs.render(xmlTemplate, ejsParams);

		// sign it
		var signedXml = util.signAuthenticationResponse(xml, settings.idp.privateKey, settings.idp.cert);
		
		// compress it
		if(settings.binding == "redirect") {
			return util.deflateAndEncode(signedXml, cb);
		} else {
			// always default to post binding
			return cb(null, util.decode(signedXml, "utf8", "base64"));
		}
	}
	
	return {
		decodeAndParseAuthenticationRequest: decodeAndParseAuthenticationRequest,
		decodeAuthenticationRequest: decodeAuthenticationRequest,
		generateAuthenticationResponse: generateAuthenticationResponse
	}
};
