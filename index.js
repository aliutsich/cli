#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');

program
  .command('run')
    .option('-a, --address <address>', 'Ethereum account address')
    .option('-t, --testnet', 'Set to run on test net')
    .action(function(options) 
    {
      co(function *()
      { 
          var pass = yield prompt.password('Enter password for this address: ');
          nebulis.spawnNode(options.address, pass, options.testnet);
       });
    });	

program.parse(process.argv);
