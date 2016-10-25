//require deps
var fs = require('fs');
var Web3 = require('web3');
var child = require('child_process');
var net = require('net');
var ProgressBar = require('progress');
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

function Nebulis()
{
	//safe pointer to this object, use instead of 'this' keyword when inside callbacks
	var pointer = this; 

	/**
	*	Start a geth node to run in the background
	*	@param address the address to unlock
	*	@param password the password associated with address
	*	@param isTest {boolean} if true will run geth on testnet
	*/
	this.spawnNode = function(address, password, isTest)
	{
		//options to start geth w/
		var geth_params = [ '--rpc','--unlock', address, '--password', password];
		if (isTest)
		{
			geth_params.push('--testnet');
			console.log('starting geth on testnet...');
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
		console.log('Geth node runner started with pid: '+gethRunner.pid+' on port:'+ gethRunnerPort);
		
		setTimeout(function()
		{
			var isSync = false;
			var isRpc = false;
			var syncBar;
			var lastBlock;
            var _syncCheckInt;

			//connect to gethRunner proc
			var connection = net.connect({port: 8536}, onConnect);
		}, 1000);
		
		var onConnect = function()
		{
			console.log('Connected to geth');
			var _syncCheck = function() {		
				if (syncBar)
				{
					syncBar.bar.tick(syncBar.sync.currentBlock - lastBlock);
  					if (syncBar.bar.complete) 
					{
    					console.log('\nSync Complete! Ready.\n');
						process.exit(0);
  					}
				}
			};
			       
			connection.on('data', (data) => {
  				//console.log(data.toString());
					
				//check for sync started
				if(data.toString().includes('Block synchronisation started'))
				{
					console.log('Syncing ethereum node...\n');
					isSync = true;
				}
				//check for geth rpc server
				if(data.toString().includes('HTTP endpoint opened'))
				{
					console.log('RPC HTTP endpoint started.\n');
					isRpc = true;
				}
		
				if (isSync && isRpc)
				{
       				syncBar = startSyncProgress(); // the function to run once all flags are true
					lastBlock = syncBar.start;
 					_syncCheckInt = setInterval(_syncCheck, 200);
				}
			});
		}

		gethRunner.unref();
	}

	/**
	*	@private
	*	Begin keeping track of block download progress
	*/
	function startSyncProgress()
	{
		console.log('creating sync bar');
		
		var attempts = 0;
		var sync;
		while(attempts <= 10 && !sync)
		{
			sync = web3.eth.syncing;
			attempts++; 
		}
		if (attempts === 11)
		{
			console.log("Error: Unable to sync Ethereum node");
			process.exit(-1);
		}
		var bar = new ProgressBar('  downloading [:bar] :percent :etas', {
    			complete: '=',
    			incomplete: ' ',
    			width: 30,
    			total: sync.highestBlock
  		});
		console.log('highestBlock: '+ sync.highestBlock+' currentBlock'+sync.currentBlock);
		var startBlock = sync.currentBlock;
		bar.tick(startBlock);	
		return {
	       	'sync': sync, 
	        'bar': bar,
			'start': startBlock
		};

	};
}

