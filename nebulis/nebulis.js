//require deps
var fs = require('fs');
var Web3 = require('web3');
var child = require('child_process');
var net = require('net');
var ProgressBar = require('progress');
var _ = require('underscore');

//init web3, check if there's one floating around already
if (typeof(web3) !== 'undefined')
{
	console.log('web3 already defined');
	web3 = new Web3(web3.currentProvider);
}
else
{
	var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

//exports
var exports = module.exports = new Nebulis();

/**
*	Constructor
*	@param Abi the abi array for the Nebulis contract
*	@param Address the address of the Nebulis contract 
*/
function Nebulis()
{
	//safe pointer to this object, use instead of 'this' keyword when inside callbacks
	var pointer = this; 
	
	//convenience handle to the Nebulis contract
	var nebulisContract = null;
	
	/**
	*	Start a geth node to run in the background
	*	@param address the address to unlock
	*	@param password the password associated with address
	*	@param isTest {boolean} if true will run geth on testnet
	*	@param statusCbk callback to send log messages to
	*	@param syncCbk callback to pass accessor to web3.eth.syncing to
	*/
	this.spawnNode = function(address, password, isTest, statusCbk, syncCbk)
	{
		//options to start geth w/
		var geth_params = [ '--rpc','--unlock', address, '--password', password];
		if (isTest)
		{
			geth_params.push('--testnet');
			statusCbk('starting geth on testnet...');
		}
		//port geth runner will serve from
		var gethRunnerPort = '8536';
		
		//params to init node process w/
		var gethRunnerParams = ['node_modules/nebulis/gethRunner.js', gethRunnerPort];
		var options = {detached: true, stdio: 'ignore'};
		
		//geth runner params + geth params
		var params = gethRunnerParams.concat(geth_params);
		
		//spawn gethrunner proc
		var gethRunner = child.spawn('node', params, options);
		statusCbk('Geth node runner started with pid: '+gethRunner.pid+' on port:'+ gethRunnerPort);
	
		var onConnect = function()
		{
			statusCbk('Connected to geth');
			var isSync=false, isRpc=false, syncStarted=false;       
			connection.on('data', (data) => {
  				//console.log(data.toString());
					
				//check for sync started
				if(data.toString().includes('Block synchronisation started'))
				{
					statusCbk('Block synchronisation started...\n');
					isSync = true;
				}
				//check for geth rpc server
				if(data.toString().includes('HTTP endpoint opened'))
				{
					statusCbk('RPC HTTP endpoint started...\n');
					isRpc = true;
				}
				//set up sync tracking
				if (isSync && isRpc && !syncStarted)
				{
					syncStarted = true;
					statusCbk('Using coinbase: '+web3.eth.coinbase );
       				startSyncProgress();
				}
			});
		};

		var connection;
		
		setTimeout(function()
		{
			//connect to gethRunner proc
			connection = net.connect({port: 8536}, onConnect);
		}, 1000);

		gethRunner.unref();
		
		/**
		*	@private
		*	Begin keeping track of block download progress
		*/
		function startSyncProgress()
		{
			statusCbk('Starting sync tracking...');
			connection.end();
			
			while(!web3.eth.syncing)
			{
				statusCbk('Sync object not ready...');
			//	process.exit(0);
			}
			statusCbk('Not already sync\'d');	
			syncCbk(function(property)
				{
					return web3.eth.syncing[property];
				});
		}
	
	};

	/**	
	*	Generic function to create a new entity in the Nebulis ecosystem
	*	@param type the type of entity to create
	*		-'who', 'cluster', or 'zone'
	*	@param {Array} params the parameters to pass to the contract constructor
	*	@param gas the amount of gas with which to make the transaction
	*	@param from the address from which to send the transaction
	*	@param cbk a function to which to send the new contract 
	*/
	this.createNew = function(type, params, gas, from, cbk)
	{
		var doCreate = function()
		{
			switch(type.toLowerCase())
			{
				case 'who':
					createNewWho(gas, from, params, cbk);
				break;
				case 'cluster':
					createNewCluster(params, cbk);
				break;
				case 'zone':
					createNewZone(params, cbk);
				break;
			}
		};
		//Make sure we're attached to Nebulis
		if (nebulisContract)
		{
			 doCreate();
		}
		else
		{
			//get abi for nebulis contract
			let abi = [];
			//get address
			let address = '';
			
			initContract(abi, address, function(err, nc)
				{
					if (err)
					{
						cbk(err, null);
					}
					else
					{
						nebulisContract = nc;
						doCreate();
					}
				});
		}	
	};
	
	/** @private
	*	
	*	Create a new "who" contract
	*	@param gas the amount of gas with which to make the deploy transaction
	*	@param from the address of the owner of the new contract
	*	@param params the parameters to pass to the who constructor
	*	@param cbk a callback function to which to pass the address of the new contract
	*/
	var newWho = function(gas, from, params, cbk)
	{
		//get abi for who contract
		var abi = [];
		
		//get byte code
		var code = '';

		//set params like so: neb address, name, email, company, whois address
		var paramArray = [];
		paramArray.push(nebulisContract.address);
		paramArray.push(params.name || '');
		paramArray.push(params.email || '');
		paramArray.push(params.company || '');
		if (!params.whois)
		{
			cbk('No Whois address provided', null);
			return;
		}
		paramArray.push(params.whois);

		var contractData = {
			code: code,
			fromAddr: from,
			gasAmount: gas,
			params: paramArray
		};
			

		deployContract(abi, contractData, cbk);
	};
	
	/** @private
	*
	*	Create a new "cluster" contract
	*/
	var newCluster = function(params, cbk)
	{

	};
	
	/** @private
	*
	*	Create a new "zone" contract
	*/
	var newZone = function(params, cbk)
	{

	};

	/** @private
	*
	*	attach to an existing contract and return the web3 contract object
	*	@param abi the abi array for the contract
	*	@param addr an address for the contract
	*	@param cbk a callback function to pass the initialized contract to
	*/	
	var initContract = function(abi, addr, cbk)
	{
		var contract = web3.eth.contract(abi);
		contract = contract.at(addr);
		if (contract)
		{
			cbk('', contract);
		}
		else
		{
			cbk('Error attaching to the Nebulis contract, check the address provided', null);
		}
	};

	/**	@private
	*	mine a new contract on the chain
	*	@param abi the abi array for the contract
	*	@param data an object containing data regarding the contract's creation
	*		-required properties are: 
	*			code - the byte code of the contract
	*			gasAmount - the amount of gas to send with the transaction
	*		-optional property:
	*			fromAddr - the address from which to send the transaction,
	*					defaults to web3 coinbase
	*	@param cbk a callback function to which to send the created web3 contract object
	*/
	var deployContract = function(abi, data, cbk)
	{
		var contractParams = {
			from: data.fromAddr || web3.eth.coinbase, //default to coinbase
			data:  data.code,
			gas: data.gasAmount
		};
		
		var constructor = contract.new;
		var constructorParams = data.params;
		for (let i = 0; i < constructorParams.length; i++)
    	{
    		constructor = _.partial(constructor, constructorParams[i]);
    	}	
		
		constructor(contractParams, function(err, theContract)
			{
				if (err)
				{
					//handle it
					cbk(err, null);
				}
				else if (theContract.address)
				{
					//contract has been mined
					cbk('', theContract);
				}
				else
				{
					//report the transaction hash somehow
					//theContract.transactionHash
				}
			});
	};

}

