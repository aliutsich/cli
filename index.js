#!/usr/bin/env node

var program = require('commander');
var Web3 = require('web3');
var fs = require('fs');
var nebulis = require('nebulis');

//init web3
if (typeof(web3) !== 'undefined')
{
	console.log('web3 already defined');
	web3 = new Web3(web3.currentProvider);
}
else
{
	var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

program
  .arguments('<file>')
  .option('-u, --username <username>', 'The user to authenticate as')
  .option('-p, --password <password>', 'The user\'s password')
  .action(function(file) {
    console.log('user: %s pass: %s file: %s',
        program.username, program.password, file);
  })
  .parse(process.argv);
