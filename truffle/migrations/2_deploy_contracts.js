module.exports = function(deployer) {

 // function localsCointoken(
 //        uint256 initialSupply,
 //        string tokenName,
 //        uint8 decimalUnits,
 //        uint256 _minEthbalance,
 //        string tokenSymbol,
 //        string versionOfTheCode


  deployer.deploy(localsCointoken,0,'LocalCoin',2,0.1,'Δ','1');
};
