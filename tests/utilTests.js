"use strict"
var _ = require('lodash');
var test = require('tap').test;
var mockery = require('mockery');

var deflateRawCalled = false;

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


test('Suite tearDown', function (t) {
	t.test('Teardown mock', function (t) {
		mockery.disable();
		mockery.deregisterAll();
		t.end();
	});
	t.end();
});
