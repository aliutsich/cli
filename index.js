#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');

program
  .option('-a, --address <address>', 'Ethereum account address')
  .option('-t, --test <testnet>', 'Set to run on test net')
  .command('run')
  .action(function() 
  {
  	co(function *()
		{
			var testnet = false;
			if (program.testnet)
			{
				console.log('setting testnet to true');
				testnet = true;	
			}
			var pass = yield prompt.password('Enter password for this address: ');
			nebulis.spawnNode(program.address, pass, testnet);
		});	
  });

program.parse(process.argv);
