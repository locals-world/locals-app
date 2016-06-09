// Currently deployed at 0x2eDb2606b1BCC23fa3269D83A1f665c9A312F8e6


contract localsAvatar {

    address public owner;
    
    // Which tokencontract to use
    MyToken public token;

    // the address of the tokencontract to use
    address public tokenaddr;

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

    function localsAvatar(uint _verificationthresh, address token){
        owner = msg.sender;
        verificationthresh = _verificationthresh;
        tokenaddr = token;
    }

    // function addLocalsuser(string _username, string _ipfshash){
    //     // Save the user's ipfs hashed data
    //     users[msg.sender].username = _username;
    //     users[msg.sender].ipfshash = _ipfshash;
    //     users[msg.sender].verifications.push(0x000);
    //     users[msg.sender].numVerifications = 0;
    //     UserAdded(msg.sender, _username, _ipfshash, users[msg.sender].numVerifications);
    // }

    function addVerification(address _localsuser, string _hash){      
        // Add a verfier to this user's hash

        // If the verifier isnt verified himself, throw.
        //if(users[msg.sender].numVerifications < verificationthresh) throw;
        

        // If the user doesnt exist, create the user first.
        // if( users[_localsuser] ){
        // 	addLocalsuser(_localsuser, _hash);
        // }

        // If the hash of the user doesnt match the existing hash
        //if(users[_localsuser].ipfshash != _hash) throw;

        var tokencontract = MyToken(tokenaddr);

        uint numval = users[_localsuser].numVerifications;
        users[_localsuser].verifications.push(msg.sender);
        users[_localsuser].numVerifications = numval + 1;

        ValidationAdded(msg.sender, _localsuser, users[_localsuser].numVerifications);
        // And transfer x localcoin from verifier to user.
        tokencontract.mintToken(msg.sender, 5);
        tokencontract.mintToken(_localsuser, 5);
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