contract localsAvatar {

	address public owner;

	// How many verifications should a user have before he can verify someone else?
	uint public verificationthresh;

	struct User {
		string username;
		string ipfshash;
		address[] verifications;
		uint numVerifications;
	}

	mapping (address => User) public users;

	event ValidationAdded(address _from, address _to, uint _numverifications);
	event UserAdded(address _from, string _username, string _ipfshash, uint _numverifications);

	function localsAvatar(uint _verificationthresh){
		owner = msg.sender;
		verificationthresh = _verificationthresh;
	}

	function addLocalsuser(string _username, string _ipfshash){
		// Save the user's ipfs hashed data
		users[msg.sender].username = _username;
		users[msg.sender].ipfshash = _ipfshash;
		users[msg.sender].verifications.push(0x000);
		users[msg.sender].numVerifications = 0;
		UserAdded(msg.sender, _username, _ipfshash, users[msg.sender].numVerifications);
	}

	function addVerification(address _localsuser){		
		// Add a verfier to this user's hash

		// If the verifier isnt verified himself, throw.
		// if(users[msg.sender].numVerifications < verificationthresh){
		// 	throw ;
		// }
		uint numval = users[_localsuser].numVerifications;
		users[_localsuser].verifications.push(msg.sender);
		users[_localsuser].numVerifications = numval + 1;

		ValidationAdded(msg.sender, _localsuser, users[_localsuser].numVerifications);
		// And transfer x localcoin from verifier to user.
		// Transfer(msg.sender, _localuser, 1);
	}

	// And because my mist wallet is getting full, we need a suicide function.
    function kill() { if (msg.sender == owner) suicide(owner); }

}