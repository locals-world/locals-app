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
        "constant": false,
        "inputs": [
          {
            "name": "_minimumQuorum",
            "type": "uint256"
          },
          {
            "name": "_debatingPeriodInMinutes",
            "type": "uint256"
          }
        ],
        "name": "createAssociation",
        "outputs": [
          {
            "name": "associationAddress",
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
    "unlinked_binary": "0x6060604081815280611ff7833960a09052516080516000805433600160a060020a031991821617825560018054821690941790935560028054909316909117909155611fa790819061005090396000f3606060405236156100565760e060020a600035046341c0e1b5811461005857806341fbb05014610080578063488f231f146100925780638da5cb5b14610177578063bce934a914610189578063f2fde38b1461019b575b005b61005660005433600160a060020a03908116911614156101d957600054600160a060020a0316ff5b6101bc600254600160a060020a031681565b6101bc6004356024356001547fdd62ed3e00000000000000000000000000000000000000000000000000000000606090815233600160a060020a039081166064523081166084526000921690829060c890839063dd62ed3e9060a49060209060448188876161da5a03f11561000257505060405151919091101590506101db57604080516020808252601b908201527f4c6f63616c436f696e20616c6c6f77616e636520746f6f206c6f7700000000008183015290517f08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa9181900360600190a1610002565b6101bc600054600160a060020a031681565b6101bc600154600160a060020a031681565b61005660043560005433600160a060020a039081169116146105ff57610002565b60408051600160a060020a03929092168252519081900360200190f35b565b604080516020808252600f908201527f616c6c6f77616e636520636865636b00000000000000000000000000000000008183015290517f08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa9181900360600190a17f9b603bfe78b1927b278d00e606c4e5fb177ef8d0e5b885cab821a70bf1223c3682600160a060020a031663dd62ed3e33306040518360e060020a0281526004018083600160a060020a0316815260200182600160a060020a03168152602001925050506020604051808303816000876161da5a03f11561000257505060408051805160208201528181526005818301527f544553542000000000000000000000000000000000000000000000000000000060608201529051908190036080019150a1604080516002547f23b872dd000000000000000000000000000000000000000000000000000000008252600160a060020a03338116600484015216602482015260c86044820152905183916323b872dd916064828101926020929190829003018187876161da5a03f1156100025750506040805160208082526015908201527f6c6f63616c636f696e207472616e7366657272656400000000000000000000008183015290517f08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa92509081900360600190a1604080516002547fa9059cbb000000000000000000000000000000000000000000000000000000008252600160a060020a0316600482015260c860248201529051839163a9059cbb9160448281019286929190829003018183876161da5a03f1156100025750505061271060026702c68af0bb140000604051610a708061062183390180848152602001806020018481526020018381526020018060200180602001848103845260088152602001807f6e6577546f6b656e000000000000000000000000000000000000000000000000815260200150602001848103835260018152602001807f5400000000000000000000000000000000000000000000000000000000000000815260200150602001848103825260038152602001807f302e3100000000000000000000000000000000000000000000000000000000008152602001506020019650505050505050604051809103906000f09050808585604051610f16806110918339018084600160a060020a031681526020018381526020018281526020019350505050604051809103906000f0925082507ffd348a0770e4820c1d2a70df37313c3610bd7aaeb23fba56f155548c9e141f298333604051808060200184600160a060020a0316815260200183600160a060020a031681526020018281038252600f8152602001807f6e6577206173736f63696174696f6e0000000000000000000000000000000000815260200150602001935050505060405180910390a1505092915050565b6000805473ffffffffffffffffffffffffffffffffffffffff19168217905550566060604052604051610a70380380610a7083398101604052805160805160a05160c05160e0516101005194959384019492939192908201910160008054600160a060020a03191633179055600160a060020a033316600090815260096020908152604082208890556005889055600180548851938290529092601f60026000198487161561010002019093169290920482018390047fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf690810193919290918a01908390106100f057805160ff19168380011785555b506101209291505b8082111561017957600081556001016100dc565b828001600101855582156100d4579182015b828111156100d4578251826000505591602001919060010190610102565b50508160026000509080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061017d57805160ff19168380011785555b506101ad9291506100dc565b5090565b8280016001018555821561016d579182015b8281111561016d57825182600050559160200191906001019061018f565b50506004805460ff191685179055805160038054600082905290917fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b602060026001851615610100026000190190941693909304601f90810184900482019386019083901061022f57805160ff19168380011785555b5061025f9291506100dc565b82800160010185558215610223579182015b82811115610223578251826000505591602001919060010190610241565b5050600683905560078054600160a060020a03191633908117909155600160a060020a03166000908152600860205260409020805460ff191660011790555050505050506107bf806102b16000396000f3606060405236156100e55760e060020a600035046306fdde0381146100e757806318160ddd1461014457806323b872dd1461014d578063313ce5671461017f57806341c0e1b51461018b57806354fd4d50146101b457806370a082311461021257806379c650681461022a5780638da5cb5b1461025a57806395d89b411461026c5780639a9a5cdb146102c75780639b19251a14610313578063a5a68c9c1461032e578063a9059cbb14610337578063cae9ca5114610366578063dc3080f2146103e6578063dd62ed3e1461040b578063e43252d714610430578063f2fde38b14610451575b005b60408051600180546020600282841615610100026000190190921691909104601f810182900482028401820190945283835261047293908301828280156105645780601f1061053957610100808354040283529160200191610564565b6104e060055481565b6104f2600435602435604435600160a060020a038316600090815260096020526040812054829010156105c357610002565b61050660045460ff1681565b6100e5600754600160a060020a0390811633909116141561068c57600754600160a060020a0316ff5b6040805160038054602060026001831615610100026000190190921691909104601f810182900482028401820190945283835261047293908301828280156105645780601f1061053957610100808354040283529160200191610564565b6104e060043560096020526000908152604090205481565b6100e560043560243533600160a060020a031660009081526008602052604090205460ff16151561068e57610002565b61051c600754600160a060020a031681565b6040805160028054602060018216156101000260001901909116829004601f810182900482028401820190945283835261047293908301828280156105645780601f1061053957610100808354040283529160200191610564565b6104f26004355b600654600090600160a060020a03831631101561030e57600654604051600160a060020a0384169160009183319091039082818181858883f19450505050505b919050565b6104f260043560086020526000908152604090205460ff1681565b6104e060065481565b6100e560043560243533600160a060020a0316600090815260096020526040902054819010156106c257610002565b604080516020604435600481810135601f81018490048402850184019095528484526104f294813594602480359593946064949293910191819084018382808284375094965050505050505033600160a060020a039081166000908152600a60209081526040808320938716835292905290812083905561076f846102ce565b600b602090815260043560009081526040808220909252602435815220546104e09081565b600a602090815260043560009081526040808220909252602435815220546104e09081565b6100e560043560005433600160a060020a0390811691161461077957610002565b6100e560043560005433600160a060020a0390811691161461079d57610002565b60405180806020018281038252838181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156104d25780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b60408051918252519081900360200190f35b604080519115158252519081900360200190f35b6040805160ff9092168252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b820191906000526020600020905b81548152906001019060200180831161054757829003601f168201915b505050505081565b5082600160a060020a031684600160a060020a03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a35060015b9392505050565b600160a060020a03831660009081526009602052604090205480830110156105ea57610002565b600160a060020a038481166000818152600a602090815260408083203390951680845294825280832054938352600b825280832094835293905291909120548301111561063657610002565b600160a060020a038481166000818152600960209081526040808320805488900390558785168352808320805488019055928252600b815282822033909416825292909252902080548301905561056c836102ce565b565b600160a060020a038216600090815260096020526040902080548201905560058054820190556106bd826102ce565b505050565b600160a060020a03821660009081526009602052604090205480820110156106e957610002565b600160a060020a033381166000908152600960205260408082208054859003905591841681522080548201905561071f826102ce565b5081600160a060020a031633600160a060020a03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35050565b50600190506105bc565b600160a060020a03166000908152600860205260409020805460ff19166001179055565b6000805473ffffffffffffffffffffffffffffffffffffffff19168217905550566060604052604051606080610f1683395060c06040525160805160a05160008054600160a060020a03191633179055604f83838360008054600160a060020a039081163391909116146060576002565b505050610e4f806100c76000396000f35b50826000831415606f57600192505b600183905560028290556040805184815260208101849052600160a060020a0386168183015290517f68259880819f96f54b67d672fefc666565de06099c91b57a689a42073ba090c99181900360600190a15050505056606060405236156100985760e060020a6000350463013cf08b811461009a578063237e9492146101d357806327ebcf0e14610312578063400e394914610324578063520910471461032d57806369bd3436146103565780638160f0b51461035f5780638da5cb5b14610368578063b1050da51461037a578063c9d27afe1461046c578063eceb2945146104de578063f2fde38b146105bb575b005b6105dc60043560038054829081101561000257506000526009027fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b8101547fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85e8201547fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85f8301547fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85c8401547fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f8608501547fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f861860154600160a060020a03959095169591947fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85d909201939260ff8181169361010090920416919088565b60408051602060248035600481810135601f81018590048502860185019096528585526106a795813595919460449492939092019181908401838280828437509496505050505050506000600060006000600060006000600060036000508a81548110156100025750815260098a027fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b018150600381015490975042108061027f5750600487015460ff165b8061030857508660000160009054906101000a9004600160a060020a031687600101600050548a6040518084600160a060020a0316606060020a0281526014018381526020018280519060200190808383829060006004602084601f0104600302600f01f150905001935050505060405180910390206000191687600601600050546000191614155b156106ea57610002565b6106b9600554600160a060020a031681565b6106a760045481565b61009860043560243560443560008054600160a060020a03908116339091161461091057610002565b6106a760025481565b6106a760015481565b6106b9600054600160a060020a031681565b604080516020604435600481810135601f81018490048402850184019095528484526106a7948135946024803595939460649492939101918190840183828082843750506040805160209735808a0135601f81018a90048a0283018a0190935282825296989760849791965060249091019450909250829150840183828082843750506040805160055460e060020a6370a08231028252600160a060020a033381169a83019a909a5291519698600098508897921695508594506370a0823193506024818101935060209291829003018188876161da5a03f115610002575050604051518314159050610af257610002565b6106a76004356024356005546040805160e060020a6370a0823102815233600160a060020a03908116600483015291516000938493169182916370a0823191602481810192602092909190829003018188876161da5a03f11561000257505060405151600014159050610cd557610002565b604080516020606435600481810135601f81018490048402850184019095528484526106d69481359460248035956044359560849492019190819084018382808284375094965050505050505060006000600360005086815481101561000257906000526020600020906009020160005090508484846040518084600160a060020a0316606060020a0281526014018381526020018280519060200190808383829060006004602084601f0104600302600f01f1509050019350505050604051809103902060001916816006016000505460001916149150610ae9565b61009860043560005433600160a060020a03908116911614610e3a57610002565b60408051600160a060020a038a1681526020810189905260608101879052851515608082015284151560a082015260c0810184905260e08101839052610100918101828152885460026001821615850260001901909116049282018390529091610120830190899080156106915780601f1061066657610100808354040283529160200191610691565b820191906000526020600020905b81548152906001019060200180831161067457829003601f168201915b5050995050505050505050505060405180910390f35b60408051918252519081900360200190f35b60408051600160a060020a03929092168252519081900360200190f35b604080519115158252519081900360200190f35b600095506000945060009350600092505b60078701548310156107b157600787018054849081101561000257600091825260055460208320909101935060019250600160a060020a03161461079a5760055460408051845460e060020a6370a082310282526101009004600160a060020a039081166004830152915192909116916370a082319160248181019260209290919082900301816000876161da5a03f115610002575050604051519150505b81549581019560ff16156107bf57938401936107c4565b60015486116107d057610002565b928301925b600192909201916106fb565b8385111561087d578660000160009054906101000a9004600160a060020a0316600160a060020a03168760010160005054670de0b6b3a7640000028a604051808280519060200190808383829060006004602084601f0104600302600f01f150905090810190601f1680156108595780820380516001836020036101000a031916815260200191505b5091505060006040518083038185876185025a03f19250505015156108f357610002565b60048701805460ff191660011761ff00191690555b6040805160048901548c8252602082018b9052818301899052610100900460ff161515606082015290517fd220b7272a8b6d0d7d6bcdace67b936a8f175e6d5c1b3ee438b72256b32ab3af9181900360800190a15050505050505092915050565b60048701805460ff191660011761ff001916610100179055610892565b5082600083141561092057600192505b600183905560028290556040805184815260208101849052600160a060020a0386168183015290517f68259880819f96f54b67d672fefc666565de06099c91b57a689a42073ba090c99181900360600190a150505050565b50508686856040518084600160a060020a0316606060020a0281526014018381526020018280519060200190808383829060006004602084601f0104600302600f01f150905001935050505060405180910390208260060160005081905550600260005054603c024201826003016000508190555060008260040160006101000a81548160ff0219169083021790555060008260040160016101000a81548160ff02191690830217905550600082600501600050819055507f646fec02522b41e7125cfc859a64fd4f4cefd5dc3b6237ca0abe251ded1fa881838888886040518085815260200184600160a060020a03168152602001838152602001806020018281038252838181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f168015610ad05780820380516001836020036101000a031916815260200191505b509550505050505060405180910390a150600182016004555b50949350505050565b6003805460018101808355909190828015829011610b2957600902816009028360005260206000209182019101610b299190610bc5565b505060038054929550918591508110156100025790600052602060002090600902016000508054600160a060020a031916881781556001818101889055865160028381018054600082815260209081902096985091959481161561010002600019011691909104601f908101829004840193918a0190839010610ca557805160ff19168380011785555b50610978929150610c8d565b50506009015b80821115610ca1578054600160a060020a03191681556000600182810182905560028381018054848255909281161561010002600019011604601f819010610c7357505b5060006003830181905560048301805461ffff1916905560058301819055600683018190556007830180548282559082526020909120610bbf918101905b80821115610ca157805474ffffffffffffffffffffffffffffffffffffffffff19168155600101610c47565b601f016020900490600052602060002090810190610c0991905b80821115610ca15760008155600101610c8d565b5090565b82800160010185558215610bb3579182015b82811115610bb3578251826000505591602001919060010190610cb7565b60038054869081101561000257906000526020600020906009020160005033600160a060020a0316600090815260088201602052604090205490925060ff16151560011415610d2357610002565b60078201805460018101808355909190828015829011610d5457600083815260209020610d54918101908301610c47565b50506040805180820190915286815233602082015260078501805493965090929091508590811015610002579060005260206000209001600050815181546020938401516101000260ff1991821690921774ffffffffffffffffffffffffffffffffffffffff0019169190911790915533600160a060020a0316600081815260088601845260409081902080549093166001908117909355918601600586015581518881528715159381019390935282820152517f86abfce99b7dd908bec0169288797f85049ec73cbe046ed9de818fab3a497ae09181900360600190a1505092915050565b60008054600160a060020a031916821790555056",
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
    "updated_at": 1474467172471,
    "links": {},
    "address": "0xb5955f5f96d17a4bb3b1791143e635f1f83a2bb6"
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
