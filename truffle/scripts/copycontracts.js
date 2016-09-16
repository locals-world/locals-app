var fs = require('fs');
var files = fs.readdirSync('./build/contracts');
for (var i in files) {
	//  var definition = require('../application/models/'+files[i]).Model;
	//console.log('Model Loaded: ' + files[i]);
	var f = require(__dirname + '/../build/contracts/' + files[i]);
	console.log(f.all_networks.default.abi);

	var data = {
		bytecode: f.all_networks.default.unlinked_binary,
		abi: f.all_networks.default.abi
	};

	console.log(data);

	var outputFileName = __dirname + '/../../app/contracts/' + f.contract_name + ".json";
	console.log('saving to', outputFileName);
	fs.writeFile(outputFileName, JSON.stringify(data), 'utf8');
}

