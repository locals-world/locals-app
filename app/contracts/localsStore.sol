import "./owned.sol";
import "./localsCointoken.sol";

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

	function createClub(string _nickname, string _clubname, string _clubicon, address _token)
		returns (address clubAddress)

	{
			// Create a new Token contract and return its address.
			// From the JavaScript side, the return type is simply
			// "address", as this is the closest type available in
			// the ABI.
      // the creator should pay localcoin to the localsfoundation
      // create an instance of the token contract
      var tokencontract = localsCointoken(tokenaddr);

      if(tokencontract.allowance(msg.sender,this)<200) {
        Error('LocalCoin allowance too low');
        throw;
        }

      Error('allowance check');
      /*Allowance('TEST ', token.allowance(msg.sender, this));*/

      tokencontract.transferFrom(msg.sender, foundation, 200);

      Error('localcoin transferred');
      //token.transfer(foundation, 200);

      clubAddress = new localsClub(msg.sender, _nickname, _clubicon, _clubname, _token);

      ClubCreated(_clubname, clubAddress, msg.sender);

      return clubAddress;

	}

  function createAssociation(uint _minimumQuorum, uint _debatingPeriodInMinutes, token _sharesTokenAddress) returns address associationAddress {

    var tokencontract = localsCointoken(tokenaddr);

    if(tokencontract.allowance(msg.sender,this)<200) {
      Error('LocalCoin allowance too low');
      throw;
      }

    Error('allowance check');
    /*Allowance('TEST ', token.allowance(msg.sender, this));*/

    tokencontract.transferFrom(msg.sender, foundation, 200);

    Error('localcoin transferred');
    //token.transfer(foundation, 200);

    associationAddress = new Association(_minimumQuorum, _debatingPeriodInMinutes, _sharesTokenAddress);

    ClubCreated('association', associationAddress, msg.sender);

    return associationAddress;

  }

  /* Kill function, for debug purposes (I don't want a mist wallet full of token contracts :) */
  function kill() { if (msg.sender == owner) suicide(owner); }

}

contract token { mapping (address => uint256) public balanceOf;  }

