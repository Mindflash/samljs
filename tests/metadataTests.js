"use strict";
var _ = require('lodash');
var test = require('tap').test;
var fs = require('fs');
var metadata = require('../lib/metadata.js');
var xml2js = require('xml2js');

test("parses xml and gives correct metadata info", function(t) {
	var md = new metadata();
	md.loadXml(fs.readFileSync('FederatedMetadata.xml', 'utf8'), function(err, xmlData) {
		t.notOk(err, "no error");
		t.ok(xmlData, "good xml data");
		t.ok(xmlData.entitydescriptor, "good entity descriptor");

		var settings = md.getCommonIdpSettings();
		t.ok(settings, "good common settings");
		t.equal(settings.idp_issuer, "TEST ENTITY ID", "valid entity id");
		t.equal(settings.idp_spInitiatedRedirectUrl, "REDIRECT URL", "valid redirect url");
		t.equal(settings.idp_publicCert, "TEST SIGNING CERT", "valid signing cert");
		t.end();
	});
});

test("generates correct sp metadata", function(t) {
	var md = new metadata();
	var output = md.createSpMetadata({
		sp_issuer: "test issuer",
		sp_assertionConsumerServiceUrl: "redirect url"
	});

	t.ok(output, "generated output");
	xml2js.parseString(output, {
		tagNameProcessors: [removeNamespace],
		attrNameProcessors: [removeNamespace]
	}, function(err, data) {
		t.notOk(err, "no error parsing");
		t.ok(data, "good data returned");
		t.equal(data.entitydescriptor['$'].entityid, "test issuer", "correct entity id");
		t.equal(data.entitydescriptor.spssodescriptor[0].assertionconsumerservice[0]['$'].location, "redirect url", "correct redirect url");
		t.end();
	});

	function removeNamespace(name) {
		var parts = name.split(':');
		return parts[parts.length-1].toLowerCase();
	}
});