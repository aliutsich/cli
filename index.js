#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var nebulis = require('nebulis');
var co = require('co');
var prompt = require('co-prompt');



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
      co(function *()
      { 
          var pass = yield prompt.password('Enter password for this address: ');
          nebulis.spawnNode(options.address, pass, options.testnet);
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
