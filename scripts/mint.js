var lightwallet = require('eth-lightwallet');
var Web3 = require('web3');
var fs = require('fs');
var keystoreFile = "./wallet.json";

var localcoincontract = require('../app/contracts/MyToken.json');
var localcoincontractaddress = '0xe94a4e5615E5d1BAfbDBc8a221D9b0995f67A752';

var myArgs = require('optimist').argv;
var HookedWeb3Provider = require("hooked-web3-provider");

var host = "http://faucet.ma.cx:8545";

var request = require('request');

var global_keystore;
var account;
var web3;
var web3_monitor;
var pwd = "test";

// Add 0x to address 
function fixaddress(address) {
  //console.log("Fix address", address);
  if (!strStartsWith(address, '0x')) {
    return ('0x' + address);
  }
  return address;
}

function strStartsWith(str, prefix) {
  return str.indexOf(prefix) === 0;
}

if (!fs.existsSync(keystoreFile)) {
	console.log('You need a wallet...');
	process.exit();

} else {

	console.log('Keystore file found.');
	var contents = fs.readFileSync(keystoreFile, 'utf8');
	var global_keystore = lightwallet.keystore.deserialize(contents);

	global_keystore.passwordProvider = function(callback) {
		callback(null, pwd);
	};


	account = global_keystore.getAddresses()[0];
	console.log('Your account is ', account);

	web3 = new Web3();
	var provider = new HookedWeb3Provider({
		host: host,
		transaction_signer: global_keystore
	});
	web3.setProvider(provider);

	web3_monitor = new Web3();
	web3_monitor.setProvider(new web3.providers.HttpProvider(host));


  account = fixaddress(account);
  var etherbalance = parseFloat(web3.fromWei(web3.eth.getBalance(account).toNumber(), 'ether'));

  //  var etherbalance = web3.fromWei(web3.eth.getBalance(account), 'ether').toNumber(10);
  console.log('Account', account, 'has Ξ', etherbalance);

	var gasPrice;

	web3.eth.getGasPrice(function(err, result) {

		var gasPrice = result.toNumber(10);
		console.log('gasprice is ', gasPrice);

		console.log('command:' , myArgs._[0]);
		var command = myArgs._[0];
		switch (command) {
			case 'getlc':

				var amount = 5000;
				var to = fixaddress(myArgs._[1]);
				
				console.log('minting ',amount,' LC to',to);

				// creation of contract object
				var MyContract = web3.eth.contract(localcoincontract.abi);
				var myContractInstance = MyContract.at(localcoincontractaddress);

				var options = {
					from: account,
					value: 0,
					gas: 311590,
					gasPrice: gasPrice,
					//nonce: Math.floor(Math.random(999999)) + new Date().getTime(),
				};

				var result = myContractInstance.mintToken(to, amount,options,
					function(err, result) {
						if (err != null) {
							console.log(err);
							console.log("ERROR: Transaction didn't go through. See console.");
						} else {
							console.log("Transaction Successful!");
							console.log('TXhash=',result);
						}
					}
				);
				break;
			default: 
				console.log('please provide command : ');
				console.log('getlc <address> ( Get localcoin )')
				process.exit();
			break;

		}
	});

}