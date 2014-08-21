var samlidp = require('../lib/identityProvider.js');
var fs = require('fs');

var packed = fs.readFileSync(__dirname + '/encodedSAMLRequest.txt').toString('ascii');
packed = unescape(packed);
console.log(packed);

var saml = new samlidp();
saml.decodeAndParseAuthenticationRequest({SAMLRequest: packed, RelayState: "This is a relay"}, function(err, data) {
	console.log(data);
});
