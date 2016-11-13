#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');
var ProgressBar = require('progress');

const DEFAULT_GAS_AMNT = 2000; //?good default val?

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

//------ Commands related to creating new Nebulis entities ------//

program.command('new-who')
	.description('Create a new Who contract')
	.option('-n, --name <name>', 'Your name (optional)')
	.option('-e, --email <email>', 'Your email address (optional)')
	.option('-c, --company <company>', 'Your company (optional');
	.option('-g, --gas <gas amount>', 
		'The amount of gas to send with the transaction (optional)');
    .action(function(options)
    {
		var params = {};
		params.name = options.name || '';
		params.email = options.email || '';
		params.company = options.company || '';
		var gas = options.gas || DEFAULT_GAS_AMNT;
	
		nebulis.createNew('who', params, gas, function(err, result)
			{
				if (err)
				{
					console.log('Error: '+err);
				}
				else
				{
					console.log('Who contract created at address: '+result);
				}
			}); 
	});

program.command('amass <name> <deposit>')
	.description('Create a new kernel')
	.option('-g, --gas <gas amount>', 'Amount of gas to send with the transaction')
	.option('-o, --owners <owners>', 'Owners of the new cluster, defaults to "who" contract owned by currently running node')
	.option('-p, --private', 'Sets the cluster as private')
	.action(function(name, deposit, options)
	{
		var params = {};
		//pre-process args
		params.owners = options.owners ? options.owners.split(',') : null;
		params.open = !options.private;
		params.name = name;
		params.deposit = deposit;
		var gas = options.gas || DEFAULT_GAS_AMNT;
		
		nebulis.createNew('kernel', params, gas, function(err, result)
			{
				if (err)
				{
					console.log('Error creating kernel: '+err);
				}
				else
				{
					console.log(result);
				}
			});	
	});

program.command('new-cluster <name>')
	.description('Create a new cluster from an existing kernel')
	.option('-g, --gas <gas-amount>', 'Amount of gas to send with the transaction')
	.action(function(name, options)
	{
		var params = {'name': name};
		var gas = options.gas || DEFAULT_GAS_AMNT;

		nebulis.createNew('cluster', params, gas, function(err, result)
			{
				if (err)
				{	
					console.log('Error creating cluster: '+err);
				}
				else
				{
					console.log(result);
				}
			});
	});

program.command('new-zone <name> <description> <guardians> <deposit> <code>')
	.description('Create a new zone')
	.action(function(name, desc, guards, deposit, code)
	{
	
	});

program.command('new-domain <cluster-name> <domain-name> <redirect-hash>')
	.description('Register a new domain')
	.option('-p, --priv', 'Sets the domain as private')
	.option('-w, --who <who-address>', 'The address of the who contract in charge of the domain.  Defaults to that owned by the running node')
	.option('-g, --gas <gas-amount>', 'Amount of gas to send with the transaction')
	.action(function(clusterName, domainName, redirect, options)
	{
		var params = {};
		params.clusterName = clusterName;
		params.domainName = domainName;
		params.redirect = redirect;
		params.publicity = !options.priv;
		
		if (options.who)
		{
			params.who = options.who;
		}		
	
		var gasAmnt = options.gas || 2000;	
	
		nebulis.createNew('domain', params, gasAmnt, function(err, result)
			{
				if (err)
				{
					console.log('Error: '+err);
				}
				else
				{
					console.log('Domain '+domainName+' registered successfully');
				}
			}); 
	}); 

//------- Commands related to fetching info about Nebulis entities -------//

program.command('list-balance <who-address>')
	.description('Display the balance of a given Who contract')
    .action(function(who)
    {
		nebulis.list('balance', who, function(err, result)
			{
				if (err)
				{
					console.log('Error: '+err);
				}
				else
				{
					console.log('Balance = '+result+' dust');	
				}
			}); 
    });

program.command('list-who')
	.description('Display the Who contracts owned by a given address')
	.option('-a, --address <address>', 'The address to look up, defaults to address associated with currently running node');
	.action(function(options)
	{
		var addr = options.address || null;
		nebulis.list('who', addr, function(err, result)
			{
				if (err)
				{
					console.log('Error: '+err);
				}
				else
				{
					console.log('Found who contract: ');
					console.log('	-address: '+result.address);
					console.log('	-name: '+(result.name ? result.name : '<none>'));
					console.log('	-email: '+(result.email ? result.email : '<none>'));
					console.log('	-company: '+(result.company ? result.company : '<none>'));
				}	
			});
	});

program.command('list-domains <who-address>')
	.description('Display the domains owned by the given Who contract')
	.action(function(who)
	{
		nebulis.list('domains', who, function(err, result)
			{
				if (err)
				{
					console.log('Error: '+err);
				}
				else
				{
					console.log('Found domains: ');
					for (let i = 0; i < result.length; i++)
					{
						console.log('	-'+result[i]);
					}
				}
			});
	});

//-------- Other stuff  ---------//

program.command('contribute <kernel-name> <amount>')
	.description('Contribute dust to a kernel')
	.option('-g, --gas <gas-amount>', 'The amount of gas with which to make the transaction');
	.option('-a, --address <who-address>', 'The address of the Who contract from which to contribute')
	.action(function(name, amount, options)
	{
		var params = {};
		params.address = options.address || null;
		params.kernelName = name;
		params.dustAmt = amount;

		var gas = options.gas || DEFAULT_GAS_AMNT;
		
		nebulis.contribute(params, gas, function(err, result)	
			{
				if (err)
				{
					console.log('Error: '+err);
				}
				else
				{
					console.log(result);
				}
			}); 
	});

program.parse(process.argv);


/* Subcommand template
program
  .command('<cmd name> <arg 1> <arg 2> ... <arg n>')
  .description('I am a command')
  .option('-<small flag>, --<big flag> [flag val]','flag description')
    .action(function(arg1, arg2, ..., options)
    {

    });

*/
