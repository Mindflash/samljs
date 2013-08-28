"use strict"
var test = require('tap').test;
var mockery = require('mockery');
var querystring = require('querystring');
var urlUtil = require("url");
var _ = require('lodash');
var fs = require('fs');

var sp_assertionConsumerServiceUrl = "http://bugs.mftdev.com/saml/acs";
var sp_issuer = "mindflash.com";
var idp_spInitiatedRedirectUrl = "https://mindflash--QA.cs16.my.salesforce.com/idp/endpoint/HttpRedirect";
var idp_issuer = "https://mindflash--QA.cs16.my.salesforce.com";
var idp_publicCert = "MIIChTCCAe4CCQDmaVJdugc35DANBgkqhkiG9w0BAQUFADCBhjELMAkGA1UEBhMCTFYxDzANBgNVBAgMBkxBVFZJQTENMAsGA1UEBwwEUklHQTEPMA0GA1UECgwGRGlhdG9tMQswCQYDVQQLDAJJVDEZMBcGA1UEAwwQYWxleHAubWZ0ZGV2LmNvbTEeMBwGCSqGSIb3DQEJARYPYWxleHBAZGlhdG9tLmx2MB4XDTEzMDgyODEzMjI1OVoXDTE0MDgyODEzMjI1OVowgYYxCzAJBgNVBAYTAkxWMQ8wDQYDVQQIDAZMQVRWSUExDTALBgNVBAcMBFJJR0ExDzANBgNVBAoMBkRpYXRvbTELMAkGA1UECwwCSVQxGTAXBgNVBAMMEGFsZXhwLm1mdGRldi5jb20xHjAcBgkqhkiG9w0BCQEWD2FsZXhwQGRpYXRvbS5sdjCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEA6IFFhtZRLA8nmNgoeJbIOvmw3RZxh6djjOoIWeWx/cZ8HSwC4Aoja7FG/V53EGQglg2MNArqyHeaMopeycxzSsnzhO5RsWJbVeIFXrp8y8LPMFlLSZKKqTfSyQlcdbDPWXk8Vm8qW4fXR3hqDW87Sc387rynvONAQCJYW81sg7UCAwEAATANBgkqhkiG9w0BAQUFAAOBgQA0j/H3brqxdvTzpzgmSr2AAk4Ws/P9zeZwROJMLTx3MBOzuR1mnx4C5529ljFbmgcLMWUh1HXgFMWKe0N5+PSbLN79q/MlPbmbeS448QPVvcJMwQ0M7cBwdoti5oGeTXPiLUXNbhsFaZWojCGtlc3T0ogYjviKDwGOjrmtZGuHTw==";
var sp_privateCert = "MIICXQIBAAKBgQDogUWG1lEsDyeY2Ch4lsg6+bDdFnGHp2OM6ghZ5bH9xnwdLALgCiNrsUb9XncQZCCWDYw0CurId5oyil7JzHNKyfOE7lGxYltV4gVeunzLws8wWUtJkoqpN9LJCVx1sM9ZeTxWbypbh9dHeGoNbztJzfzuvKe840BAIlhbzWyDtQIDAQABAoGAYYwbB39TfxC8pDvMfwuD5npr4dZQu4FXGv/1kQH1s2tbF0In0qduRPiTuCmx+oaHxWzZrdwGtSS45Qt4yWGl3KYqDE6EHgONVYA/VfxD10U7RfKblHf88RF44vMUPK1mYWLirlBTs50F5xR3KVNkt7C+GzFA7aoAUXKTzprDYeECQQD5U63RosAwle4eMsDWMabC6OH/dWiAkXkgHZ4RyPC7q5BD7gJ9s9udmBJvJ4pAX2Q6appAb70smJWBtdWLUIMPAkEA7rpVWz7gcE5e7IUrmbfundsHiWqOlWx6hDZH+pArfNIDqoFWhaqZ+j8rQbwXFWdgMzXb+g6+vI7U1SvccvO8+wJAfHTCzWRaX2ZYCIb5L3J1ddHeDjDDS3pSZi+imeoeEPAhAWeroqfHNrGUchvgrSVw2KAiA4xDeCFqb+ceg35bDQJBAOwvb9lpmNWjw+hPTLa1sh99HrTGtrCA9amupoHwdwX0JepgMgDmq5ZZPuu3MkNb1mJ0C+IXCoA0876/uUgFe1cCQQC4SXGxT5wVDARqm/V0NrAK1p9WBAEsIdr83BZ6hVLmtUiieLymWWCmxAJnbY0d/J6Y45+25b2ci/9ihVPE33tX";


