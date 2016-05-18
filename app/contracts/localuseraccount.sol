contract localsuser {

	struct User {
		string username;
		string ipfshash;
		mapping (address => mapping (address => string)) verifications;
	}

	mapping (address => User) public users;

	function localsuser(){

	}

	function addLocalsuser(string _username, string _ipfshash){
		// Save the user's ipfs hashed keystore
		users[msg.sender].username = _username;
		users[msg.sender].ipfshash = _ipfshash;
	}

	function verify(address _localsuser){		
		// Add a verfier to this user's hash
		users[_localsuser].verifications[msg.sender];
		// And transfer x localcoin from verifier to user.
	}

}