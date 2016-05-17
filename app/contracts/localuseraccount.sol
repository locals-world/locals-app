contract localsuser {

	mapping (address => string) public ipfsHash;

	function localsuser(){

	}

	function addLocalsuser(string _ipfshash){
		ipfsHash[msg.sender] = _ipfshash;
	}

}