"use strict"
var _ = require('lodash');
var test = require('tap').test;
var fs = require('fs');
var mockery = require('mockery');

var deflateRawCalled = false;

var realPublicCert = "MIIEnzCCA4egAwIBAgIOAUCixM7VAAAAAGxxrpYwDQYJKoZIhvcNAQEFBQAwgYwxJDAiBgNVBAMMG01pbmRmbGFzaCAgQ3VzdG9tZXIgQWNjb3VudDEYMBYGA1UECwwPMDBEZjAwMDAwMDJKaE5SMRcwFQYDVQQKDA5TYWxlc2ZvcmNlLmNvbTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzELMAkGA1UECAwCQ0ExDDAKBgNVBAYTA1VTQTAeFw0xMzA4MjEyMTI1NDFaFw0xNTA4MjEyMTI1NDFaMIGMMSQwIgYDVQQDDBtNaW5kZmxhc2ggIEN1c3RvbWVyIEFjY291bnQxGDAWBgNVBAsMDzAwRGYwMDAwMDAySmhOUjEXMBUGA1UECgwOU2FsZXNmb3JjZS5jb20xFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xCzAJBgNVBAgMAkNBMQwwCgYDVQQGEwNVU0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCSrzesj8CkyyNR9OhnsrUs1J72UUtutOaOAH4p8usGlZM0QSk2oMb8ytHV6xAS0sCOQeGpFBWUG5QTWhZ1qUGFu9uw36OcH2UC7uIC4y7CTGraEw5OGGi0QUIY9RJk8bnkVqSLWUJpKg+5Mi/2r9+rF/dXMoue5JadEQAsv5yBxRrkMStds2dkyuI2Zh7P0HP9Sgmbt4GFuEMtcQHUes8s09rvRiSa/gUPJG9Vq9XW9vID4l64cDYUOwmwZLmUBryifCCFGeGrWMkDi2ZkjRI2O1yMS0ZfF+wnalrOBM8hULkvjrrLXs4nuilrTFpgBv3OxeGG3Pp6zIirdP+OjSCVAgMBAAGjgfwwgfkwHQYDVR0OBBYEFLCWii/TwrWYoCh4Apr/BTyuKk0IMIHGBgNVHSMEgb4wgbuAFLCWii/TwrWYoCh4Apr/BTyuKk0IoYGSpIGPMIGMMSQwIgYDVQQDDBtNaW5kZmxhc2ggIEN1c3RvbWVyIEFjY291bnQxGDAWBgNVBAsMDzAwRGYwMDAwMDAySmhOUjEXMBUGA1UECgwOU2FsZXNmb3JjZS5jb20xFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xCzAJBgNVBAgMAkNBMQwwCgYDVQQGEwNVU0GCDgFAosTO2AAAAABsca6WMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBAFaM45WzAMULppAa0nBVNThZoYgNrzK47Ts4OTfXdcgAbrywsuMYf4W2on05T7fl5H193iX0QkCq91t79AsuDXEmq/0Iq512fbR8eNdWWFjMG8aOhuc8rJjvZTZEZEoERl9DdRS7Z+yapnrJoRCzExtdZxzAGgzJXYjv9+wn5Kingengq7F2PeV1+GeQtu3KRhRb7LUYYvXMJs7OF0Zu+ZfiLRPGKkEidopNj7N74JQmOAsnohcnUMlgSZV/BaVgqq8mx3ejaqiJdPr4QS2Ja7RrD3Qaolqz6Dq2xo7FK7xeYc8/auZukOoW0GEVXFws0Wcca7QWGcOk3tluHNhd/44=";
var publicCert = "MIIChTCCAe4CCQDmaVJdugc35DANBgkqhkiG9w0BAQUFADCBhjELMAkGA1UEBhMCTFYxDzANBgNVBAgMBkxBVFZJQTENMAsGA1UEBwwEUklHQTEPMA0GA1UECgwGRGlhdG9tMQswCQYDVQQLDAJJVDEZMBcGA1UEAwwQYWxleHAubWZ0ZGV2LmNvbTEeMBwGCSqGSIb3DQEJARYPYWxleHBAZGlhdG9tLmx2MB4XDTEzMDgyODEzMjI1OVoXDTE0MDgyODEzMjI1OVowgYYxCzAJBgNVBAYTAkxWMQ8wDQYDVQQIDAZMQVRWSUExDTALBgNVBAcMBFJJR0ExDzANBgNVBAoMBkRpYXRvbTELMAkGA1UECwwCSVQxGTAXBgNVBAMMEGFsZXhwLm1mdGRldi5jb20xHjAcBgkqhkiG9w0BCQEWD2FsZXhwQGRpYXRvbS5sdjCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEA6IFFhtZRLA8nmNgoeJbIOvmw3RZxh6djjOoIWeWx/cZ8HSwC4Aoja7FG/V53EGQglg2MNArqyHeaMopeycxzSsnzhO5RsWJbVeIFXrp8y8LPMFlLSZKKqTfSyQlcdbDPWXk8Vm8qW4fXR3hqDW87Sc387rynvONAQCJYW81sg7UCAwEAATANBgkqhkiG9w0BAQUFAAOBgQA0j/H3brqxdvTzpzgmSr2AAk4Ws/P9zeZwROJMLTx3MBOzuR1mnx4C5529ljFbmgcLMWUh1HXgFMWKe0N5+PSbLN79q/MlPbmbeS448QPVvcJMwQ0M7cBwdoti5oGeTXPiLUXNbhsFaZWojCGtlc3T0ogYjviKDwGOjrmtZGuHTw==";
var privateKey = "MIICXQIBAAKBgQDogUWG1lEsDyeY2Ch4lsg6+bDdFnGHp2OM6ghZ5bH9xnwdLALgCiNrsUb9XncQZCCWDYw0CurId5oyil7JzHNKyfOE7lGxYltV4gVeunzLws8wWUtJkoqpN9LJCVx1sM9ZeTxWbypbh9dHeGoNbztJzfzuvKe840BAIlhbzWyDtQIDAQABAoGAYYwbB39TfxC8pDvMfwuD5npr4dZQu4FXGv/1kQH1s2tbF0In0qduRPiTuCmx+oaHxWzZrdwGtSS45Qt4yWGl3KYqDE6EHgONVYA/VfxD10U7RfKblHf88RF44vMUPK1mYWLirlBTs50F5xR3KVNkt7C+GzFA7aoAUXKTzprDYeECQQD5U63RosAwle4eMsDWMabC6OH/dWiAkXkgHZ4RyPC7q5BD7gJ9s9udmBJvJ4pAX2Q6appAb70smJWBtdWLUIMPAkEA7rpVWz7gcE5e7IUrmbfundsHiWqOlWx6hDZH+pArfNIDqoFWhaqZ+j8rQbwXFWdgMzXb+g6+vI7U1SvccvO8+wJAfHTCzWRaX2ZYCIb5L3J1ddHeDjDDS3pSZi+imeoeEPAhAWeroqfHNrGUchvgrSVw2KAiA4xDeCFqb+ceg35bDQJBAOwvb9lpmNWjw+hPTLa1sh99HrTGtrCA9amupoHwdwX0JepgMgDmq5ZZPuu3MkNb1mJ0C+IXCoA0876/uUgFe1cCQQC4SXGxT5wVDARqm/V0NrAK1p9WBAEsIdr83BZ6hVLmtUiieLymWWCmxAJnbY0d/J6Y45+25b2ci/9ihVPE33tX";

