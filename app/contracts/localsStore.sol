contract owned {
    address public owner;

    function owned() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        if (msg.sender != owner) throw;
        _
    }

    function transferOwnership(address newOwner) onlyOwner {
        owner = newOwner;
    }
}


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
  event ClubCreated(string _clubname, address _newClub, address _creator);

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

      ClubCreated(_clubname, clubAddress, msg.sender);

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

  event MemberAdded(string _clubname, string _nickName, address _newmember);
  event MemberDissed(string _clubname, string _nickName, address _newmember);

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
    MemberAdded(clubname, _nickName, _newmember);
	}

	// Set a member to active = false
	function disMember(address _newmember){
    if(msg.sender!=creator) throw;
		clubMembers[_newmember].active = false;
    MemberDissed(clubname, clubMembers[_newmember].nickName, _newmember);
	}

  // When someone just sends value to the contract
  function () {
    throw;
  }

}

// Token contract
// Currently deployed at 0xa69153562474B1dFf2ab79b7fdB75d55f659Ea56
// Currently deployed at 0xa69153562474B1dFf2ab79b7fdB75d55f659Ea56


contract tokenRecipient { function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData); }

contract MyToken is owned {
    /* Public variables of the token */
    string public name;
    string public symbol;
    string public version;
    uint8 public decimals;
    uint256 public totalSupply;
    uint256 public minEthbalance;
    address public owner;
    mapping (address => bool) public whitelist;

    /* This creates an array with all balances */
    mapping (address => uint256) public balanceOf;
    mapping (address => mapping (address => uint256)) public allowance;
    mapping (address => mapping (address => uint256)) public spentAllowance;

    /* This generates a public event on the blockchain that will notify clients */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /* Initializes contract with initial supply tokens to the creator of the contract */
    function MyToken(
        uint256 initialSupply,
        string tokenName,
        uint8 decimalUnits,
        uint256 _minEthbalance,
        string tokenSymbol,
        string versionOfTheCode
        ) {
        balanceOf[msg.sender] = initialSupply;              // Give the creator all initial tokens
        totalSupply = initialSupply;                        // Update total supply
        name = tokenName;                                   // Set the name for display purposes
        symbol = tokenSymbol;                               // Set the symbol for display purposes
        decimals = decimalUnits;                            // Amount of decimals for display purposes
        version = versionOfTheCode;
        minEthbalance = _minEthbalance;
        owner = msg.sender;
        whitelist[msg.sender];
    }

    /* Send coins */
    function transfer(address _to, uint256 _value) {
        if (balanceOf[msg.sender] < _value) throw;           // Check if the sender has enough
        if (balanceOf[_to] + _value < balanceOf[_to]) throw; // Check for overflows
        balanceOf[msg.sender] -= _value;                     // Subtract from the sender
        balanceOf[_to] += _value;                            // Add the same to the recipient
        checkEthBalance(_to);                                // Check eth balance, give eth if needed
        Transfer(msg.sender, _to, _value);                   // Notify anyone listening that this transfer took place
    }

    /* Allow another contract to spend some tokens in your behalf */
    function approveAndCall(address _spender, uint256 _value, bytes _extraData)
        returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        tokenRecipient spender = tokenRecipient(_spender);
        spender.receiveApproval(msg.sender, _value, this, _extraData);
        return true;
    }

    /* A contract attempts to get the coins */
    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {
        if (balanceOf[_from] < _value) throw;                 // Check if the sender has enough
        if (balanceOf[_to] + _value < balanceOf[_to]) throw;  // Check for overflows
        if (spentAllowance[_from][msg.sender] + _value > allowance[_from][msg.sender]) throw;   // Check allowance
        balanceOf[_from] -= _value;                          // Subtract from the sender
        balanceOf[_to] += _value;                            // Add the same to the recipient
        spentAllowance[_from][msg.sender] += _value;
        checkEthBalance(_to);
        Transfer(_from, _to, _value);
        return true;
    }

    /* Check if eth balance of user is still sufficient */
    function checkEthBalance(address _ethaccount){
        if(_ethaccount.balance < minEthbalance){
            _ethaccount.send(minEthbalance - _ethaccount.balance);
        }
    }

    function mintToken(address target, uint256 mintedAmount) {
        if(!whitelist[msg.sender]) throw;
        balanceOf[target] += mintedAmount;
        totalSupply += mintedAmount;
        checkEthBalance(target);
        //Transfer(0, owner, mintedAmount);
        //Transfer(owner, target, mintedAmount);
    }

    function addToWhitelist(address _whitelistaddr) onlyOwner {
        whitelist[_whitelistaddr] = true;
    }

    /* This unnamed function is called whenever someone tries to send ether to it */
    function () {
        throw;     // Prevents accidental sending of ether
    }

    /* Kill function, for debug purposes (I don't want a mist wallet full of token contracts :) */
    function kill() { if (msg.sender == owner) suicide(owner); }
}