var settings = {
	sp: {
		assertionConsumerServiceUrl: sp_assertionConsumerServiceUrl,
		issuer: sp_issuer
	},
	idp: {
		spInitiatedRedirectUrl: idp_spInitiatedRedirectUrl,
		issuer: idp_issuer,
		publicCert: idp_publicCert
	}
};


test('Suite setup', function (t) {
	t.test("Setup mocks", function (t) {
		mockery.enable();
		var util = require("../lib/util.js");
		util.signRequest = function (request, cert) {
			return "Signed";
		};
		util.verifyResponse = function (xml, cert) {
			return true;
		}
		mockery.registerMock('./util.js', util);
		mockery.warnOnUnregistered(false);
		t.end();
	});
	t.end();
});

test('Generate auth request redirect URL without private cert', function (t) {
	var samlServiceProvider = require("../lib/serviceProvider.js")(settings);
	samlServiceProvider.generateAuthRequestRedirectURL(function (err, url) {
		t.notOk(err, "No errors should have been thrown, received: " + err);
		t.ok(url, "Should return url");
		var resultUrl = urlUtil.parse(url);
		t.equal((resultUrl.protocol + "//" + resultUrl.host + resultUrl.pathname).toLowerCase(), idp_spInitiatedRedirectUrl.toLowerCase(), "Should starts with provided url");
		var queryStringArgs = querystring.parse(resultUrl.query);
		t.ok(queryStringArgs.SAMLRequest, "Should contains SAMLRequest in query parameters");
		t.notOk(queryStringArgs.SigAlg, "Should not have SigAlg in query parameters");
		t.notOk(queryStringArgs.Signature, "Should not have Signature in query parameters");
		t.end();
	});
});


test('Generate auth request redirect URL with private cert', function (t) {
	var sett = _.defaults({ sp: {
		privateCert: sp_privateCert
	}}, settings);
	var samlServiceProvider = require("../lib/serviceProvider.js")(sett);
	samlServiceProvider.generateAuthRequestRedirectURL(function (err, url) {
		t.notOk(err, "No errors should have been thrown, received: " + err);
		t.ok(url, "Should return url");
		var resultUrl = urlUtil.parse(url);
		t.equal((resultUrl.protocol + "//" + resultUrl.host + resultUrl.pathname).toLowerCase(), idp_spInitiatedRedirectUrl.toLowerCase(), "Should starts with provided url");
		var queryStringArgs = querystring.parse(resultUrl.query);
		t.ok(queryStringArgs.SAMLRequest, "Should contains SAMLRequest in query parameters");
		t.equal(queryStringArgs.SigAlg, "http://www.w3.org/2000/09/xmldsig#rsa-sha1", "Should have SigAlg in query parameters");
		t.equal(queryStringArgs.Signature, "Signed", "Should have Signature in query parameters");
		t.end();
	});
});


test('Generate auth request redirect URL with relayState', function (t) {
	var relayState = "Some_state";
	var sett = _.defaults({ relayState: relayState }, settings);
	var samlServiceProvider = require("../lib/serviceProvider.js")(sett);
	samlServiceProvider.generateAuthRequestRedirectURL(function (err, url) {
		t.notOk(err, "No errors should have been thrown, received: " + err);
		t.ok(url, "Should return url");
		var resultUrl = urlUtil.parse(url);
		t.equal((resultUrl.protocol + "//" + resultUrl.host + resultUrl.pathname).toLowerCase(), idp_spInitiatedRedirectUrl.toLowerCase(), "Should starts with provided url");
		var queryStringArgs = querystring.parse(resultUrl.query);
		t.ok(queryStringArgs.SAMLRequest, "Should contains SAMLRequest in query parameters");
		t.notOk(queryStringArgs.SigAlg, "Should not have SigAlg in query parameters");
		t.notOk(queryStringArgs.Signature, "Should not have Signature in query parameters");
		t.equal(queryStringArgs.RelayState, relayState, "Should have RelayState in query parameters");
		t.end();
	});
});

test('Process Auth Response Post', function (t) {

	var samlServiceProvider = require("../lib/serviceProvider.js")(settings);

	fs.readFile(__dirname + '/saml2TestResponse.xml', function (err, data) {
		t.notOk(err, "Should read test response without errors: " + err);
		t.ok(data, "Should return data");

		t.end();

		/*
		// TODO: Finish tests. Needed saml2 response xml, public and private keys.
		samlServiceProvider.processAuthResponsePost(data.toString('base64'), function(err, data){
		 t.notOk(err, "No errors should have been thrown, received: " + err);
		 t.end();
		 });
		 */
	});
});


test('Suite tearDown', function (t) {
	t.test('Teardown mock', function (t) {
		mockery.disable();
		mockery.deregisterAll();
		t.end();
	});
	t.end();
});