var zlibMock = {
	deflateRaw: function (xml, cb) {
		deflateRawCalled = true;
		cb(null, xml);
	}
};

test('Suite setup', function (t) {
	t.test("Setup mocks", function (t) {
		mockery.enable();
		mockery.registerMock('zlib', zlibMock);
		mockery.warnOnUnregistered(false);
		t.end();
	});
	t.end();
});

test('Generate Unique Id tests', function (t) {
	var util = require("../lib/util.js");
	var ids = [];
	for (var i = 0; i < 10; i++) {
		var newId = util.generateUniqueId();
		t.notOk(_.contains(ids, newId), "Should not generate equal ids");
		ids.push(newId);
	}

	t.end();
});

test('Clean Xml removes spaces between tags', function (t) {
	var util = require("../lib/util.js");
	var testXml = "<root>   <tag1></tag1><tag2> </tag2></root>"
	var expectedXml = "<root><tag1></tag1><tag2></tag2></root>";

	t.equal(util.cleanXML(testXml), expectedXml, "Should remove spaced between tags");
	t.end();
});

test('Deflate and encode should call zlib and convert result to base64', function (t) {
	deflateRawCalled = false;

	var util = require("../lib/util.js");
	var xml = "<root><tag1>test</tag1><tag2>test value</tag2></root>";
	var expected = xml.toString('base64');

	util.deflateAndEncode(xml, function (err, res) {
		t.ok(deflateRawCalled, "Should call zlib.deflateRaw");
		t.equal(res, expected, "Xml should be converted to base64");
		t.end();
	});
});

