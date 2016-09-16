module.exports = function(callback) {
	var lc = localsCointoken.deployed();
	lc.addToWhitelist(localsStore.address).then(function(){
		console.log('whitelisted...');
	});
}
