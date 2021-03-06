var net = require('net');
var web3 = require('web3');
var childProc = require('child_process');

//process.stdout.write(process.argv.join());
const PORT = parseInt(process.argv[2], 10); 
var params = process.argv.splice(3, process.argv.length);
var options = {stdio: ['pipe', 'pipe', 'pipe']};
process.stdout.write(params.join());

var serv = net.createServer(conn=>{

	var geth = childProc.spawn('geth', params, options);
	conn.on('data', function()
	{
		
	});
	conn.on('end', function(){});
	conn.on('close', function(){});
	conn.on('error', function(){});
 	geth.stdout.on('data', function(output)
	{
		conn.write('geth stdout: '+JSON.stringify(output.toString('utf8')));
	});
	geth.stderr.on('data', function(err)
	{
		
		conn.write('geth stderr: '+JSON.stringify(err.toString('utf8')));
		
	});
});

serv.listen({port: PORT, host: 'localhost'});
