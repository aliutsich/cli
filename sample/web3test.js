	var program = require('commander');
	var Web3 = require('web3');
    if (typeof(web3) !== 'undefined')
	{
		console.log('web3 already defined');
		web3 = new Web3(web3.currentProvider);
	}
	else
	{
		var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
    }

   var abi = [
	{"constant":true, 
	 "inputs": 
	 [ 
		{"name":"a","type":"uint256"}
	 ],
	 "name":"multiply",
	 "outputs":
	 [
		{"name":"d","type":"uint256","value":"0"}
	 ],
	 "payable":false,
	 "type":"function"}
	];
	

   var myContract;
   var contractInstance;
   function createExampleContract() 
   {
        console.log('creating contract using default account = '+web3.eth.coinbase);
		// let's assume that coinbase is our account
        web3.eth.defaultAccount = web3.eth.coinbase;
		myContract = web3.eth.contract(abi);
		contractInstance = myContract.at('0x1a935bb4732d835046822e908ea26A84F6971734');
   }

   function callExampleContract(param) 
   {
       console.log('input: '+param);
	   // call the contract
       var res = contractInstance.multiply(param);
       console.log('output: '+res.toString());
   }

   createExampleContract();

  program
  .arguments('<num>')
  .action(function(num) 
  {
	callExampleContract(num);
  })
  .parse(process.argv);

