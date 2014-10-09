"use strict"
var test = require('tap').test;
var mockery = require('mockery');
var querystring = require('querystring');
var urlUtil = require("url");
var _ = require('lodash');
var fs = require('fs');
var util = require('../lib/util.js');
var identityProvider = require('../lib/identityProvider.js');
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');

test('SAMLRequest is parsed correctly', function (t) {
	var request = fs.readFileSync(__dirname + "/saml2TestRequest.xml");
	
	util.deflateAndEncode(request, function(err, deflated) {
		t.notOk(err, "deflating should not error");
		var idp = new identityProvider();
		
		idp.decodeAndParseAuthenticationRequest({
			SAMLRequest: deflated,
			binding: "redirect",
			RelayState: "This is a relay"
		}, function (err, req) {
			t.notOk(err, "parsing request should not generate error");

			t.deepEqual(req, { 
				authRequestId: 'samlr-5148a926-28b5-11e4-b44e-782bcb6cf71e',
				issueInstant: '2014-08-20T21:59:54Z',
				acsUrl: 'https://help.mindflash.com/access/saml',
				issuer: 'mindflash.zendesk.com',
				nameIDPolicies: [
				{ allowCreate: 'true',
					format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' } ],
				relayState: "This is a relay",
				requestPostBinding: request.toString("base64")
			}, "Issuer should match");
			t.end();
		});
	});
});

test('SAMLRequest with multiple name id policies is parsed correctly', function(t) {
	var request = fs.readFileSync(__dirname + "/saml2TestRequestTwoNames.xml");
	
	util.deflateAndEncode(request, function(err, deflated) {
		t.notOk(err, "deflating should not error");
		var idp = new identityProvider();

		idp.decodeAndParseAuthenticationRequest({
			SAMLRequest: deflated,
			binding: "redirect",
			RelayState: "This is a relay"
		}, function (err, req) {
			t.notOk(err, "parsing request should not generate error");

			t.deepEqual(req, {
				authRequestId: 'samlr-5148a926-28b5-11e4-b44e-782bcb6cf71e',
				issueInstant: '2014-08-20T21:59:54Z',
				acsUrl: 'https://help.mindflash.com/access/saml',
				issuer: 'mindflash.zendesk.com',
				nameIDPolicies: [
				{ allowCreate: 'true',
					format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress' },
				{ allowCreate: 'false',
						format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:transient' }],
				relayState: "This is a relay",
				requestPostBinding: request.toString("base64")
			}, "Issuer should match");
			t.end();
		});
	});	
});

test('generates valid authentication response', function(t) {
	var settings = {
		sp: {
			authRequestId: "testRequestId",
			acsUrl: "testAcsUrl"
		},
		idp: {
			issuer: "testIssuer",
			nameQualifier: "testNameQualifier",
			privateKey: fs.readFileSync(__dirname + "/private.key").toString(),
			cert: fs.readFileSync(__dirname + "/public.cert").toString()
		},
		conditions: {
			notOnOrAfter: new Date().toISOString(),
			notBefore: new Date().toISOString(),
			audience: "testAudience"
		},
		subject: {
			email: "testEmail",
			sessIdEncrypted: "testSess",
			attributes: [
				{name: "testAttrib1", value: "testValue1"},
				{name: "testAttrib2", value: "testValue2"}
			]
		}
	};
	
	var idp = new identityProvider();
	idp.generateAuthenticationResponse(settings, function (err, resp) {
		t.notOk(err, "should not receive error");
		t.ok(resp, "should get non null response");
		
		var xml = new Buffer(resp, "base64").toString();
		var doc = new dom().parseFromString(xml);
		t.ok(util.verifyResponse(doc, xml, util.PEMToCert(settings.idp.cert)), "xml should be signed correctly");

		// verify some of the xml elements are set correctly
		var request = xpath.select1("*[local-name(.)='Response']", doc);
		t.equal(request.getAttribute("InResponseTo"), settings.sp.authRequestId, "InResponseTo field should match test data");
		t.equal(request.getAttribute("Destination"), settings.sp.acsUrl, "Destination field should match test data");

		var issuer = xpath.select1("*[local-name(.)='Issuer']", request);
		t.equal(issuer.firstChild.data, settings.idp.issuer, "Issuer(request) field should match test data");
		
		var assertion = xpath.select1("*[local-name(.)='Assertion']", request);
		issuer = xpath.select1("*[local-name(.)='Issuer']", assertion);
		t.equal(issuer.firstChild.data, settings.idp.issuer, "Issuer(assertion) field should match test data");

		var subject = xpath.select1("*[local-name(.)='Subject']", assertion);
		var nameId = xpath.select1("*[local-name(.)='NameID']", subject);
		t.equal(nameId.getAttribute("NameQualifier"), settings.idp.nameQualifier, "NameQualifier field should match test data");
		t.equal(nameId.firstChild.data, settings.subject.email, "NameID email field should match test data");
		
		var subjConf = xpath.select1("*[local-name(.)='SubjectConfirmation']", subject);
		var subjConfData = xpath.select1("*[local-name(.)='SubjectConfirmationData']", subjConf);
		t.equal(subjConfData.getAttribute("InResponseTo"), settings.sp.authRequestId, "InResponseTo(subject confirmation) field should match test data");
		t.equal(subjConfData.getAttribute("Recipient"), settings.sp.acsUrl, "Recipient field should match test data");
		
		var attribStatement = xpath.select1("*[local-name(.)='AttributeStatement']", assertion);
		var attribs = xpath.select("*[local-name(.)='Attribute']", attribStatement);
		t.equal(attribs.length, 2, "should be 2 attributes in response");
		
		var attribVal1 = xpath.select1("*[local-name(.)='AttributeValue']", attribs[0]);
		var attribVal2 = xpath.select1("*[local-name(.)='AttributeValue']", attribs[1]);
		
		t.equal(attribs[0].getAttribute("Name"), settings.subject.attributes[0].name, "attribute 1 name should match test data");
		t.equal(attribVal1.firstChild.data, settings.subject.attributes[0].value, "attribute 1 value should match test data");

		t.equal(attribs[1].getAttribute("Name"), settings.subject.attributes[1].name, "attribute 2 name should match test data");
		t.equal(attribVal2.firstChild.data, settings.subject.attributes[1].value, "attribute 2 value should match test data");

		var authStatement = xpath.select1("*[local-name(.)='AuthnStatement']", assertion);
		t.equal(authStatement.getAttribute("SessionIndex"), settings.subject.sessIdEncrypted, "sess index should match test data");
		
		t.end();
	});

});

test('generates valid authentication response without inresponseto field', function(t) {
	var settings = {
		sp: {
			authRequestId: "testRequestId",
			acsUrl: "testAcsUrl"
		},
		idp: {
			issuer: "testIssuer",
			nameQualifier: "testNameQualifier",
			privateKey: fs.readFileSync(__dirname + "/private.key").toString(),
			cert: fs.readFileSync(__dirname + "/public.cert").toString(),
			excludeInResponseTo: "1"
		},
		conditions: {
			notOnOrAfter: new Date().toISOString(),
			notBefore: new Date().toISOString(),
			audience: "testAudience"
		},
		subject: {
			email: "testEmail",
			sessIdEncrypted: "testSess",
			attributes: [
				{name: "testAttrib1", value: "testValue1"},
				{name: "testAttrib2", value: "testValue2"}
			]
		}
	};

	var idp = new identityProvider();
	idp.generateAuthenticationResponse(settings, function (err, resp) {
		t.notOk(err, "should not receive error");
		t.ok(resp, "should get non null response");

		var xml = new Buffer(resp, "base64").toString();
		var doc = new dom().parseFromString(xml);
		t.ok(util.verifyResponse(doc, xml, util.PEMToCert(settings.idp.cert)), "xml should be signed correctly");

		// verify some of the xml elements are set correctly
		var request = xpath.select1("*[local-name(.)='Response']", doc);
		t.notOk(request.getAttribute("InResponseTo"), "InResponseTo field should be missed");
		t.equal(request.getAttribute("Destination"), settings.sp.acsUrl, "Destination field should match test data");

		var issuer = xpath.select1("*[local-name(.)='Issuer']", request);
		t.equal(issuer.firstChild.data, settings.idp.issuer, "Issuer(request) field should match test data");

		var assertion = xpath.select1("*[local-name(.)='Assertion']", request);
		issuer = xpath.select1("*[local-name(.)='Issuer']", assertion);
		t.equal(issuer.firstChild.data, settings.idp.issuer, "Issuer(assertion) field should match test data");

		var subject = xpath.select1("*[local-name(.)='Subject']", assertion);
		var nameId = xpath.select1("*[local-name(.)='NameID']", subject);
		t.equal(nameId.getAttribute("NameQualifier"), settings.idp.nameQualifier, "NameQualifier field should match test data");
		t.equal(nameId.firstChild.data, settings.subject.email, "NameID email field should match test data");

		var subjConf = xpath.select1("*[local-name(.)='SubjectConfirmation']", subject);
		var subjConfData = xpath.select1("*[local-name(.)='SubjectConfirmationData']", subjConf);
		t.notOk(subjConfData.getAttribute("InResponseTo"), "InResponseTo(subject confirmation) field should be missed");
		t.equal(subjConfData.getAttribute("Recipient"), settings.sp.acsUrl, "Recipient field should match test data");

		var conditions = xpath.select1("*[local-name(.)='Conditions']", assertion);
		t.ok(conditions, "should be conditions field");

		var attribStatement = xpath.select1("*[local-name(.)='AttributeStatement']", assertion);
		var attribs = xpath.select("*[local-name(.)='Attribute']", attribStatement);
		t.equal(attribs.length, 2, "should be 2 attributes in response");

		var attribVal1 = xpath.select1("*[local-name(.)='AttributeValue']", attribs[0]);
		var attribVal2 = xpath.select1("*[local-name(.)='AttributeValue']", attribs[1]);

		t.equal(attribs[0].getAttribute("Name"), settings.subject.attributes[0].name, "attribute 1 name should match test data");
		t.equal(attribVal1.firstChild.data, settings.subject.attributes[0].value, "attribute 1 value should match test data");

		t.equal(attribs[1].getAttribute("Name"), settings.subject.attributes[1].name, "attribute 2 name should match test data");
		t.equal(attribVal2.firstChild.data, settings.subject.attributes[1].value, "attribute 2 value should match test data");

		var authStatement = xpath.select1("*[local-name(.)='AuthnStatement']", assertion);
		t.equal(authStatement.getAttribute("SessionIndex"), settings.subject.sessIdEncrypted, "sess index should match test data");

		t.end();
	});
});

test('generates valid authentication response without Conditions field', function(t) {
	var settings = {
		sp: {
			authRequestId: "testRequestId",
			acsUrl: "testAcsUrl"
		},
		idp: {
			issuer: "testIssuer",
			nameQualifier: "testNameQualifier",
			privateKey: fs.readFileSync(__dirname + "/private.key").toString(),
			cert: fs.readFileSync(__dirname + "/public.cert").toString(),
			excludeInResponseTo: "1",
			excludeConditions: "1"
		},
		conditions: {
			notOnOrAfter: new Date().toISOString(),
			notBefore: new Date().toISOString(),
			audience: "testAudience"
		},
		subject: {
			email: "testEmail",
			sessIdEncrypted: "testSess",
			attributes: [
				{name: "testAttrib1", value: "testValue1"},
				{name: "testAttrib2", value: "testValue2"}
			]
		}
	};

	var idp = new identityProvider();
	idp.generateAuthenticationResponse(settings, function (err, resp) {
		t.notOk(err, "should not receive error");
		t.ok(resp, "should get non null response");

		var xml = new Buffer(resp, "base64").toString();
		var doc = new dom().parseFromString(xml);
		t.ok(util.verifyResponse(doc, xml, util.PEMToCert(settings.idp.cert)), "xml should be signed correctly");

		// verify some of the xml elements are set correctly
		var request = xpath.select1("*[local-name(.)='Response']", doc);
		t.notOk(request.getAttribute("InResponseTo"), "InResponseTo field should be missed");
		t.equal(request.getAttribute("Destination"), settings.sp.acsUrl, "Destination field should match test data");

		var issuer = xpath.select1("*[local-name(.)='Issuer']", request);
		t.equal(issuer.firstChild.data, settings.idp.issuer, "Issuer(request) field should match test data");

		var assertion = xpath.select1("*[local-name(.)='Assertion']", request);
		issuer = xpath.select1("*[local-name(.)='Issuer']", assertion);
		t.equal(issuer.firstChild.data, settings.idp.issuer, "Issuer(assertion) field should match test data");

		var subject = xpath.select1("*[local-name(.)='Subject']", assertion);
		var nameId = xpath.select1("*[local-name(.)='NameID']", subject);
		t.equal(nameId.getAttribute("NameQualifier"), settings.idp.nameQualifier, "NameQualifier field should match test data");
		t.equal(nameId.firstChild.data, settings.subject.email, "NameID email field should match test data");

		var conditions = xpath.select1("*[local-name(.)='Conditions']", assertion);
		t.notOk(conditions, "should be no conditions field");

		var subjConf = xpath.select1("*[local-name(.)='SubjectConfirmation']", subject);
		var subjConfData = xpath.select1("*[local-name(.)='SubjectConfirmationData']", subjConf);
		t.notOk(subjConfData.getAttribute("InResponseTo"), "InResponseTo(subject confirmation) field should be missed");
		t.equal(subjConfData.getAttribute("Recipient"), settings.sp.acsUrl, "Recipient field should match test data");

		var attribStatement = xpath.select1("*[local-name(.)='AttributeStatement']", assertion);
		var attribs = xpath.select("*[local-name(.)='Attribute']", attribStatement);
		t.equal(attribs.length, 2, "should be 2 attributes in response");

		var attribVal1 = xpath.select1("*[local-name(.)='AttributeValue']", attribs[0]);
		var attribVal2 = xpath.select1("*[local-name(.)='AttributeValue']", attribs[1]);

		t.equal(attribs[0].getAttribute("Name"), settings.subject.attributes[0].name, "attribute 1 name should match test data");
		t.equal(attribVal1.firstChild.data, settings.subject.attributes[0].value, "attribute 1 value should match test data");

		t.equal(attribs[1].getAttribute("Name"), settings.subject.attributes[1].name, "attribute 2 name should match test data");
		t.equal(attribVal2.firstChild.data, settings.subject.attributes[1].value, "attribute 2 value should match test data");

		var authStatement = xpath.select1("*[local-name(.)='AuthnStatement']", assertion);
		t.equal(authStatement.getAttribute("SessionIndex"), settings.subject.sessIdEncrypted, "sess index should match test data");

		t.end();
	});
});