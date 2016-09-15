var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("localsStore error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("localsStore error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("localsStore contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of localsStore: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to localsStore.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: localsStore not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "_nickname",
            "type": "string"
          },
          {
            "name": "_clubname",
            "type": "string"
          },
          {
            "name": "_clubicon",
            "type": "string"
          }
        ],
        "name": "createClub",
        "outputs": [
          {
            "name": "clubAddress",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "kill",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "foundation",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "tokenaddr",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_tokenContract",
            "type": "address"
          },
          {
            "name": "_foundationContract",
            "type": "address"
          }
        ],
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_log",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "_newclub",
            "type": "address"
          }
        ],
        "name": "Log",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_error",
            "type": "string"
          }
        ],
        "name": "Error",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_msg",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "_balance",
            "type": "uint256"
          }
        ],
        "name": "Allowance",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_clubname",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "_newClub",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "_creator",
            "type": "address"
          }
        ],
        "name": "ClubCreated",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604081815280610f93833960a09052516080516000805433600160a060020a031991821617825560018054821690941790935560028054909316909117909155610f4390819061005090396000f3606060405236156100565760e060020a60003504631116d0d4811461005857806341c0e1b51461020957806341fbb050146102315780638da5cb5b14610243578063bce934a914610255578063f2fde38b14610267575b005b6102886004808035906020019082018035906020019191908080601f01602080910402602001604051908101604052809392919081815260200183838082843750506040805160208835808b0135601f8101839004830284018301909452838352979998604498929750919091019450909250829150840183828082843750506040805160209735808a0135601f81018a90048a0283018a01909352828252969897606497919650602491909101945090925082915084018382808284375050600154604080517fdd62ed3e000000000000000000000000000000000000000000000000000000008152600160a060020a033381169a82019a909a52308a1660248201529051969860009850919091169560c8955086945063dd62ed3e935060448281019350602092829003018189876161da5a03f11561000257505060405151919091101590506102a557604080516020808252601b908201527f4c6f63616c436f696e20616c6c6f77616e636520746f6f206c6f7700000000008183015290517f08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa9181900360600190a1610002565b61005660005433600160a060020a03908116911614156105e557600054600160a060020a0316ff5b610288600254600160a060020a031681565b610288600054600160a060020a031681565b610288600154600160a060020a031681565b61005660043560005433600160a060020a039081169116146105e757610002565b60408051600160a060020a03929092168252519081900360200190f35b604080516020808252600f908201527f616c6c6f77616e636520636865636b00000000000000000000000000000000008183015290517f08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa9181900360600190a1604080516002547f23b872dd000000000000000000000000000000000000000000000000000000008252600160a060020a033381166004840152908116602483015260c860448301529151918316916323b872dd9160648181019260209290919082900301816000876161da5a03f1156100025750506040805160208082526015908201527f6c6f63616c636f696e207472616e7366657272656400000000000000000000008183015290517f08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa92509081900360600190a13385848660405161093a806106098339018085600160a060020a031681526020018060200180602001806020018481038452878181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156104625780820380516001836020036101000a031916815260200191505b508481038352868181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156104bb5780820380516001836020036101000a031916815260200191505b508481038252858181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156105145780820380516001836020036101000a031916815260200191505b50975050505050505050604051809103906000f0915081507ffd348a0770e4820c1d2a70df37313c3610bd7aaeb23fba56f155548c9e141f29848333604051808060200184600160a060020a0316815260200183600160a060020a031681526020018281038252858181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156105ce5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a1509392505050565b565b6000805473ffffffffffffffffffffffffffffffffffffffff1916821790555056606060405260405161093a38038061093a83398101604052805160805160a05160c051929391820192908201910160008054600160a060020a031916851781556001805483519282905290916020601f60026000198587161561010002019094169390930483018190047fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf69081019390918601908390106100ff57805160ff19168380011785555b5061012f9291505b8082111561018857600081556001016100af565b5050600160a060020a03841660009081526005602052604090206001908101805460ff19169091179055505050506106e1806102596000396000f35b828001600101855582156100a7579182015b828111156100a7578251826000505591602001919060010190610111565b50508160026000509080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061018c57805160ff19168380011785555b506101bc9291506100af565b5090565b8280016001018555821561017c579182015b8281111561017c57825182600050559160200191906001019061019e565b5050600160a060020a038416600090815260056020908152604082208551815482855293839020919360026001821615610100026000190190911604601f90810184900483019391929188019083901061022957805160ff19168380011785555b506100c39291506100af565b8280016001018555821561021d579182015b8281111561021d57825182600050559160200191906001019061023b566060604052361561006b5760e060020a60003504629810da811461007357806302d05d3f146100ce5780633b03d01c146100e05780634698d110146101015780635daf08ca1461010a5780635e4b4a651461015057806387371c17146101ad578063c127c247146101cc575b61023e610002565b6040805160028054602060018216156101000260001901909116829004601f810182900482028401820190945283835261024093908301828280156103995780601f1061036e57610100808354040283529160200191610399565b6102ae600054600160a060020a031681565b61023e60043560005433600160a060020a039081169116146103a157610002565b6102cb60035481565b6102ae60043560048054829081101561000257506000527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b0154600160a060020a031681565b60408051600180546020600282841615610100026000190190921691909104601f810182900482028401820190945283835261024093908301828280156103995780601f1061036e57610100808354040283529160200191610399565b6102dd6004356005602052600090815260409020600181015460ff1682565b60408051602060046024803582810135601f810185900485028601850190965285855261023e9583359593946044949392909201918190840183828082843750949650505050505050600160a060020a03821660009081526005602052604090206001015460ff161561047e57610002565b005b60405180806020018281038252838181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156102a05780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b60408051600160a060020a03929092168252519081900360200190f35b60408051918252519081900360200190f35b60408051821515602082015281815283546002600182161561010002600019019091160491810182905290819060608201908590801561035e5780601f106103335761010080835404028352916020019161035e565b820191906000526020600020905b81548152906001019060200180831161034157829003601f168201915b5050935050505060405180910390f35b820191906000526020600020905b81548152906001019060200180831161037c57829003601f168201915b505050505081565b600160a060020a0381166000818152600560209081526040918290206001908101805460ff1916905582519182019390935281815282546002818516156101000260001901909116049181018290527f271a3a35200fc9c5986b2e70ed2616bda41b09856c9615d6f2eadf210c0c10899291849190819060608201908590801561046c5780601f106104415761010080835404028352916020019161046c565b820191906000526020600020905b81548152906001019060200180831161044f57829003601f168201915b5050935050505060405180910390a150565b600160a060020a038216600090815260056020908152604082208351815482855293839020919360026001821615610100026000190190911604601f9081018490048301939192918601908390106104f957805160ff19168380011785555b506105299291505b8082111561058457600081556001016104e5565b828001600101855582156104dd579182015b828111156104dd57825182600050559160200191906001019061050b565b5050600160a060020a03821660009081526005602052604090206001908101805460ff1916821790556004805491820180825590919082818380158290116105885781836000526020600020918201910161058891906104e5565b5090565b50505060009283525060209182902001805473ffffffffffffffffffffffffffffffffffffffff19168417905560045460035560408051600160a060020a038516918101919091526060808252600180546002818316156101000260001901909116049183018290527f1c71d2ba314574c9dd81ccf2415ea501078544d2f1ded16b1a2b5b8efa9fee83939092859287928291908201906080830190879080156106735780601f1061064857610100808354040283529160200191610673565b820191906000526020600020905b81548152906001019060200180831161065657829003601f168201915b50508381038252858181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156106cd5780820380516001836020036101000a031916815260200191505b509550505050505060405180910390a1505056",
    "events": {
      "0x1dfffa052d4a63bd70f14b863e128979d1c59e3589a0a3beb2633a120047042d": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_log",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "_newclub",
            "type": "address"
          }
        ],
        "name": "Log",
        "type": "event"
      },
      "0x08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_error",
            "type": "string"
          }
        ],
        "name": "Error",
        "type": "event"
      },
      "0x9b603bfe78b1927b278d00e606c4e5fb177ef8d0e5b885cab821a70bf1223c36": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_msg",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "_balance",
            "type": "uint256"
          }
        ],
        "name": "Allowance",
        "type": "event"
      },
      "0xfd348a0770e4820c1d2a70df37313c3610bd7aaeb23fba56f155548c9e141f29": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "_clubname",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "_newClub",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "_creator",
            "type": "address"
          }
        ],
        "name": "ClubCreated",
        "type": "event"
      }
    },
    "updated_at": 1473783197064,
    "links": {}
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "localsStore";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.localsStore = Contract;
  }
})();
