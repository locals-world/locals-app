## Locals
###What is Locals?
Locals is the tool belt to interact with, create and sustain a local community. It’s a decentralised app, running on the Ethereum blockchain and IPFS (the Inter-Planetary File System). Going from hierarchical to decentralised systems, Locals wants to be the solution for local organisations and governments. Using Locals, a community can operate autonomously, on a fair basis, where every entity has the same opportunities and rights.
![](https://raw.githubusercontent.com/locals-world/locals-project/master/promo-images/decentralised-locals.png)


###Smart contracts, simple interface.
Locals aims to bring decentralised technology to a mainstream audience by using an inuitive user interface and colourful visual style. Without having any knowledge of blockchain technology, Locals’ users can easily interact with smart contracts on the Ethereum blockchain.
![](https://raw.githubusercontent.com/locals-world/locals-project/master/promo-images/smartcontracts-locals.png)


#Getting started

## Truffle 
### Deploying the contracts

Make sure to install the latest dev snapshot of truffle 

``sudo npm install -g https://github.com/ConsenSys/truffle``

``cd truffle``

Now check your truffle.js + the host to see if you are on the testnet or the mainnet or testrpc
(You also will need the wallet.json that will be used to create the contracts. This wallet's first account needs the neccesary GAS to complete the transactions )

``truffle compile``

``truffle migrate`` ( or ``truffle migate --reset`` if you want to start over)

### minting tokens
(You will need the wallet.json that will be used to create the contracts. This wallet's first account needs the neccesary GAS to complete the transactions )

`` truffle exec ./scripts/mint.js <0x___destination_account__> <amount of tokens>``


