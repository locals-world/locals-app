  var lightwallet = require('eth-lightwallet');
  var HookedWeb3Provider = require("hooked-web3-provider");
  var fs = require('fs');
  var config = {
    walletfile: '../scripts/wallet.json',
    walletpassword: 'test'
  };



  var provider;


  var contents = JSON.stringify(require(config.walletfile));
  var global_keystore = lightwallet.keystore.deserialize(contents);

  global_keystore.passwordProvider = function(callback) {
    callback(null, 'test');
  };


  ///console.log(lightwallet.keystore);
  ///process.exit();

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
    host: 'http://109.123.70.141:8545',
    //host: 'http://localhost:8545',
    //host: 'https://morden.infura.io/fNrdKYnEHWqldP4JnWZp',
    //host: 'https://mainnet.infura.io/fNrdKYnEHWqldP4JnWZp',
    transaction_signer: global_keystore
  });

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
      gas: 2500000
    }
  }
