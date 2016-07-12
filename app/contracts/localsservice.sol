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


contract LocalsService is owned {

  struct ServiceAddress {
    string entryName;
    address entryAddress;
  }

  mapping (address => string) toName;
mapping (string => address) toAddress;

  function LocalsService(){
    toName[this] = 'base';
		toAddress['base'] = this;
  }

  function register(string _name, address _address) {
		// Don't allow the same name to be overwritten.
		toName[_address] = _name;
		toAddress[_name] = _address;
	}

  function addressOf(string name) constant returns (address addr) {
		return toAddress[name];
	}

	function nameOf(address addr) constant returns (string name) {
		return toName[addr];
	}

}
