module.exports = function(callback) {
	var lc = localsCointoken.deployed();
	
	localsCointoken.at(localsCointoken.address).minEthbalance().then(function(a){
		console.log('minEthbalance=',a.toNumber());
	}).catch(function(e){
		console.log(e);
	});
	localsCointoken.at(localsCointoken.address).name().then(function(a){
		console.log('name=',a);
	}).catch(function(e){
		console.log(e);
	});

	if (!process.argv[4] || !process.argv[5]) {
		console.log('usage: ' + process.argv.reduce((pre, cur) => pre + ' ' + cur) + ' <account> <amount>');
		//process.exit();
	}
	var amount = parseInt(process.argv[5]);
	var target = process.argv[4];

	console.log('token contract is at', localsCointoken.address);
	console.log('minting ', amount, 'tokens to', target);
	console.log('current provider',localsCointoken.currentProvider);



	lc.mintToken(target, amount).then(function(a, b) {
		console.log('minting complete. TXhash=', a);
		callback();
	}).catch(function(e) {
		// There was an error! Handle it.
		console.log('error', e);
	});
};