// Here we start an Association
/* The democracy contract itself */
contract Association is owned {

    /* Contract Variables and events */
    uint public minimumQuorum;
    uint public debatingPeriodInMinutes;
    Proposal[] public proposals;
    uint public numProposals;
    token public sharesTokenAddress;

    event ProposalAdded(uint proposalID, address recipient, uint amount, string description);
    event Voted(uint proposalID, bool position, address voter);
    event ProposalTallied(uint proposalID, int result, uint quorum, bool active);
    event ChangeOfRules(uint minimumQuorum, uint debatingPeriodInMinutes, address sharesTokenAddress);

    struct Proposal {
        address recipient;
        uint amount;
        string description;
        uint votingDeadline;
        bool executed;
        bool proposalPassed;
        uint numberOfVotes;
        bytes32 proposalHash;
        Vote[] votes;
        mapping (address => bool) voted;
    }

    struct Vote {
        bool inSupport;
        address voter;
    }

    /* modifier that allows only shareholders to vote and create new proposals */
    modifier onlyShareholders {
        if (sharesTokenAddress.balanceOf(msg.sender) == 0) throw;
        _
    }

    /* First time setup */
    function Association(token sharesAddress, uint minimumSharesToPassAVote, uint minutesForDebate) {
        changeVotingRules(sharesAddress, minimumSharesToPassAVote, minutesForDebate);
    }

    /*change rules*/
    function changeVotingRules(token sharesAddress, uint minimumSharesToPassAVote, uint minutesForDebate) onlyOwner {
        sharesTokenAddress = token(sharesAddress);
        if (minimumSharesToPassAVote == 0 ) minimumSharesToPassAVote = 1;
        minimumQuorum = minimumSharesToPassAVote;
        debatingPeriodInMinutes = minutesForDebate;
        ChangeOfRules(minimumQuorum, debatingPeriodInMinutes, sharesTokenAddress);
    }

    /* Function to create a new proposal */
    function newProposal(
        address beneficiary,
        uint etherAmount,
        string JobDescription,
        bytes transactionBytecode
    )
        onlyShareholders
        returns (uint proposalID)
    {
        proposalID = proposals.length++;
        Proposal p = proposals[proposalID];
        p.recipient = beneficiary;
        p.amount = etherAmount;
        p.description = JobDescription;
        p.proposalHash = sha3(beneficiary, etherAmount, transactionBytecode);
        p.votingDeadline = now + debatingPeriodInMinutes * 1 minutes;
        p.executed = false;
        p.proposalPassed = false;
        p.numberOfVotes = 0;
        ProposalAdded(proposalID, beneficiary, etherAmount, JobDescription);
        numProposals = proposalID+1;
    }

    /* function to check if a proposal code matches */
    function checkProposalCode(
        uint proposalNumber,
        address beneficiary,
        uint etherAmount,
        bytes transactionBytecode
    )
        constant
        returns (bool codeChecksOut)
    {
        Proposal p = proposals[proposalNumber];
        return p.proposalHash == sha3(beneficiary, etherAmount, transactionBytecode);
    }

    /* */
    function vote(uint proposalNumber, bool supportsProposal)
        onlyShareholders
        returns (uint voteID)
    {
        Proposal p = proposals[proposalNumber];
        if (p.voted[msg.sender] == true) throw;

        voteID = p.votes.length++;
        p.votes[voteID] = Vote({inSupport: supportsProposal, voter: msg.sender});
        p.voted[msg.sender] = true;
        p.numberOfVotes = voteID +1;
        Voted(proposalNumber,  supportsProposal, msg.sender);
    }

    function executeProposal(uint proposalNumber, bytes transactionBytecode) returns (int result) {
        Proposal p = proposals[proposalNumber];
        /* Check if the proposal can be executed */
        if (now < p.votingDeadline  /* has the voting deadline arrived? */
            ||  p.executed        /* has it been already executed? */
            ||  p.proposalHash != sha3(p.recipient, p.amount, transactionBytecode)) /* Does the transaction code match the proposal? */
            throw;

        /* tally the votes */
        uint quorum = 0;
        uint yea = 0;
        uint nay = 0;

        for (uint i = 0; i <  p.votes.length; ++i) {
            Vote v = p.votes[i];
            uint voteWeight = sharesTokenAddress.balanceOf(v.voter);
            quorum += voteWeight;
            if (v.inSupport) {
                yea += voteWeight;
            } else {
                nay += voteWeight;
            }
        }

        /* execute result */
        if (quorum <= minimumQuorum) {
            /* Not enough significant voters */
            throw;
        } else if (yea > nay ) {
            /* has quorum and was approved */
            p.recipient.call.value(p.amount * 1 ether)(transactionBytecode);
            p.executed = true;
            p.proposalPassed = true;
        } else {
            p.executed = true;
            p.proposalPassed = false;
        }
        // Fire Events
        ProposalTallied(proposalNumber, result, quorum, p.proposalPassed);
    }

// Here we start the item contracts
contract localsClub {

	address public creator;
  string public clubname;
  string public clubicon;
  string public token;

  uint public numMembers;
  address[] public members;

	struct clubMember {
		string nickName;
		bool active;
	}

  event MemberAdded(string _clubname, string _nickName, address _newmember);
  event MemberDissed(string _clubname, address _newmember);

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
    //if(msg.sender!=creator) throw;
    if(clubMembers[_newmember].active) throw;
		clubMembers[_newmember].nickName = _nickName;
		clubMembers[_newmember].active = true;
    members.push(_newmember);
    numMembers = members.length;
    MemberAdded(clubname, _nickName, _newmember);
	}

	// Set a member to active = false
	function disMember(address _newmember){
    if(msg.sender!=creator) throw;
		clubMembers[_newmember].active = false;
    MemberDissed(clubname, _newmember);
	}

  // When someone just sends value to the contract
  function () {
    throw;
  }

}
