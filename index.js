#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');

program
  .command('run')
  .option('-a, --address <Ethereum Address>', 'Ethereum account address')
  .option('-t, --test <is test>', 'Set to run on test net')
  .action(function() 
  {
  	co(function *()
		{
			var testnet = false;
			if (program.test)
			{
				console.log('setting testnet to true');
				testnet = true;	
			}
			var pass = yield prompt.password('Enter password for this address: ');
			nebulis.spawnNode(program.address, pass, testnet);
		});	
  });
  
program.parse(process.argv);
