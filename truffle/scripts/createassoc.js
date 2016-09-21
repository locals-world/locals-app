module.exports = function(callback) {
	var localstore = localsStore.deployed();

	console.log('LocalStore: ');

	var event = localsStore.deployed().allEvents().watch({}, '');
	//var event = localstore.Error();

	event.watch(function (error, result) {
      if (error) {
        console.log("Error: " + error);
      } else {
        console.log("Event: " + result.event);
    }
	});

	var coinevent = localsCointoken.deployed().allEvents().watch({}, '');
	//var coinevent = localstore.Error();

	coinevent.watch(function (error, result) {
      if (error) {
        console.log("Error: " + error);
      } else {
        console.log("Event: " + result.event);
    }
	});

	localstore.createAssociation(50, 10).then(function(test){
		console.log('association created...');
	});
}
