"use strict"
var _ = require('lodash');
var test = require('tap').test;
var fs = require('fs');
var mockery = require('mockery');
var dom = require('xmldom').DOMParser;

var deflateRawCalled = false;

var realPublicCert = "MIIEnzCCA4egAwIBAgIOAUCixM7VAAAAAGxxrpYwDQYJKoZIhvcNAQEFBQAwgYwxJDAiBgNVBAMMG01pbmRmbGFzaCAgQ3VzdG9tZXIgQWNjb3VudDEYMBYGA1UECwwPMDBEZjAwMDAwMDJKaE5SMRcwFQYDVQQKDA5TYWxlc2ZvcmNlLmNvbTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzELMAkGA1UECAwCQ0ExDDAKBgNVBAYTA1VTQTAeFw0xMzA4MjEyMTI1NDFaFw0xNTA4MjEyMTI1NDFaMIGMMSQwIgYDVQQDDBtNaW5kZmxhc2ggIEN1c3RvbWVyIEFjY291bnQxGDAWBgNVBAsMDzAwRGYwMDAwMDAySmhOUjEXMBUGA1UECgwOU2FsZXNmb3JjZS5jb20xFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xCzAJBgNVBAgMAkNBMQwwCgYDVQQGEwNVU0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCSrzesj8CkyyNR9OhnsrUs1J72UUtutOaOAH4p8usGlZM0QSk2oMb8ytHV6xAS0sCOQeGpFBWUG5QTWhZ1qUGFu9uw36OcH2UC7uIC4y7CTGraEw5OGGi0QUIY9RJk8bnkVqSLWUJpKg+5Mi/2r9+rF/dXMoue5JadEQAsv5yBxRrkMStds2dkyuI2Zh7P0HP9Sgmbt4GFuEMtcQHUes8s09rvRiSa/gUPJG9Vq9XW9vID4l64cDYUOwmwZLmUBryifCCFGeGrWMkDi2ZkjRI2O1yMS0ZfF+wnalrOBM8hULkvjrrLXs4nuilrTFpgBv3OxeGG3Pp6zIirdP+OjSCVAgMBAAGjgfwwgfkwHQYDVR0OBBYEFLCWii/TwrWYoCh4Apr/BTyuKk0IMIHGBgNVHSMEgb4wgbuAFLCWii/TwrWYoCh4Apr/BTyuKk0IoYGSpIGPMIGMMSQwIgYDVQQDDBtNaW5kZmxhc2ggIEN1c3RvbWVyIEFjY291bnQxGDAWBgNVBAsMDzAwRGYwMDAwMDAySmhOUjEXMBUGA1UECgwOU2FsZXNmb3JjZS5jb20xFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xCzAJBgNVBAgMAkNBMQwwCgYDVQQGEwNVU0GCDgFAosTO2AAAAABsca6WMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBAFaM45WzAMULppAa0nBVNThZoYgNrzK47Ts4OTfXdcgAbrywsuMYf4W2on05T7fl5H193iX0QkCq91t79AsuDXEmq/0Iq512fbR8eNdWWFjMG8aOhuc8rJjvZTZEZEoERl9DdRS7Z+yapnrJoRCzExtdZxzAGgzJXYjv9+wn5Kingengq7F2PeV1+GeQtu3KRhRb7LUYYvXMJs7OF0Zu+ZfiLRPGKkEidopNj7N74JQmOAsnohcnUMlgSZV/BaVgqq8mx3ejaqiJdPr4QS2Ja7RrD3Qaolqz6Dq2xo7FK7xeYc8/auZukOoW0GEVXFws0Wcca7QWGcOk3tluHNhd/44=";
var publicCert = "MIIChTCCAe4CCQDmaVJdugc35DANBgkqhkiG9w0BAQUFADCBhjELMAkGA1UEBhMCTFYxDzANBgNVBAgMBkxBVFZJQTENMAsGA1UEBwwEUklHQTEPMA0GA1UECgwGRGlhdG9tMQswCQYDVQQLDAJJVDEZMBcGA1UEAwwQYWxleHAubWZ0ZGV2LmNvbTEeMBwGCSqGSIb3DQEJARYPYWxleHBAZGlhdG9tLmx2MB4XDTEzMDgyODEzMjI1OVoXDTE0MDgyODEzMjI1OVowgYYxCzAJBgNVBAYTAkxWMQ8wDQYDVQQIDAZMQVRWSUExDTALBgNVBAcMBFJJR0ExDzANBgNVBAoMBkRpYXRvbTELMAkGA1UECwwCSVQxGTAXBgNVBAMMEGFsZXhwLm1mdGRldi5jb20xHjAcBgkqhkiG9w0BCQEWD2FsZXhwQGRpYXRvbS5sdjCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEA6IFFhtZRLA8nmNgoeJbIOvmw3RZxh6djjOoIWeWx/cZ8HSwC4Aoja7FG/V53EGQglg2MNArqyHeaMopeycxzSsnzhO5RsWJbVeIFXrp8y8LPMFlLSZKKqTfSyQlcdbDPWXk8Vm8qW4fXR3hqDW87Sc387rynvONAQCJYW81sg7UCAwEAATANBgkqhkiG9w0BAQUFAAOBgQA0j/H3brqxdvTzpzgmSr2AAk4Ws/P9zeZwROJMLTx3MBOzuR1mnx4C5529ljFbmgcLMWUh1HXgFMWKe0N5+PSbLN79q/MlPbmbeS448QPVvcJMwQ0M7cBwdoti5oGeTXPiLUXNbhsFaZWojCGtlc3T0ogYjviKDwGOjrmtZGuHTw==";
var authPublicCert = "MIICyjCCAnSgAwIBAgIJAIwZ10O+nQxdMA0GCSqGSIb3DQEBBQUAMHkxCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJDQTESMBAGA1UEBxMJUGFsbyBBbHRvMRIwEAYDVQQKEwlNaW5kZmxhc2gxEjAQBgNVBAMTCU1pbmRmbGFzaDEhMB8GCSqGSIb3DQEJARYSaGVscEBtaW5kZmxhc2guY29tMB4XDTE0MDgyNjA4MjMxNVoXDTM0MDgyMTA4MjMxNVoweTELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRIwEAYDVQQHEwlQYWxvIEFsdG8xEjAQBgNVBAoTCU1pbmRmbGFzaDESMBAGA1UEAxMJTWluZGZsYXNoMSEwHwYJKoZIhvcNAQkBFhJoZWxwQG1pbmRmbGFzaC5jb20wXDANBgkqhkiG9w0BAQEFAANLADBIAkEAvGFS+SALp7rO4a+022+eIiQaiwl2nmfjtvrYclI5HF9V9FtCcRvVRTa7ZvZAEydreSpvt9bSZlLssxn1WFuRyQIDAQABo4HeMIHbMB0GA1UdDgQWBBQtYArsRG4Y4+TBd4Ju+ymf8ifCbTCBqwYDVR0jBIGjMIGggBQtYArsRG4Y4+TBd4Ju+ymf8ifCbaF9pHsweTELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRIwEAYDVQQHEwlQYWxvIEFsdG8xEjAQBgNVBAoTCU1pbmRmbGFzaDESMBAGA1UEAxMJTWluZGZsYXNoMSEwHwYJKoZIhvcNAQkBFhJoZWxwQG1pbmRmbGFzaC5jb22CCQCMGddDvp0MXTAMBgNVHRMEBTADAQH/MA0GCSqGSIb3DQEBBQUAA0EAVKbmOMrPXF6j7pb9jYZv8KceYLuTRSybRXcY7E9QMjKmqqwTksxQJ44iQVj+cc96OXWIvso+L2JDx29cJ4G10Q==";
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

