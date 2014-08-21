var util = require('./util.js');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;

module.exports = function(settings) {
	
	function decodeAndParseAuthenticationRequest(requestParams, cb) {
		decodeAuthenticationRequest(requestParams, function(err, xml) {
			if(err) return cb(err);

			var doc = new dom().parseFromString(xml);
			parseAuthenticationRequest(doc, function (err, requestData) {
				if(err) return cb(err);
				requestData.relayState = requestParams.RelayState;
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
		
		requestData.id = request.getAttribute("ID");
		requestData.issueInstant = request.getAttribute("IssueInstant");
		requestData.acsUrl = request.getAttribute("AssertionConsumerServiceURL");
		
		var issuer = xpath.select1("*[local-name(.)='Issuer']", request);
		if(!issuer) {
			return cb(new Error("No document issuer"));			
		}
		requestData.issuer = issuer.firstChild.data;
		
		var nameId = xpath.select1("*[local-name(.)='NameIDPolicy']", request);
		if(nameId) {
			requestData.nameIDPolicy = {
				allowCreate: nameId.getAttribute('AllowCreate'),
				format: nameId.getAttribute('Format')
			};
		}
		
		cb(null, requestData);
	}
	
	function decodeAuthenticationRequest(requestParams, cb) {
		// TODO: might eventually want to handle signed requests (not used frequently)
		if(!requestParams.SAMLRequest) {
			return cb(new Error("Request parameters contain no SAMLRequest property"));
		}
		util.inflateAndDecode(requestParams.SAMLRequest, cb);
	}
	
	return {
		decodeAndParseAuthenticationRequest: decodeAndParseAuthenticationRequest,
		decodeAuthenticationRequest: decodeAuthenticationRequest
	}
};
