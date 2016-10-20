#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');

program
  .command('run')
  .option('-a, --address <Ethereum Address>', 'Ethereum account address')
  .action(function() 
  {
  	co(function *()
		{
			var pass = yield prompt.password('Enter password for this address: ');
			nebulis.spawnNode(program.address, pass);
		});	
  });
  
program.parse(process.argv);
