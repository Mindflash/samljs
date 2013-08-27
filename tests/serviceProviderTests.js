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
var idp_publicCert = "AAAAB3NzaC1yc2EAAAABJQAAAQEAmDiQKM03EEjmFTACnH0SM83j533JxbL0ut8OtKf97VympC6Ws6NeBZx6Ku3Xc7I7dZc3So9aVQ2LwXFSNA+itvmAa28rS4yqSy57NinaaRkG16NPKqghJLoAOpVeeklFu+tMv7nKPLF8AnMpteLd8e4bnk+UNJpSTtg0nIBOH/p7viB0V4mZ6ztI3KBXFTWlAsZE3VfPzS62EcOVl8iipc9ZgCviq6q+MS6daJTayTaZyW1lUAuWA113OIXSVh9qTCo8pZ15taZEWD6DhTgy8jKUPPJG7nWcXUguBygu0KvEaIzbPswYxmQ8ALScpTxo8y6xE8JmVr1MOQNscROtBQ==";
var sp_privateCer = "AAABABSSBaSmHDKiEUEiKd3LtloHEPXE4+pInZy2W+7mROi5fk2JwVaLssJ87eogJAi3OHespptfeujmJ6SE727RrjRm59cqstLbqE9ZTuukynzntNEIOyFwqohsKYtgSwmbMu/hhul5+LwX/ABUwHKGcQUEgEXTZw4HBDQrDgdPm9rOm1pAFp8yY1i/4iTrCPYllsOEqlVobAD4AXNwuzZvEL8nfQhJP1A6hCHG270fUySr3s0RjHTSHgKMYbSAJvknohze2ZlJnRPVmDyLqNrUmewonl/d5PWZdxQmtIaPIVx2S7dZiW4AIxP56z+kzdynfxJrAKsik7XH/WgYsxPWVW0AAACBAP7KQzsQGASv1je3wgMpcMcJZazOhNIbb5k62iyPSDR1UsQIvQpJlEM3Ja8nyW2uEVGkACKJNkthTXvG6i2JaKcadNZUiJzWWdgV616QfeicLgywDgVneDzox1nAn/kYZQ8cru5uYAQWsnhPGyzRveb4/z06oOW6cE2/Y85afI+VAAAAgQCY8ZyR4JZPqqXuE6yrNK61hb4R/TSrRC14gKcy3BdYqfH4Oh2ddsvcZnyUL7BsPvo90YUAMyjS9ZrCBrQd/15GwneCfFqFsuyfTxZ2oWHXTz5Z+q1wBydUrC81/GULpagemK3AomsRG97Dp298cqcI2ErVTSGh9LhE3bWkHWULsQAAAIEAlRSABHeyxBw7v/lNVv2OdrOZZztCLByPJwwqXQvYmOrc6pzgNgHs2t7jI8VUsZrOzeVE51HqZqLs7g3uojFQx+b0u5HDZuM/yF5aAqaSabO2F1LNrk9A9sSVVAteikStl5udM77pAMtDMJkTIk0gGo9oIh98qXJVGfSau7Yekzc=";


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
		privateCert: sp_privateCer
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

		// TODO: Finish tests. Needed saml2 response xml, public and private keys.
		/*samlServiceProvider.processAuthResponsePost(data.toString('base64'), function(err, data){
		 t.notOk(err, "No errors should have been thrown, received: " + err);
		 t.end();
		 });*/
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