test('verifyResponse success test', function (t) {
	var util = require("../lib/util.js");

	var response = fs.readFileSync(__dirname + '/encodedSAMLResponse.txt');
	var responseText = response.toString('ascii');
	var xml = util.decode(responseText, 'base64', 'ascii');
	var doc = new dom().parseFromString(xml);
	
	var result = util.verifyResponse(doc, xml, realPublicCert);
	t.ok(result, 'Should validate response without errors with success');
	t.end();
});

test('verifyResponse error test', function (t) {
	var util = require("../lib/util.js");

	var response = fs.readFileSync(__dirname + '/encodedSAMLResponse.txt');
	var responseText = response.toString('ascii');
	var xml = util.decode(responseText, 'base64', 'ascii');
	var doc = new dom().parseFromString(xml);

	var result = util.verifyResponse(doc, xml, publicCert);
	t.notOk(result, 'Should validate response without errors with failure (wrong certificate)');
	t.end();
});

test('verifyResponse with null xml', function (t) {
	var util = require("../lib/util.js");

	var result = util.verifyResponse(null, null, publicCert);
	t.notOk(result, 'Should return false with null xml');
	result = util.verifyResponse('', '', publicCert);
	t.notOk(result, 'Should return false with empty string xml');
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

test('generateAuthRequestParams tests with no auth context', function (t) {

	var util = require("../lib/util.js");

	var expected = '{"uniqueId":"_af17f10448a781cec884","issueInstant":"2013-08-28T15:33:59.359Z","version":"2.0","protocolBinding":"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST","assertionConsumerServiceUrl":"settings.sp.assertionConsumerServiceUrl","spInitiatedRedirectUrl":"settings.idp.spInitiatedRedirectUrl","issuer":"settings.sp.issuer","nameIdFormat":"urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified","nameIdAllowCreate":"true","relayState":null,"requestedAuthenticationContext":null}';

	var params = util.generateAuthRequestParams({
		sp: {
			assertionConsumerServiceUrl: "settings.sp.assertionConsumerServiceUrl",
			issuer: "settings.sp.issuer"
		},
		idp: {
			spInitiatedRedirectUrl: "settings.idp.spInitiatedRedirectUrl",
			noAuthContext: "1"
		}
	});

	t.ok(params, "Should returns object with parameters");
	t.ok(params.uniqueId, "Should contain unique id");
	t.ok(params.issueInstant, "Should contain issueInstant");
	t.notOk(params.requestedAuthenticationContext, "no auth context");

	params.uniqueId = '_af17f10448a781cec884';
	params.issueInstant = '2013-08-28T15:33:59.359Z';

	var result = JSON.stringify(params);
	t.equal(result, expected, 'Should be equal with expected');

	t.end();

});

test('test response with varied namespacing and no attribute statement', function(t) {
	var response = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c2FtbDJwOlJlc3BvbnNlIHhtbG5zOnNhbWwycD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sIiBEZXN0aW5hdGlvbj0iaHR0cDovL3Nzby5taW5kZmxhc2guY29tL3NhbWwvYWNzIiBJRD0iaWQxMjE3Njc4MzQyMjExNzU2MDExMTA0NjA1MDkiIEluUmVzcG9uc2VUbz0iX2NhZmY0ZjBhODMyZWY0YWE0ZWY4IiBJc3N1ZUluc3RhbnQ9IjIwMTMtMDktMThUMTc6Mzk6NDIuNTU0WiIgVmVyc2lvbj0iMi4wIj48c2FtbDI6SXNzdWVyIHhtbG5zOnNhbWwyPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uIiBGb3JtYXQ9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpuYW1laWQtZm9ybWF0OmVudGl0eSI+aHR0cDovL3d3dy5va3RhLmNvbS9rYWJ3ZjF1NUVCU0RHTVdPU0dQVjwvc2FtbDI6SXNzdWVyPjxzYW1sMnA6U3RhdHVzIHhtbG5zOnNhbWwycD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sIj48c2FtbDJwOlN0YXR1c0NvZGUgVmFsdWU9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpzdGF0dXM6U3VjY2VzcyIvPjwvc2FtbDJwOlN0YXR1cz48c2FtbDI6QXNzZXJ0aW9uIHhtbG5zOnNhbWwyPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uIiBJRD0iaWQxMjE3Njc4MzQyMjIwMzczMzE0OTYwOTkxODIiIElzc3VlSW5zdGFudD0iMjAxMy0wOS0xOFQxNzozOTo0Mi41NTRaIiBWZXJzaW9uPSIyLjAiPjxzYW1sMjpJc3N1ZXIgRm9ybWF0PSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6bmFtZWlkLWZvcm1hdDplbnRpdHkiIHhtbG5zOnNhbWwyPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uIj5odHRwOi8vd3d3Lm9rdGEuY29tL2thYndmMXU1RUJTREdNV09TR1BWPC9zYW1sMjpJc3N1ZXI+PGRzOlNpZ25hdHVyZSB4bWxuczpkcz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnIyI+PGRzOlNpZ25lZEluZm8+PGRzOkNhbm9uaWNhbGl6YXRpb25NZXRob2QgQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzEwL3htbC1leGMtYzE0biMiLz48ZHM6U2lnbmF0dXJlTWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnI3JzYS1zaGExIi8+PGRzOlJlZmVyZW5jZSBVUkk9IiNpZDEyMTc2NzgzNDIyMjAzNzMzMTQ5NjA5OTE4MiI+PGRzOlRyYW5zZm9ybXM+PGRzOlRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+PGRzOlRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPjwvZHM6VHJhbnNmb3Jtcz48ZHM6RGlnZXN0TWV0aG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnI3NoYTEiLz48ZHM6RGlnZXN0VmFsdWU+dkdza0xFMmpjYnRvazBmb1h2MFBsd0NQRUljPTwvZHM6RGlnZXN0VmFsdWU+PC9kczpSZWZlcmVuY2U+PC9kczpTaWduZWRJbmZvPjxkczpTaWduYXR1cmVWYWx1ZT5ZdjBITWZUUkxxK1phY2RCOWVqbzNzSFJmUkNNUEZnYmZ0cTBDd1FPdzh5Wkl2QzJKd3RDeGV1UE1qN25ZS0N2emlEOWtZNUdTUFArTXFsbFc4b21Ud1ZSbFlqd0V1NWFBMFFOdkZ2OGRJbngyYWJBdkFKd1FXN3czdWZxZWMxQXM0UDBkZEdVdmUva2Mzb3BsV05xbmo2Tzg5UlJKbHJkd0h1YTM2ZDNVSTQ9PC9kczpTaWduYXR1cmVWYWx1ZT48ZHM6S2V5SW5mbz48ZHM6WDUwOURhdGE+PGRzOlg1MDlDZXJ0aWZpY2F0ZT5NSUlDbnpDQ0FnaWdBd0lCQWdJR0FVRXVCN3JSTUEwR0NTcUdTSWIzRFFFQkJRVUFNSUdTTVFzd0NRWURWUVFHRXdKVlV6RVRNQkVHCkExVUVDQXdLUTJGc2FXWnZjbTVwWVRFV01CUUdBMVVFQnd3TlUyRnVJRVp5WVc1amFYTmpiekVOTUFzR0ExVUVDZ3dFVDJ0MFlURVUKTUJJR0ExVUVDd3dMVTFOUFVISnZkbWxrWlhJeEV6QVJCZ05WQkFNTUNtMXBibVJtYkdGemFESXhIREFhQmdrcWhraUc5dzBCQ1FFVwpEV2x1Wm05QWIydDBZUzVqYjIwd0hoY05NVE13T1RFM01qSXlOVEF3V2hjTk5ETXdPVEUzTWpJeU5qQXdXakNCa2pFTE1Ba0dBMVVFCkJoTUNWVk14RXpBUkJnTlZCQWdNQ2tOaGJHbG1iM0p1YVdFeEZqQVVCZ05WQkFjTURWTmhiaUJHY21GdVkybHpZMjh4RFRBTEJnTlYKQkFvTUJFOXJkR0V4RkRBU0JnTlZCQXNNQzFOVFQxQnliM1pwWkdWeU1STXdFUVlEVlFRRERBcHRhVzVrWm14aGMyZ3lNUnd3R2dZSgpLb1pJaHZjTkFRa0JGZzFwYm1adlFHOXJkR0V1WTI5dE1JR2ZNQTBHQ1NxR1NJYjNEUUVCQVFVQUE0R05BRENCaVFLQmdRQ2l5T1VuCitRSjlXZHp5U3UwNUJ4cVpMR3d1Njl0NGlhTloxd29ES0ZobmxUdzhGdUl3QU5yaDhMMUxRWUVLZ0RleFh0dGc3TGp5d3dzNXpTSXEKUDQ3UldTYkpZd3gyV1JITzNKeU5kTEdUeUpYL214S0F4Mk04Z1E1RkEvRWd4ckpJVmVQTnh5bFYySGZBMU1Ia0gzdFFOU0p2VWRJdwpOV2RiU1kwcTd0QkhsUUlEQVFBQk1BMEdDU3FHU0liM0RRRUJCUVVBQTRHQkFBQ1N3b0Z6THhtYWgvaGp2cGJ4M3oyK2NSa1Nta0ZrCjE4MGh3WDc4R1VZbWxaR21RNTJsUlIxK25NOXB2YmFZY1RldEpjODRBUVN6WTZIWE5WanNIT29NNUFXZklTZlMwek5rWkszRHBPdlMKWk9BeEM0WGgxdlhiYkxzOVg2aVdtLzkvV3FmMUFLUkhMQzRkT3MvTTMzZmhiU2dtY05BWW1FZjZZeXYwYVRBZzwvZHM6WDUwOUNlcnRpZmljYXRlPjwvZHM6WDUwOURhdGE+PC9kczpLZXlJbmZvPjwvZHM6U2lnbmF0dXJlPjxzYW1sMjpTdWJqZWN0IHhtbG5zOnNhbWwyPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uIj48c2FtbDI6TmFtZUlEIEZvcm1hdD0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6MS4xOm5hbWVpZC1mb3JtYXQ6ZW1haWxBZGRyZXNzIj5qb3NoLmxhcnNlbkBtaW5kZmxhc2guY29tPC9zYW1sMjpOYW1lSUQ+PHNhbWwyOlN1YmplY3RDb25maXJtYXRpb24gTWV0aG9kPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6Y206YmVhcmVyIj48c2FtbDI6U3ViamVjdENvbmZpcm1hdGlvbkRhdGEgSW5SZXNwb25zZVRvPSJfY2FmZjRmMGE4MzJlZjRhYTRlZjgiIE5vdE9uT3JBZnRlcj0iMjAxMy0wOS0xOFQxNzo0NDo0Mi41NTRaIiBSZWNpcGllbnQ9Ik1pbmRmbGFzaCIvPjwvc2FtbDI6U3ViamVjdENvbmZpcm1hdGlvbj48L3NhbWwyOlN1YmplY3Q+PHNhbWwyOkNvbmRpdGlvbnMgTm90QmVmb3JlPSIyMDEzLTA5LTE4VDE3OjM0OjQyLjU1NFoiIE5vdE9uT3JBZnRlcj0iMjAxMy0wOS0xOFQxNzo0NDo0Mi41NTRaIiB4bWxuczpzYW1sMj0idXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFzc2VydGlvbiI+PHNhbWwyOkF1ZGllbmNlUmVzdHJpY3Rpb24+PHNhbWwyOkF1ZGllbmNlPm1pbmRmbGFzaC5jb208L3NhbWwyOkF1ZGllbmNlPjwvc2FtbDI6QXVkaWVuY2VSZXN0cmljdGlvbj48L3NhbWwyOkNvbmRpdGlvbnM+PHNhbWwyOkF1dGhuU3RhdGVtZW50IEF1dGhuSW5zdGFudD0iMjAxMy0wOS0xOFQxNzozOTo0Mi41NTRaIiBTZXNzaW9uSW5kZXg9Il9jYWZmNGYwYTgzMmVmNGFhNGVmOCIgeG1sbnM6c2FtbDI9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iPjxzYW1sMjpBdXRobkNvbnRleHQ+PHNhbWwyOkF1dGhuQ29udGV4dENsYXNzUmVmPnVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphYzpjbGFzc2VzOlBhc3N3b3JkUHJvdGVjdGVkVHJhbnNwb3J0PC9zYW1sMjpBdXRobkNvbnRleHRDbGFzc1JlZj48L3NhbWwyOkF1dGhuQ29udGV4dD48L3NhbWwyOkF1dGhuU3RhdGVtZW50Pjwvc2FtbDI6QXNzZXJ0aW9uPjwvc2FtbDJwOlJlc3BvbnNlPg==";
	var cert = "MIICnzCCAgigAwIBAgIGAUEuB7rRMA0GCSqGSIb3DQEBBQUAMIGSMQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzENMAsGA1UECgwET2t0YTEUMBIGA1UECwwLU1NPUHJvdmlkZXIxEzARBgNVBAMMCm1pbmRmbGFzaDIxHDAaBgkqhkiG9w0BCQEWDWluZm9Ab2t0YS5jb20wHhcNMTMwOTE3MjIyNTAwWhcNNDMwOTE3MjIyNjAwWjCBkjELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWExFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xDTALBgNVBAoMBE9rdGExFDASBgNVBAsMC1NTT1Byb3ZpZGVyMRMwEQYDVQQDDAptaW5kZmxhc2gyMRwwGgYJKoZIhvcNAQkBFg1pbmZvQG9rdGEuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCiyOUn+QJ9WdzySu05BxqZLGwu69t4iaNZ1woDKFhnlTw8FuIwANrh8L1LQYEKgDexXttg7Ljywws5zSIqP47RWSbJYwx2WRHO3JyNdLGTyJX/mxKAx2M8gQ5FA/EgxrJIVePNxylV2HfA1MHkH3tQNSJvUdIwNWdbSY0q7tBHlQIDAQABMA0GCSqGSIb3DQEBBQUAA4GBAACSwoFzLxmah/hjvpbx3z2+cRkSmkFk180hwX78GUYmlZGmQ52lRR1+nM9pvbaYcTetJc84AQSzY6HXNVjsHOoM5AWfISfS0zNkZK3DpOvSZOAxC4Xh1vXbbLs9X6iWm/9/Wqf1AKRHLC4dOs/M33fhbSgmcNAYmEf6Yyv0aTAg";

	var util = require("../lib/util.js");
	var serv = require("../lib/serviceProvider.js")();

	var xml = util.decode(response, "base64", "ascii");
	var doc = new dom().parseFromString(xml);
	
	var verified = util.verifyResponse(doc, xml, cert);
	t.ok(verified, "verified response");

	serv.generateProfileFromResponse({SAMLResponse: response}, doc, function (err, profile) {
		t.notOk(err, "no errors");
		t.ok(profile.subject, "subject exists");
		t.end();
	});
});

test('verifyResponse success test for SAMLResponse', function (t) {
	var util = require("../lib/util.js");

	var response = fs.readFileSync(__dirname + '/encodedSAMLAuthResponse.txt');
	var responseText = response.toString('ascii');
	var xml = util.decode(responseText, 'base64', 'ascii');
	var doc = new dom().parseFromString(xml);

	var result = util.verifyResponse(doc, xml, authPublicCert);
	t.ok(result, 'Should validate response without errors with success');
	t.end();
});

test('ensure signed xml can be verified', function (t) {
	var util = require("../lib/util.js");

	var response = fs.readFileSync(__dirname + '/saml2TestResponseNoSign.xml').toString();
	var privateKey = fs.readFileSync(__dirname + '/private.key').toString();
	var cert = fs.readFileSync(__dirname + '/public.cert').toString();
	
	var signedXml = util.signAuthenticationResponse(response, privateKey, cert);
	
	t.ok(signedXml, "xml should be signed");
	
	var doc = new dom().parseFromString(signedXml);
	var result = util.verifyResponse(doc, signedXml, util.PEMToCert(cert));
	t.ok(result, 'Signed xml should be verified');
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
