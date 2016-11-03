#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');
var ProgressBar = require('progress');

//init Nebulis module

/*
 * Run sub-command hanles initializing and stopping ipfs and geth processes.
 * The processes are started with handler parent processes that allow the CLI to interface with them over sockets
 */

program
  .command('run')
	.description('Start a background geth node')
    .option('-a, --address <address>', 'Ethereum account address')
    .option('-t, --testnet', 'Set to run on test net')
    .action(function(options) 
    {
      var statusCbk = function(status){console.log(status)};
	  var syncCbk = function(web3Cbk)
	  {
		var startBlock = web3Cbk('currentBlock');
		var lastBlock = startBlock;
		var highestBlock = web3Cbk('highestBlock');
		console.log('syncCbk, startBlock = '+startBlock+', lastBlock = '+lastBlock);
		//progress bar object
		var bar = new ProgressBar('  downloading [:bar] :percent :etas', {
    			complete: '=',
    			incomplete: ' ',
    			width: 60,
    			total: highestBlock
  		});
		console.log('progress bar initialized');
		//wrapper around prog bar obj
		var syncBar =  {
	       	'sync': true, 
	        'bar': bar,
			'start': startBlock
		};
		//called on interval to update prog bar
		var _syncCheck = function() {
		
			let current = web3Cbk('currentBlock');
			if (syncBar)
			{
				syncBar.bar.tick(current - lastBlock);
  				lastBlock = current;
				if (syncBar.bar.complete) 
				{
    				console.log('\nSync Complete! Ready.\n');
					process.exit(0);
  				}
			}
		};
		
		//console.log('highestBlock: '+ web3Cbk('highestBlock') + ' currentBlock: '+web3Cbk('currentBlock'));
	
		//start interval
 		var _syncCheckInt = setInterval(_syncCheck, 200);
	  };

	  co(function *()
      { 
          var pass = yield prompt.password('Enter password for this address: ');
          nebulis.spawnNode(options.address, pass, options.testnet, statusCbk, syncCbk);
       });
    });	

program.command('new-who <arg1> <arg2> <arg3>')
	.description('Create a new Who contract')
    .action(function(arg1, arg2, arg3)
    {
		
	});

program.command('new-cluster <name> <description> <guardians> <deposit> <code>')
	.description('Create a new cluster')
	.action(function(name, desc, guards, deposit, code)
	{
	
	});

program.command('new-zone <name> <description> <guardians> <deposit> <code>')
	.description('Create a new zone')
	.action(function(name, desc, guards, deposit, code)
	{
	
	});

program.command('list-balance <who-address>')
	.description('Display the balance of a given Who contract')
    .action(function(who)
    {

    });

program.command('list-who')
	.description('Display the Who contracts owned by the currently running node')
	.action(function()
	{
	
	});

program.command('list-domains <who-address>')
	.description('Display the domains owned by the given Who contract')
	.action(function()
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
