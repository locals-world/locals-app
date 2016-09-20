  var lightwallet = require('eth-lightwallet');
  var HookedWeb3Provider = require("hooked-web3-provider");
  var fs = require('fs');
  var config = {
    walletfile: '../scripts/wallet2.json',
    walletpassword: 'test'
  };



  var provider;


  if (!fs.existsSync(config.walletfile)) {
    console.log('file', config.walletfile, 'not found..');

    // maak nieuwe wallet en exit
    var secretSeed = lightwallet.keystore.generateRandomSeed();
    lightwallet.keystore.deriveKeyFromPassword(config.walletpassword, function(err, pwDerivedKey) {

      global_keystore = new lightwallet.keystore(secretSeed, pwDerivedKey);
      global_keystore.generateNewAddress(pwDerivedKey, 2);
      var keyStoreString = global_keystore.serialize();

      fs.writeFileSync(config.walletfile, keyStoreString);
      console.log("The keystore was saved! ==> ", config.walletfile);

      account = global_keystore.getAddresses()[0];

      console.log('Your main account is ', account);
      console.log('now send this guy some ether in your geth client please');
      console.log("eth.sendTransaction({from:eth.coinbase, to:'" + global_keystore.getAddresses()[0] + "',value: web3.toWei(500, \"ether\")})");
      console.log("eth.sendTransaction({from:eth.coinbase, to:'" + global_keystore.getAddresses()[1] + "',value: web3.toWei(500, \"ether\")})");

      console.log("Goodbye!");
      process.exit();
    });
  } else {
    var contents = JSON.stringify(require(config.walletfile));
    var global_keystore = lightwallet.keystore.deserialize(contents);

    global_keystore.passwordProvider = function(callback) {
      callback(null, 'test');
    };


<<<<<<< HEAD
  // create the provider
  var provider = new HookedWeb3Provider({
    host: 'http://10.0.0.210:8545',
    //host: 'http://localhost:8545',
    //host: 'https://morden.infura.io/fNrdKYnEHWqldP4JnWZp',
    //host: 'https://mainnet.infura.io/fNrdKYnEHWqldP4JnWZp',
    transaction_signer: global_keystore
  });
=======
    console.log(lightwallet.keystore);
    process.exit();

    lightwallet.keystore.deriveKeyFromPassword('test', function(err, pwDerivedKey) {


      var publickey = global_keystore.getAddresses()[0];
      var privatekey = global_keystore.exportPrivateKey(publickey, pwDerivedKey);

      console.log('your PK = ', privatekey);
    });


    // get the first account in this wallet
    var account = global_keystore.getAddresses()[0];
    console.log('deploy account = ', account);

    // create the provider
    provider = new HookedWeb3Provider({
      //host: 'http://109.123.70.141:8545',
      //host: 'http://localhost:8545',
      host: 'https://morden.infura.io/fNrdKYnEHWqldP4JnWZp',
      //host: 'https://mainnet.infura.io/fNrdKYnEHWqldP4JnWZp',
      transaction_signer: global_keystore
    });


  }
>>>>>>> origin/master

  module.exports = {
    build: {
      "index.html": "index.html",
      "app.js": [
        "javascripts/app.js"
      ],
      "app.css": [
        "stylesheets/app.css"
      ],
      "images/": "images/"
    },
    rpc: {
      provider: provider,
      //verbose: true,
      from: account,
      gas: 1500000
    }
  }