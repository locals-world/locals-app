  var lightwallet = require('eth-lightwallet');
  var HookedWeb3Provider = require("hooked-web3-provider");
  var fs = require('fs');
  var config = {
    walletfile: '../scripts/wallet2.json',
    walletpassword: 'test'
  };



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

      var privatekey = global_keystore.exportPrivateKey(account, pwDerivedKey);
      console.log('your PK = ', privatekey);

      console.log('now send this guy some ether in your geth client please');
      console.log("eth.sendTransaction({from:eth.coinbase, to:'" + global_keystore.getAddresses()[0] + "',value: web3.toWei(500, \"ether\")})");
      console.log("eth.sendTransaction({from:eth.coinbase, to:'" + global_keystore.getAddresses()[1] + "',value: web3.toWei(500, \"ether\")})");

      console.log("Goodbye!");
      process.exit();
    });
  } else {
    console.log(config.walletfile, 'already exists');
    console.log('nothing to do.')
  }