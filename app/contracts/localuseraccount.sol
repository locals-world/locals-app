contract localsAvatar {

	struct User {
		string username;
		string ipfshash;
		address[] verifications;
	}

	mapping (address => User) public users;

	function localsAvatar(){

	}

	function addLocalsuser(string _username, string _ipfshash){
		// Save the user's ipfs hashed data
		users[msg.sender].username = _username;
		users[msg.sender].ipfshash = _ipfshash;
		users[msg.sender].verifications.push(0x000);
	}

	function addVerification(address _localsuser){		
		// Add a verfier to this user's hash
		users[_localsuser].verifications.push(msg.sender);
		// And transfer x localcoin from verifier to user.
		// Transfer(msg.sender, _localuser, 1);
	}

    function checkVerification(address _localsuser) returns (uint) {
        return users[_localsuser].verifications.length;
    }
}