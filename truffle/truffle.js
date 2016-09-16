  var lightwallet = require('eth-lightwallet');
  var HookedWeb3Provider = require("hooked-web3-provider");

  var contents = JSON.stringify(require('../scripts/wallet.json'));
  var global_keystore = lightwallet.keystore.deserialize(contents);

  global_keystore.passwordProvider = function(callback) {
    callback(null, 'test');
  };

  // get the first account in this wallet
  var account = global_keystore.getAddresses()[0];
  console.log('deploy account = ',account);

  // create the provider
  var provider = new HookedWeb3Provider({
    //host: 'http://109.123.70.141:8545',
    //host: 'http://localhost:8545',
    host: 'https://morden.infura.io/fNrdKYnEHWqldP4JnWZp',
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
      gas: 1000000
    }
  }
