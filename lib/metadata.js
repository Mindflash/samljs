var xml2js = require('xml2js');

function Metadata(xml) {
	this.xml = null;
	this.metadata = {};
}

Metadata.prototype.loadXml = function(xml, cb) {
	var self = this;
	if(!xml) return setImmediate(cb);

	self.xml = xml;
	xml2js.parseString(xml, {
		tagNameProcessors: [removeNamespace],
		attrNameProcessors: [removeNamespace]
	}, function(err, data) {
		if(err) return cb(err);
		self.metadata = data;
		cb(null, data);
	});

	function removeNamespace(name) {
		var parts = name.split(':');
		return parts[parts.length-1].toLowerCase();
	}
};

Metadata.prototype.getCommonIdpSettings = function() {

};

Metadata.prototype.createSpMetadata = function(spSettings) {

};

module.exports = Metadata;