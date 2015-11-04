var xml2js = require('xml2js');
var _ = require('lodash');
var ejs = require('ejs');
var fs = require('fs');

function Metadata() {
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
	if(!this.metadata) return {};
	var ed = this.metadata.entitydescriptor, settings = {};
	if(!ed) return settings;

	// idp entity id
	if(ed['$']) {
		settings.idp_issuer = ed['$'].entityid;
	}

	if(ed.idpssodescriptor && ed.idpssodescriptor.length) {
		var isd = ed.idpssodescriptor[0];

		// signing key certificate
		if(isd.keydescriptor) {
			for(var i = 0; i < isd.keydescriptor.length; i++) {
				var kd = isd.keydescriptor[i];
				if(!kd['$'] || kd['$'].use !== 'signing') continue;
				if( kd.keyinfo && kd.keyinfo[0].x509data && kd.keyinfo[0].x509data[0].x509certificate) {
					settings.idp_publicCert = kd.keyinfo[0].x509data[0].x509certificate[0];
					break;
				}
			}
		}

		// idp sp-initiated redirect url
		if(isd.singlesignonservice) {
			for(var i = 0; i < isd.singlesignonservice.length; i++) {
				var sss = isd.singlesignonservice[i];
				if(!sss['$'] || !_.contains(sss['$'].binding, 'HTTP-Redirect')) continue;
				settings.idp_spInitiatedRedirectUrl = sss['$'].location;
				break;
			}
		}
	}

	return settings;
};

Metadata.prototype.createSpMetadata = function(spSettings) {
	if(!spSettings || !spSettings.sp_issuer || !spSettings.sp_assertionConsumerServiceUrl)
		return null;

	return ejs.render(fs.readFileSync(__dirname + "/../xml-templates/spMetadata-default.ejs", 'utf8'), spSettings);
};

module.exports = Metadata;