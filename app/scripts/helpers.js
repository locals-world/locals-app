(function(document) {
	'use strict';

	var app = document.querySelector('#app');

	function Helpers() {
		this.filecache = {};

		// add prototype/polyfill for startsWith
		if (!String.prototype.startsWith) {
			String.prototype.startsWith = function(searchString, position) {
				position = position || 0;
				return this.substr(position, searchString.length) === searchString;
			};
		}

	}

	Helpers.prototype.fixaddress = function(address) {
		if (!address){
			return;
		}
		function strStartsWith(str, prefix) {
			return str.indexOf(prefix) === 0;
		}
		if (!strStartsWith(address, '0x')) {
			return ('0x' + address);
		}
		return address;
	};

	Helpers.prototype.getjson = function(contracturl, cb) {
		this.getfile.call(contracturl,true,cb);
	};

	Helpers.prototype.unixtime = function(){
		return Math.floor(Date.now() / 1000);
	};

	// loads and caches files loaded from URLS
	Helpers.prototype.getfile = function(contracturl, asJSON, cb) {
		// if asJSON is not given, asJSON is assumed to be true
		if (!cb){
			cb = asJSON;
			asJSON = true;
		}
		if (!contracturl){
			cb('no contracturl supplied');
		}
		var key = contracturl.split(/[\\/]/).pop();
		if (this.filecache[key]){
			return cb(null,this.filecache[key]);
		}
		var contracturl = app.resolveUrl(contracturl);
		var self=this;
		app.importHref(contracturl, function(e) {
			var result = e.target.import.body.innerText;
			if (asJSON){
				try{
					result = JSON.parse(result);
				}catch(e){
					return cb(e);
				}
			}
			self.filecache[key] = result;
			cb(null, result);
		});
	};

	app.helpers = new Helpers();

})(document);
