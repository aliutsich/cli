//require deps
var fs = require('fs');
var Web3 = require('web3');
var child = require('child_process');
//init web3, check if there's one floating around already
if (typeof(web3) !== 'undefined')
{
	console.log('web3 already defined');
	web3 = new Web3(web3.currentProvider);
}
else
{
	var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

//exports
var exports = module.exports = new Nebulis();

function Nebulis()
{
	//safe pointer to this object, use instead of 'this' keyword when inside callbacks
	var pointer = this; 

	//declare public functions as this.pubFunc = ...
	this.sayHello = function()
	{
		console.log('hello you');
	};
	
	//declare private functions as function() or var function = ...
	function fuckOff()
	{
		console.log('fuck off');
	}
	this.spawnNode = function(address, password)
	{
		var params = [ '--rpc','--unlock', address, '--password', password];
		var options = {detached: true, stdio: ['ignore', 'pipe', 'pipe' ]};
		var geth = child.spawn('geth', params, options);
		console.log('Geth node started with pid: '+geth.pid);
	}
}

