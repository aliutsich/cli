#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');
var ProgressBar = require('progress');


/*
 * Run sub-command hanles initializing and stopping ipfs and geth processes.
 * The processes are started with handler parent processes that allow the CLI to interface with them over sockets
 */

program
  .command('run')
    .option('-a, --address <address>', 'Ethereum account address')
    .option('-t, --testnet', 'Set to run on test net')
    .action(function(options) 
    {
      var statusCbk = function(status){console.log(status)};
	  var syncCbk = function(web3Sync)
	  {
		var startBlock = web3Sync.currentBlock;
		var lastBlock = startBlock;
		console.log('syncCbk, startBlock = '+startBlock+', lastBlock = '+lastBlock);
		//progress bar object
		var bar = new ProgressBar('  downloading [:bar] :percent :etas', {
    			complete: '=',
    			incomplete: ' ',
    			width: 60,
    			total: web3Sync.highestBlock
  		});
		console.log('progress bar initialized');
		//wrapper around prog bar obj
		var syncBar =  {
	       	'sync': web3Sync, 
	        'bar': bar,
			'start': startBlock
		};
		//called on interval to update prog bar
		var _syncCheck = function() {		
			if (syncBar)
			{
				syncBar.bar.tick(syncBar.sync.currentBlock - lastBlock);
  				lastBlock = syncBar.sync.currentBlock;
				if (syncBar.bar.complete) 
				{
    				console.log('\nSync Complete! Ready.\n');
					process.exit(0);
  				}
			}
		};
		
		console.log('highestBlock: '+ web3Sync.highestBlock+' currentBlock: '+web3Sync.currentBlock);
	
		//start interval
 		var _syncCheckInt = setInterval(_syncCheck, 200);
	  };

	  co(function *()
      { 
          var pass = yield prompt.password('Enter password for this address: ');
          nebulis.spawnNode(options.address, pass, options.testnet, statusCbk, syncCbk);
       });
    });	


program
  .command('new')
    .option('-w, -who','Creates a new who contract and returns the address.')
    .option('-c, -cluster','Creates a new cluster contract')
    .option('-z, -zone','Creates a new cluster contract')
    .action(function(options)
    {
      console.log('Creating a new who contract');
    });




program
  .command('list')
    .option('','')
    .action(function(options)
    {

    });




program.parse(process.argv);



/* Subcommand template
program
  .command('')
    .option('','')
    .action(function(options)
    {

    });

*/
