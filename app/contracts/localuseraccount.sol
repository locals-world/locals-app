contract localsuser {

	struct User {
		string username;
		string ipfshash;
		address[] verifications;
	}

	mapping (address => User) public users;

	function localsuser(){

	}

	function addLocalsuser(string _username, string _ipfshash){
		// Save the user's ipfs hashed keystore
		users[msg.sender].username = _username;
		users[msg.sender].ipfshash = _ipfshash;
		users[msg.sender].verifications.push(0x000);
	}

	function verify(address _localsuser){		
		// Add a verfier to this user's hash
		users[_localsuser].verifications.push(msg.sender);
		// And transfer x localcoin from verifier to user.
		// Transfer(msg.sender, _localuser, 1);
	}

    function checkverification(address _localsuser) returns (uint) {
        return users[_localsuser].verifications.length;
    }
}