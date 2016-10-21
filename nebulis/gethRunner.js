var net = require('net');
var childProc = require('child_process');
process.stdout.write(process.argv.join());

console.log('port before parse = '+process.argv[1]);
const PORT = parseInt(process.argv[2], 10); 
console.log('port = '+PORT);
var params = process.argv.splice(0, 2);
var options = {stdio: ['ignore', 'ignore', 'ignore']};

var serv = net.createServer(conn=>{

	var geth = childProc.spawn('geth', params, options);
	conn.on('data', function()
	{
		
	});
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
