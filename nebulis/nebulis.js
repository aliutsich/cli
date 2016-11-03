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


	/** @private
	*
	*	generic function to initialize a web3.eth.contract object
	*	@param abi the abi array for the contract
	*	@param data either an address for an existing contract or 
	*		an object containing data for deploying a new contract
	*	@param cbk a callback function to pass the initialized contract to
	*/	
	var initContract = function(abi, data, cbk)
	{
		var contract = web3.eth.contract(abi);
		if (typeof(data) !== 'object')
		{
			contract = contract.at(address);
			cbk(contract);
		}
		else
		{
			//deploy new
			var contractParams = {
				from: data.fromAddr,
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
						cbk(err);
					}
					else if (theContract.address)
					{
						//contract has been mined
						cbk(theContract);
					}
					else
					{
						//report the transaction hash somehow
						//theContract.transactionHash
					}
				});
		}
	};

}

