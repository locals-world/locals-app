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

	address public tokenContract;
  mapping (address => uint256) public balanceOf;

  // Which tokencontract to use
  MyToken public token;

  // the address of the tokencontract to use
  address public tokenaddr;

  // the address of the foundation to use
  address public foundation;

  event Log(string _log, address _newclub);
  event Error(string _error);

	function localsStore(address _tokenContract, address _foundationContract) {
		owner = msg.sender;
		tokenaddr = _tokenContract;
    foundation = _foundationContract;
	}

	function createClub(string _nickname)
		returns (address clubAddress)

	{
			// Create a new Token contract and return its address.
			// From the JavaScript side, the return type is simply
			// "address", as this is the closest type available in
			// the ABI.
      // the creator should pay localcoin to the localsfoundation
      // create an instance of the token contract
      var tokencontract = MyToken(tokenaddr);

      if(token.balanceOf(msg.sender)<2) {
          Error('LocalCoin balance too low.');
          throw;
      }

      token.transfer(foundation, 2);

      clubAddress = new localsClub(msg.sender, _nickname);

      Log('Club created', clubAddress);

      return clubAddress;

	}

  /* Kill function, for debug purposes (I don't want a mist wallet full of token contracts :) */
  function kill() { if (msg.sender == owner) suicide(owner); }

}

// Here we start the item contracts
contract localsClub {

	address public creator;

	mapping (address => clubMember) public clubMembers;

	struct clubMember {
		string nickName;
		bool active;
	}

	function localsClub(address _creator, string _nickName){
		creator = _creator;
		clubMembers[_creator].nickName = _nickName;
		clubMembers[_creator].active = true;
	}

	// Add a member to the club and make em active
	function addMember(address _newmember, string _nickName){
		clubMembers[_newmember].nickName = _nickName;
		clubMembers[_newmember].active = true;
	}

	// Set a member to active = false
	function disMember(address _newmember){
		clubMembers[_newmember].active = false;
	}

}

// Token contract
// Currently deployed at 0xa69153562474B1dFf2ab79b7fdB75d55f659Ea56


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
    /*function approveAndCall(address _spender, uint256 _value, bytes _extraData)
        returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        tokenRecipient.spender = tokenRecipient(_spender);
        spender.receiveApproval(msg.sender, _value, this, _extraData);
        return true;
    }*/

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
