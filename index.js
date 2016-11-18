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
		params.name = options.name || '*';
		params.email = options.email || '*';
		params.company = options.company || '*';
		params.gas = options.gas || DEFAULT_GAS_AMNT;
	
		nebulis.createNew('who', params, function(err, result)
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
		params.gas = options.gas || DEFAULT_GAS_AMNT;
		
		nebulis.createNew('kernel', params, function(err, result)
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
		params.gas = options.gas || DEFAULT_GAS_AMNT;

		nebulis.createNew('cluster', params, function(err, result)
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
	
		params.gas = options.gas || DEFAULT_GAS_AMNT;	
	
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

program.command('list-balance')
	.description('Display the balance of a given Who contract')
	.option('-a, --address', 'The address of the who contract.  Defaults to that associated with the running node')
    .action(function(options)
    {
		nebulis.list('balance', {address: options.address || null}, function(err, result)
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
	.option('-a, --address <address>', 'The address to look up, defaults to address associated with currently running node')
	.option('-v, --verbose', 'If set will retrieve contact info as well as the address of the who contract')
	.action(function(options)
	{
		var params = {
			 address: options.address || null,
			 verbose: !!options.verbose
		};
		nebulis.list('who', params, function(err, result)
			{
				if (err)
				{
					console.log('Error: '+err);
				}
				else
				{
					console.log('Found who contract: ');
					console.log('	-address: '+result.address);
					if (options.verbose)
					{
						console.log('	-name: '+(result.name ? result.name : '<none>'));
						console.log('	-email: '+(result.email ? result.email : '<none>'));
						console.log('	-company: '+(result.company ? result.company : '<none>'));
					}
				}		
			});
	});

program.command('list-domains')
	.description('Display the domains owned by the given Who contract')
	.option('-a, --address <who-address>', 'The address of the who contract.  Defaults to that associated with the running node')
	.action(function(options)
	{
		nebulis.list('domains', {address: options.address || null}, function(err, result)
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


//-------- 'Void' commands -------//

program.command('void-who <who-address>')
	.description('Delete a who contract')
	.option('-g, --gas <gas-amount>', 'The amount of gas with which to make the transaction')
	.action(function(who, options)
	{
		var params = {};
		params.who = who;
		params.gas = options.gas || DEFAULT_GAS_AMNT;

		nebulis.void('who', params, function(err, result)
			{
				if (err)
				{
					console.log('Error deleting who: '+err);
				}
				else
				{
					console.log(result);
				}
			});
	});

program.command('void-domain <ipa>')
	.description('Eject a registered domain')
	.option('-g, --gas <gas-amount>', 'The amount of gas with which to make the transaction)
	.option('-o, --owner <owner-address>', 'The address of the who contract in charge of the domain. '+
			'Defaults to that associated with the running node')
	.action(function(ipa, options)
	{
		var params = {};
		params.owner = options.owner || null;
		params.gas = options.gas || DEFAULT_GAS_AMNT;

		nebulis.void('domain', params, function(err, result)
			{
				if (err)
				{
					console.log('Error deleting domain: '+err, null);
				}
				else
				{
					console.log(result);
				}
			});
	});


//-------- Other stuff  ---------//

program.command('contribute <kernel-name> <amount>')
	.description('Contribute dust to a kernel')
	.option('-g, --gas <gas-amount>', 'The amount of gas with which to make the transaction')
	.option('-f, --from <from-address>', 'The address of the who contract from which to contribute')
	.action(function(name, amount, options)
	{
		var params = {};
		params.from = options.from || null;
		params.kernelName = name;
		params.dustAmt = amount;
		params.gas = options.gas || DEFAULT_GAS_AMNT;
		
		nebulis.contribute(params, function(err, result)	
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

program.command('transfer <ipa> <domain> <to-address>')
	.description('Transfer ownership of a domain')
	.option('-g, --gas <gas-amount>', 'The amount of gas with which to make the transaction')
	.option('-f, --from <from-address>', 'The address of the who contract from which to transfer the domain.  '+
			' Defaults to that owned by the currently running node')
	.action(function(ipa, domain, to, options)
	{
		var params = {};
		params.ipa = ipa;
		params.domain = domain;
		params.to = to;
		params.from = options.from || null;
		params.gas = options.gas || DEFAULT_GAS_AMNT;

		nebulis.transfer(params, function(err, result)
			{	
				if (err)
				{
					console.log('error transferring domain: '+err);
				}
				else
				{
					console.log(result);
				}
			});
	});

program.command('set-creds')
	.description('Set credentials associated with an IPA or who account')
	.option('-g, --gas <gas-amount>', 'The amount of gas with which to make the transaction')
	.option('-n, --name <name>', 'The name to set')
	.option('-e, --email <email>', 'The email address to set')
	.option('-c, --company <company>', 'The company name to set')
	.option('-i, --ipa <ipa>', 'The IPA to set credentials for.  If omitted the credentials will be set globally')
	.option('-w, --who <who-address>', 'The address of the Who contract to set credentials for.  '+
			'Defaults to that associated with the currently running node');
	.action(function(options)
	{
		var params = {};
		params.name = options.name || '*';
		params.email = options.email || '*';
		params.company = options.company || '*';
		params.ipa = options.ipa || null;
		params.who = options.who || null;
		params.gas = options.gas || DEFAULT_GAS_AMNT;

		nebulis.setCredentials(params, function(err, result)
			{
				if (err)
				{
					console.log('Error setting credentials: '+err);
				}
				else
				{
					console.log(result);
				}
			});
	});

program.command('get-creds')
	.description('Get the name, email address, and company associated with the given IPA or who contract')
	.option('-w, --who <who-address>', 'The who contract address to get credentials from.  '+
		'Defaults to that associated with the currently running node')
	.option('-i, --ipa <ipa>', 'The IPA to get credentials from.  If unset, global who credentials will be retrieved')
	.action(function(options)
	{
		nebulis.getCredentials(options.who, options.ipa, function(err, result)
			{
				if (err)
				{
					console.log('Error retrieving credentials'+err);
				}
				else
				{
					if (options.ipa)
						console.log('Got credentials for IPA '+ipa+': ');
					else
						console.log('Got global credentials: '

					console.log('	-Name: '+(result.name || '*'));
					console.log('	-Email: '+(result.email || '*'));
					console.log('	-Company: '+(result.company || '*'));
				}
			});
	});

program.command('get-owner <ipa>')
	.description('Get information about the owner of a given IPA')
	.option('-v, --verbose', 'If set, will retrieve contact info about the owner in addition to the who contract address')
	.action(function(ipa, options)
	{
		var params = {
			'ipa': ipa,
			'verbose': options.verbose || null
		};

		nebulis.getOwner(params, function(err, result)
			{
				if (err)
				{
					if (err === 'Found address only')
					{
						console.log(ipa+' is owned by '+result.owner);
						console.log('Couldn\'t find any other info');
					}
					else
					{
						console.log('Error: '+err);
					}
				}
				else
				{
					console.log(ipa+' is owned by '+result.owner);
					if (options.verbose)
					{
						console.log('	-Name: '+result.name);
						console.log('	-Email: '+result.email);
						console.log('	-Company: '+result.company);
					}
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
