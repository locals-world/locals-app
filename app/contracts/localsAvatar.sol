// Currently deployed at 0x2eDb2606b1BCC23fa3269D83A1f665c9A312F8e6


contract localsTruth {

    address public owner;
    
    // Which tokencontract to use
    MyToken public token;

    // the address of the tokencontract to use
    address public tokenaddr;

    // Threshold for verification status
    uint public verificationthresh;

    struct Hash {
        address hashowner;
        string thehash;
        mapping(address => bool) verifications;
        uint numVerifications;
    }

    mapping (string => Hash) hashes;

    event ValidationAdded(address _from, address _to, uint _numverifications);
    event HashAdded(address _from, string _hash, uint _numverifications);
    event Error(string _err);

    function localsTruth(address token, address _adam, address _eva, uint _verificationthresh){
        owner = msg.sender;
        tokenaddr = token;
        verificationthresh = _verificationthresh;
        hashes['adam'].numVerifications = _verificationthresh;
        hashes['adam'].hashowner = _adam;
        hashes['eva'].numVerifications = _verificationthresh;
        hashes['eva'].hashowner = _eva;
    }

    function addVerification(address _hashowner, string _thehash, string _senderhash) returns (string _feedback) {      
        // Add a verfier to this user's hash

        // If the verifier isnt verified himself, throw.
        if(hashes[_senderhash].numVerifications < verificationthresh) {
            Error('verifier has not enough verifications.');
            return 'verifier has not enough verifications.';
        }

        // If the msg.sender is not the owner of the senderhash, throw.
        if(hashes[_senderhash].hashowner != msg.sender) {
            Error('msg sender is not the owner of the senderhash.');
            return 'msg sender is not the owner of the senderhash.';
        }
        
        // If the verifier already verified this hash, throw.
        if(hashes[_thehash].verifications[msg.sender] == true) {
            Error('msg sender already verified this.');
            return 'msg sender already verified this.';
        }
        
        var tokencontract = MyToken(tokenaddr);

        uint numval = hashes[_thehash].numVerifications;
        hashes[_thehash].verifications[msg.sender] = true;
        hashes[_thehash].numVerifications = numval + 1;

        ValidationAdded(msg.sender, _hashowner, hashes[_thehash].numVerifications);
        // And transfer x localcoin from verifier to user.
        tokencontract.mintToken(msg.sender, 5);
        tokencontract.mintToken(_hashowner, 5);
        
    }

    function checkVeracity(string _hash) returns (uint numVerifications) {
    	return hashes[_hash].numVerifications;
    }

    // And because my mist wallet is getting full, we need a suicide function.
    function kill() { if (msg.sender == owner) suicide(owner); }

}


//// INCLUDE THE TOKEN CONTRACT
// Currently deployed at 0xa69153562474B1dFf2ab79b7fdB75d55f659Ea56

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
        Transfer(0, owner, mintedAmount);
        Transfer(owner, target, mintedAmount);
    }

    function addToWhitelist(address _whitelistaddr) onlyOwner {
        whitelist[_whitelistaddr] = true;
    }

    /* This unnamed function is called whenever someone tries to send ether to it */
    // function () {
    //     throw;     // Prevents accidental sending of ether
    // }

    /* Kill function, for debug purposes (I don't want a mist wallet full of token contracts :) */
    function kill() { if (msg.sender == owner) suicide(owner); }
}