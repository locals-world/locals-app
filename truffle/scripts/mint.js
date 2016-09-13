module.exports = function(callback) {
	var lc = localsCointoken.deployed();
	if (!process.argv[4] || !process.argv[5]){
		console.log('usage: truffle mint.js <account> <amount>');
	}
	var amount = parseInt(process.argv[5]);
	var target = process.argv[4];
	console.log('token contract is at',localsCointoken.address);
	console.log('minting ',amount,'tokens to',target);
	lc.mintToken(target,amount).then(function(){
		console.log('minting complete.');
		callback();
	});
};