

contract localsStore is owned {


  // Which tokencontract to use
  //MyToken public token;



  // the address of the tokencontract to use
  address public tokenaddr;

  // the address of the foundation to use
  address public foundation;

  event Log(string _log, address _newclub);
  event Error(string _error);
  event Allowance(string _msg, uint256 _balance);

	function localsStore(address _tokenContract, address _foundationContract) {
		tokenaddr = _tokenContract;
    foundation = _foundationContract;
	}

	function createClub(string _nickname, string _clubname, string _clubicon)
		returns (address clubAddress)

	{
			// Create a new Token contract and return its address.
			// From the JavaScript side, the return type is simply
			// "address", as this is the closest type available in
			// the ABI.
      // the creator should pay localcoin to the localsfoundation
      // create an instance of the token contract
      var token = MyToken(tokenaddr);

      if(token.allowance(msg.sender,this)<200) {
        Error('LocalCoin allowance too low');
        throw;
        }

      Error('allowance check');
      /*Allowance('TEST ', token.allowance(msg.sender, this));*/

      token.transferFrom(msg.sender, foundation, 200);

      Error('localcoin transferred');
      //token.transfer(foundation, 200);

      clubAddress = new localsClub(msg.sender, _nickname, _clubicon, _clubname);

      Error('club created');

      Log('Club created', clubAddress);

      return clubAddress;

	}

  /* Kill function, for debug purposes (I don't want a mist wallet full of token contracts :) */
  function kill() { if (msg.sender == owner) suicide(owner); }

}

// Here we start the item contracts
contract localsClub {

	address public creator;
  string public clubname;
  string public clubicon;

	struct clubMember {
		string nickName;
		bool active;
	}

	mapping (address => clubMember) public clubMembers;

	function localsClub(address _creator, string _nickName, string _clubicon, string _clubname){
		creator = _creator;
    clubname = _clubname;
    clubicon = _clubicon;
		clubMembers[_creator].nickName = _nickName;
		clubMembers[_creator].active = true;
	}

	// Add a member to the club and make em active
	function addMember(address _newmember, string _nickName) {
    if(msg.sender!=creator) throw;
		clubMembers[_newmember].nickName = _nickName;
		clubMembers[_newmember].active = true;
	}

	// Set a member to active = false
	function disMember(address _newmember){
    if(msg.sender!=creator) throw;
		clubMembers[_newmember].active = false;
	}

  // When someone just sends value to the contract
  function () {
    throw;
  }

}

// Token contract
// Currently deployed at 0xa69153562474B1dFf2ab79b7fdB75d55f659Ea56
