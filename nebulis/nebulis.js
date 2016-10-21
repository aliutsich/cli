//require deps
var fs = require('fs');
var Web3 = require('web3');
var child = require('child_process');
var net = require('net');
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
	this.spawnNode = function(address, password, isTest)
	{
		var geth_params = [ '--rpc','--unlock', address, '--password', password];
		if (isTest)
		{
			geth_params.push('--testnet');
			console.log('starting geth on testnet...');
		}
		var gethRunnerPort = '8535';
		var gethRunnerParams = ['gethRunner.js', gethRunnerPort];
		var options = {detached: true, stdio: ['pipe', 'pipe', 'pipe' ]};
		var params = gethRunnerParams.concat(geth_params);
		var gethRunner = child.spawn('node', params, options);
		console.log('Geth node runner started with pid: '+gethRunner.pid+' on port:'+ gethRunnerPort);
		gethRunner.unref();
		gethRunner.stdout.on('data', function(data)
		{
			console.log('here are teh params: '+JSON.stringify(data.toString('utf8')));
		});

		/*
		setTimeout(function()
			{
				var connection = net.connect({port: 8535}, () =>{
					console.log('Connected to the geth runner socket');
					connection.on('data', (data) => {
  						console.log(data.toString());
					});
				});
			}, 1000);
		*/
	}
}