test('Decode tests', function (t) {
	var testVal = "This is a test string";

	var util = require("../lib/util.js");

	var encodedVal = util.decode(testVal, 'utf-8', 'base64');

	var decodedVal = util.decode(encodedVal, 'base64', 'utf-8');

	t.equal(decodedVal, testVal, "Should correctly encode/decode");
	t.end();
});

test('certToPEM tests', function (t) {
	var util = require("../lib/util.js");
	var result = util.certToPEM(publicCert);
	var cert = fs.readFileSync(__dirname + '/public.cert');
	var certTxt = cert.toString('ascii').replace(new RegExp('\r\n', 'g'), '\n');

	t.equal(result, certTxt, "Should return correct certificate");
	t.end();
});

test('signRequest test', function (t) {
	var util = require("../lib/util.js");

	var pem = fs.readFileSync(__dirname + '/private.key');

	var key = pem.toString('ascii');

	var result = util.signRequest("Some_text", key);

	t.ok(result, "Should calculate hash without errors");

	t.end();
});

test('parseXml test', function (t) {
	var util = require("../lib/util.js");

	var response = fs.readFileSync(__dirname + '/saml2TestResponse.xml');

	util.parseXml(response, function (err, doc) {
		t.notOk(err, "Should read test response without errors: " + err);
		t.ok(doc, "Should return parsed xml doc");
		t.ok(util.getXmlElement(doc, 'Response'), "Should contain Response element");

		t.end();
	});
});

test('verifyResponse success test', function (t) {
	var util = require("../lib/util.js");

	var response = fs.readFileSync(__dirname + '/encodedSAMLResponse.txt');
	var responseText = response.toString('ascii');
	var xml = util.decode(responseText, 'base64', 'ascii');

	var result = util.verifyResponse(xml, realPublicCert);
	t.ok(result, 'Should validate response without errors with success');
	t.end();
});

test('verifyResponse error test', function (t) {
	var util = require("../lib/util.js");

	var response = fs.readFileSync(__dirname + '/encodedSAMLResponse.txt');
	var responseText = response.toString('ascii');
	var xml = util.decode(responseText, 'base64', 'ascii');

	var result = util.verifyResponse(xml, publicCert);
	t.notOk(result, 'Should validate response without errors with failure (wrong certificate)');
	t.end();
});

test('generateAuthRequestParams tests', function (t) {

	var util = require("../lib/util.js");

	var expected = '{"uniqueId":"_af17f10448a781cec884","issueInstant":"2013-08-28T15:33:59.359Z","version":"2.0","protocolBinding":"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST","assertionConsumerServiceUrl":"settings.sp.assertionConsumerServiceUrl","spInitiatedRedirectUrl":"settings.idp.spInitiatedRedirectUrl","issuer":"settings.sp.issuer","nameIdFormat":"urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified","nameIdAllowCreate":"true","relayState":null,"requestedAuthenticationContext":{"comparison":"exact","authenticationContextClassRef":"urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"}}';

	var params = util.generateAuthRequestParams({
		sp: {
			assertionConsumerServiceUrl: "settings.sp.assertionConsumerServiceUrl",
			issuer: "settings.sp.issuer"
		},
		idp: {
			spInitiatedRedirectUrl: "settings.idp.spInitiatedRedirectUrl"
		}
	});

	t.ok(params, "Should returns object with parameters");
	t.ok(params.uniqueId, "Should contain unique id");
	t.ok(params.issueInstant, "Should contain issueInstant");

	params.uniqueId = '_af17f10448a781cec884';
	params.issueInstant = '2013-08-28T15:33:59.359Z';

	var result = JSON.stringify(params);
	t.equal(result, expected, 'Should be equal with expected');

	t.end();

});


test('Suite tearDown', function (t) {

	t.test('Teardown mock', function (t) {
		mockery.disable();
		mockery.deregisterAll();
		t.end();
	});
	t.end();
});
