module.exports = function(callback) {
	var store = localsStore.deployed();
	store.createAssociation(50, 10).then(function(){
		console.log('association created?');
	});
}
