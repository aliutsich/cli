//require deps
var fs = require('fs');
var Web3 = require('web3');
var child = require('child_process');
var net = require('net');
var ProgressBar = require('progress');
var _ = require('underscore');

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

/**
*	Constructor
*/
function Nebulis()
{
	//safe pointer to this object, use instead of 'this' keyword when inside callbacks
	var pointer = this; 
	
	//convenience handle to the Nebulis contracts
	var nebulisContract = null;
	var dustContract = null;
	var whoisContract = null;
	
	const NEBULIS_ABI = [];
	const NEBULIS_ADDR = '';
	
	const DUST_ABI = [];
	const DUST_ADDR = '';
	
	const WHOIS_ABI = [];
	const WHO_ABI = [];
	const CLUSTER_ABI = [];
	
	/**
	*	Start a geth node to run in the background
	*	@param address the address to unlock
	*	@param password the password associated with address
	*	@param isTest {boolean} if true will run geth on testnet
	*	@param statusCbk callback to send log messages to
	*	@param syncCbk callback to pass accessor to web3.eth.syncing to
	*/
	this.spawnNode = function(address, password, isTest, statusCbk, syncCbk)
	{
		//options to start geth w/
		var geth_params = [ '--rpc','--unlock', address, '--password', password];
		if (isTest)
		{
			geth_params.push('--testnet');
			statusCbk('starting geth on testnet...');
		}
		//port geth runner will serve from
		var gethRunnerPort = '8536';
		
		//params to init node process w/
		var gethRunnerParams = ['node_modules/nebulis/gethRunner.js', gethRunnerPort];
		var options = {detached: true, stdio: 'ignore'};
		
		//geth runner params + geth params
		var params = gethRunnerParams.concat(geth_params);
		
		//spawn gethrunner proc
		var gethRunner = child.spawn('node', params, options);
		statusCbk('Geth node runner started with pid: '+gethRunner.pid+' on port:'+ gethRunnerPort);
	
		var onConnect = function()
		{
			statusCbk('Connected to geth');
			var isSync=false, isRpc=false, syncStarted=false;       
			connection.on('data', (data) => {
  				//console.log(data.toString());
					
				//check for sync started
				if(data.toString().includes('Block synchronisation started'))
				{
					statusCbk('Block synchronisation started...\n');
					isSync = true;
				}
				//check for geth rpc server
				if(data.toString().includes('HTTP endpoint opened'))
				{
					statusCbk('RPC HTTP endpoint started...\n');
					isRpc = true;
				}
				//set up sync tracking
				if (isSync && isRpc && !syncStarted)
				{
					syncStarted = true;
					statusCbk('Using coinbase: '+web3.eth.coinbase );
       				startSyncProgress();
				}
			});
		};

		var connection;
		
		setTimeout(function()
		{
			//connect to gethRunner proc
			connection = net.connect({port: 8536}, onConnect);
		}, 1000);

		gethRunner.unref();
		
		/**
		*	@private
		*	Begin keeping track of block download progress
		*/
		function startSyncProgress()
		{
			statusCbk('Starting sync tracking...');
			connection.end();
			
			while(!web3.eth.syncing)
			{
				statusCbk('Sync object not ready...');
			//	process.exit(0);
			}
			statusCbk('Not already sync\'d');	
			syncCbk(function(property)
				{
					return web3.eth.syncing[property];
				});
		}
	
	};

	/**	
	*	Generic function to create a new entity in the Nebulis ecosystem
	*	@param type the type of entity to create
	*		-'who', 'cluster', 'kernel', or 'zone'
	*	@param {Object} params the parameters to pass to the contract constructor
	*	@param gas the amount of gas with which to make the transaction
	*	@param cbk a function to which to send the new contract 
	*/
	this.createNew = function(type, params, gas, cbk)
	{
		switch(type.toLowerCase())
		{
			case 'who':
				newWho(gas, params, cbk);
			break;
			case 'kernel':
				newKernel(gas, params, cbk);
			break;
			case 'cluster':
				newCluster(gas, params, cbk);
			break;
			case 'zone':
				newZone(gas, params, cbk);
			break;
			case 'domain':
				newDomain(gas, params, cbk);
			break;
		}
	};

	/**
	*	Get various info from Nebulis
	*	@param listWhat what info to get
	*	@param address the address of the contract to query about
	*	@param cbk a function to send the result to
	*/
	this.list = function(listWhat, addr, cbk)
	{
		addr = addr || web3.eth.accounts[0];
		switch(listWhat.toLowerCase())
		{
			case 'balance':
				listBalance(addr, cbk);
			break;
			case 'domains':
				listDomains(addr, cbk);
			break;
			case 'who':
				listWho(addr, cbk);
			break;
		}
	};

	/**
	*	Delete various Nebulis entities
	*	@param type the type of entity to void
	*	@param params args to pass to the particular void function
	*	@params gasAmnt the amount of gas with which to make the transaction
	*	@params cbk a function to call with the success or err msg
	*/
	this.void = function(type, params, gasAmnt, cbk)
	{
		switch(type)
		{
			case 'who':
				voidWho(params, gasAmnt, cbk);	
			break;
			case 'domain':
				voidDomain(params, gasAmnt, cbk);
			break;
		}
	};

	/**
	*	Contribute dust to a kernel
	*	@param params an object containing args to pass to the nebulis.contribute contract function
	*	@param gasAmt the amount of gas to make the transaction with
	*	@param cbk a function to pass the result to
	*/
	this.contribute = function(params, gasAmt, cbk)
	{
		var doContribute = function()
		{
			let transObj = {gas: gasAmt, from: params.from};
			let encodedParams = hexEncodeArgs(params);
			let result = nebulisContract.Contribute(encodedParams.kernelName,
									   				encodedParams.dustAmt,
									   				transObj);
			if (result)
			{
				cbk(null, 'Contribution successful');
			}
			else
			{
				cbk('Error in making contribution', null);
			}
		};
		
		var getTheShowOnTheRoad = function()
		{
			if (nebulisContract)
			{
				doContribute();
			}
			else
			{
				initContract(NEBULIS_ABI, NEBULIS_ADDR, function(err, nc)
				{
					if (err)
					{
						cbk('Error connecting to Nebulis: '+err, null);
					}
					else
					{
						nebulisContract = nc;
						doContribute();
					}
				});
			}
		}

		if (params.from)
		{
			getTheShowOnTheRoad();
		}
		else
		{
			listWho(web3.eth.accounts[0], function(err, result)
			{
				if (err)
				{
					cbk('Error getting who address: '+err, null);
				}
				else
				{
					params.from = result.address;
					getTheShowOnTheRoad();
				}
			});
		}
	};

	/**
	*	Transfer a domain deed from one account to another
	*	@param params an object containing args to pass to the who.transfer contract function
	*	@param gasAmnt the amount of gas with which to make the transaction
	*	@param cbk a function to pass the result or err msg to
	*/
	this.transfer = function(params, gasAmnt, cbk)
	{
		var whoContract = null;
		
		var doTransfer = function()
		{
			let encodedParams = hexEncodeArgs(params);
			let transObj = {gas: gasAmnt}
			
			let result = whoContract.transfer(encodedParams.ipa,
											  encodedParams.domain,
											  encodedParams.to,
											  transObj);
			if (result)
			{
				cbk(null, 'Transfer successful');	
			}
			else
			{
				cbk('Error making transfer', null);
			}
		};
		
		var getTheShowOnTheRoad = function()
		{
			//connect to who contract
			initContract(WHO_ABI, params.from, function(err, who)
				{
					if (err)
					{
						cbk('Error connecting to who contract: '+err, null);
					}
					else
					{
						whoContract = who;
						doTransfer();
					}
				});
		}
		
		if (params.from)
		{
			getTheShowOnTheRoad();
		}
		else
		{
			//get who address
			listWho(web3.eth.accounts[0], function(err, result)
			{
				if (err)
				{
					cbk('Error getting who address: '+err, null);
				}
				else
				{
					params.from = result.address;
					getTheShowOnTheRoad();
				}
			});
		}
	};

	/**
	*	Set the credentials (name, email, and/or company) associated with an ipa or who contract
	*	@param params an object containing the credential values to set
	*	@param gasAmnt the amount of gas with which to make the transaction
	*	@param cbk a function to pass the success or error msg to
	*/
	this.setCredentials = function(params, gasAmnt, cbk)
	{
		var who = null;
	
		var doSetCreds = function()
		{
			let transObj = {gas: gasAmnt};
			let params.global = !params.ipa;
			let params.ipa = params.ipa || '*';
			let encodedParams = hexEncodeArgs(params);
			
			let result = who.setCredentials(encodedParams.global,
									   	    encodedParams.ipa,
							  		 		encodedParams.name,
							   				encodedParams.email,
							   				encodedParams.company,
							   				transObj);
			if (result)
			{
				cbk(null, 'Credentials set successfully');
			}
			else
			{
				cbk('Error setting credentials', null);
			}				
		}

		var getTheShowOnTheRoad = function()
		{
			initContract(WHO_ABI, params.who, function(err, w)
				{
					if (err)
					{
						cbk('Error connecting to who contract: '+err);
					}
					else
					{
						who = w;
						doSetCreds();
					}
				});
		}
		
		if (params.who)
		{
			getTheShowOnTheRoad()
		}
		else
		{
			listWho(web3.eth.accounts[0], function(err, result)
			{
				if (err)
				{
					cbk('Error getting who address: '+err, null);
				}
				else
				{
					params.who = result.address;
					getTheShowOnTheRoad();
				}
			});
		}		
	};

	/**
	*	Get the credentials (name, email, company) associated with an IPA
	*	@param whoAddr the who contract address to retrieve the credentials from.
	*	@param ipa the ipa to retrieve the credentials for
	*	@param cbk a function to pass the result or error msg to
	*/
	this.getCredentials = function(whoAddr, ipa, cbk)
	{
		var who = null;

		var doGetCreds = function()
		{
			let creds = who.getCredentials(web3.toHex(ipa));
			if (creds)
			{
				cbk(null, {'name':creds[0], 'email':creds[1], 'company':creds[2]});
			}	
			else
			{
				cbk('Error retrieving credentials; they may be private', null);
			}
		};

		var getTheShowOnTheRoad = function()
		{
			initContract(WHO_ABI, whoAddr, function(err, w)
				{
					if (err)
					{
						cbk('Error connecting to who contract: '+err, null);
					}
					else
					{
						who = w;
						doSetCreds();
					}
				});
		};

		if (whoAddr)
		{
			getTheShowOnTheRoad();
		}
		else
		{
			listWho(web3.eth.accounts[0], function(err, result)
			{
				if (err)
				{
					cbk('Error getting who address: '+err, null);
				}
				else
				{
					whoAddr = result.address;
					getTheShowOnTheRoad();
				}
			});
		}
	};


/*****************************************************

<<<<<<<<< Private functions from here on >>>>>>>>>>>>>

*****************************************************/

//------- Various 'list' functions --------//
	
	/**	@private
	*
	*	List the dust balance of a who contract
	*	@param whoAddr the address of the who contract
	*	@param cbk a function to pass the result to 
	*/
	var listBalance = function(whoAddr, cbk)
	{
		var doListBalance = function()
		{
			let balance;
			//need access to Dust's userBal mapping here
			//something like:
			//balance = dustContract.getUserBal(whoAddr);
			
			cbk(null, balance);		
		};
		
		if (dustContract)
		{
			doListBalance();
		}
		else
		{
			initContract(DUST_ABI, DUST_ADDR, function(err, dust)
				{
					if (err)
					{
						cbk(err, null);
					}
					else
					{
						dustContract = dust;
						doListBalance();
					}
				});
		}	
	};

	/** @private
	*
	*	List the domains owned by a who contract
	*	@param whoAddr the address of the who contract
	*	@param cbk a function to pass the result to
	*
	*/
	var listDomains = function(whoAddr, cbk)
	{
		//handle on who contract
		var whoContract = null;

		var doListDomains = function()
		{
			//get deeds from who contract
		}
	
		//attach to who contract
		initContract(WHO_ABI, whoAddr, function(err, who)
		{
			if (err)
			{
				cbk(err, null);
			}
			else
			{
				whoContract = who;
				doListDomains();
			}
		});	
	}
	
	/** @private
	 *	List all the who contracts attached to a particular ethereum account. Defaults to current running account
	 *	@param address optional parameter for 
	 *	@param cbk a callback function to give the who info to.
	 *
     */
	var listWho = function(ethAddress, cbk)
	{
		ethAddress = ethAddress || web3.eth.accounts[0];
		//address for whois
		var whoisAddress = '';
		//address for who
		var whoAddress;
		//handle to who contract object
		var who;
		//data object to return
		var whoAccount = {};
		
		var doListWho = function()
		{
			//get address of who contract
			let ethAddressHex = web3.toHex(ethAddress);
			whoAddress = whoisContract.whoDIS(ethAddressHex);
			if(whoAddress)
			{
				//attach to who contract
				initContract(WHO_ABI, whoAddress, function(err, wc)
					{
						if (err)
						{
							cbk(err, null);
						}
						else
						{
							who = wc;
							if(who)
							{
								let whoAddressHex = web3.toHex(whoAddress);
								//Don't think this function exists...
								let whoInfo = whoisContract.whoInfo.call(whoAddressHex);
								
								whoAccount = {name: whoInfo[0], email: whoInfo[1], company:whoInfo[2], address:whoAddress};
								cbk(null, whoAccount);	
							}
							else
							{
								cbk('ERROR: Unable to access who contract', null);
							}
						}
					});
			}
			else
			{
				cbk('ERROR: No who contract exists for this address.', null);
			}
		};

		if (whoisContract)
		{
			doListWho();
		}
		else
		{	
			//Get a whois contract reference
			initContract(WHOIS_ABI, whoisAddress ,function(err, wic)
				{
					if (err)
					{
						cbk(err, null);
					}
					else
					{
						whoisContract = wic;
						doListWho();
					}
				});
		}
	}

//------- Various 'new' functions ---------//

	/** @private
	*	
	*	Create a new "who" contract
	*	@param gasAmnt the amount of gas with which to make the deploy transaction
	*	@param params the parameters to pass to the who constructor
	*	@param cbk a callback function to which to pass the address of the new contract
	*/
	var newWho = function(gasAmnt, params, cbk)
	{
		var doNewWho = function()
		{
			let transObj = {gas: gasAmnt};
			let encodedParams = hexEncodeArgs(params);
				
			let result = whoisContract.Genesis(encodedParams.name, 
											   encodedParams.company, 
											   encodedParams.email, 
											   transObj);
	
			if (result)
			{
				cbk(null, result);	
			}
			else
			{
				cbk('Error creating who contract, is one already registered under this address?', null);
			}
		};
	
		if (whoisContract)
		{
			doNewWho();
		}		
		else
		{
			//get address
			var address = '';

			//connect to whois contract
			initContract(WHOIS_ABI, address, function(err, whois)
				{
					if (err)
					{
						cbk(err, null);
					}
					else
					{
						whoisContract = whois;
						doNewWho() 
					}
				});
		}
	};
	
	/** @private
	*	Register a new domain
	*	@param gasAmnt the amount of gas to send with the transaction
	*	@param params an object storing values to pass to the cluster.genesis function
	*	@param cbk a function to which to pass the result of the transaction
	*/
	var newDomain = function(gasAmnt, params, cbk)
	{
		let clusterAddr; //get from Nebulis.clusters mapping
		//something like:
		//clusterAddr = nebulisContract.getCluster(web3.toHex(params.clusterName));
		
		//attach to cluster contract
		initContract(CLUSTER_ABI, clusterAddr, function(err, cluster)
			{
				if (err)
				{
					cbk('Error attaching to cluster: '+err, null);
				}
				else
				{
					let transObj = {gas: gasAmnt};
					let encodedParams = hexEncodeArgs(params);
					if (encodedParams.who)
					{
						let result = cluster.genesis(encodedParams.who, 
												   	 encodedParams.domainName,
													 encodedParams.redirect, 
													 encodedParams.publicity, 
													 transObj);
						if (result)
						{	
							cbk(null, 'Domain created successfully');
						}
						else
						{
							cbk('Error creating domain', null);
						}
					}
					else
					{
						listWho(web3.eth.accounts[0], function(err, result)
							{
								if (err)
								{
									cbk('Error getting who address: '+err, null);
								}
								else
								{
									let who = web3.toHex(result.address);
									let retVal = cluster.genesis(who, 
																 encodedParams.domainName,
																 encodedParams.redirect, 
																 encodedParams.publicity, 
																 transObj);
									if (retVal)
									{	
										cbk(null, 'Domain created successfully');
									}
									else
									{
										cbk('Error creating domain', null);
									}
								}
							});
					}
					
				}
			});	
	}

	/**	@private
	*
	*	Create a new kernel, a.k.a. pre-cluster
	*	@param gasAmnt the amount of gas with which to send the transaction
	*	@param params an object containing args to the Nebulis.amass function
	*	@param cbk a function to pass the result or err msg to
	*/
	var newKernel = function(gasAmnt, params, cbk)
	{
		var doNewKernel = function()
		{
			let transObj = {gas: gasAmnt};
			let encodedParams = hexEncodeArgs(params);
			let result = nebulisContract.Amass(encodedParams.name, 
											   encodedParams.open, 
											   encodedParams.owners, 
											   encodedParams.deposit,
											   transObj);
			if (result)
			{
				cbk(null, 'Kernel '+params.name+' created successfully!');
			}
			else
			{
				cbk('Error creating kernel', null);
			}	
		};

		var getTheShowOnTheRoad = function()
		{
			if (nebulisContract)
			{
				doNewKernel();
			}
			else
			{
				initContract(NEBULIS_ABI, NEBULIS_ADDR, function(err, nc)
					{
						if (err)
						{
							cbk(err, null);
						}
						else
						{
							nebulisContract = nc;
							doNewKernel();
						}
					});
			}
		}

		if (!params.owners)
		{
			listWho(web3.eth.accounts[0], function(err, result)
			{
				if (err)
				{
					cbk('Error getting who address: '+err, null);
				}
				else
				{
					params.owners = [result.address];
					getTheShowOnTheRoad();
				}
			});
		}
		else
		{
			getTheShowOnTheRoad();
		}
	};

	/** @private
	*
	*	Create a new "cluster" contract out of an existing kernel
	*	@param gasAmnt the amount of gas with which to send the transaction
	*	@param params an object containing args for the nebulis.genesis function
	*	@param cbk a function to call with the success or error msg
	*/
	var newCluster = function(gasAmnt, params, cbk)
	{
		var doNewClusterr = function()
		{
			let transObj = {gas: gasAmnt};
			let encodedParams = hexEncodeArgs(params);
			let result = nebulisContract.Genesis(encodedParams.name, transObj);
			if (result)
			{
				cbk(null, 'Cluster '+params.name+' created successfully!');
			}
			else
			{	
				cbk('Error creating cluster', null);
			}
		}

		if (nebulisContract)
		{
			doNewCluster();
		}
		else
		{
			initContract(NEBULIS_ABI, NEBULIS_ADDR, function(err, nc)
				{
					if (err)
					{
						cbk(err, null);
					}
					else
					{
						nebulisContract = nc;
						doNewCluster();
					}
				});
		}					
	};
	
	/** @private
	*
	*	Create a new "zone" contract
	*/
	var newZone = function(params, cbk)
	{

	};

//-------- Various 'Void' functions --------//

	var voidWho = function(params, gasAmnt, cbk)
	{
		var doVoidWho = function()
		{
			let transObj = {gas: gasAmnt};
			let encodedParams = hexEncodeArgs(params);
			
			let result = whoisContract.void(encodedParams.who, transObj);
		
			if (result)
			{
				cbk(null, 'Who contract successfully voided');
			}
			else
			{
				cbk('Error voiding contract', null);
			}
		};
		
		if (whoisContract)
		{
			doVoidWho();
		}	
		else
		{
			let addr = '';

			initContract(WHOIS_ABI, addr, function(err, whois)
				{
					if (err)
					{
						cbk('Error connecting to the Whois contract', null);
					}
					else
					{
						whoisContract = whois;
						doVoidWho();
					}
				}); 
		};
	};

	var voidDomain = function(params, gasAmnt, cbk);
	{
		var owner = null;

		var doVoidDomain = function()
		{
			let transObj = {gas: gasAmnt};
			let encodedIpa = web3.toHex(params.ipa);
			let result = who.eject(encodedIpa, transObj);
		
			if (result)
			{
				cbk(null, 'Domain successfully ejected');
			}
			else
			{
				ckb('Error ejecting domain', null);
			}
		};
		
		var getTheShowOnTheRoad = function()
		{
			//connect to owning who contract
			initContract(WHO_ABI, params.owner, function(err, who)
				{
					if (err)
					{
						cbk('Error connecting to owning contract: '+err, null);
					}
					else
					{
						owner = who;
						doVoidDomain();
					}
				});
		};

		if (params.owner)
		{
			getTheShowOnTheRoad();
		}
		else
		{
			listWho(web3.eth.accounts[0], function(err, result)
			{
				if (err)
				{
					cbk('Error getting who address: '+err, null);
				}
				else
				{
					params.owner = result.address;
					getTheShowOnTheRoad();
				}
			});
		}
	};

//------- Functions for initializing contract references -------//

	/** @private
	*
	*	attach to an existing contract and return the web3 contract object
	*	@param abi the abi array for the contract
	*	@param addr an address for the contract
	*	@param cbk a callback function to pass the initialized contract to
	*/	
	var initContract = function(abi, addr, cbk)
	{
		var contract = web3.eth.contract(abi);
		contract = contract.at(addr);
		if (contract)
		{
			cbk('', contract);
		}
		else
		{
			cbk('Error attaching to the contract, check the address and abi provided', null);
		}
	};

	/**	@private
	*	mine a new contract on the chain
	*	@param abi the abi array for the contract
	*	@param data an object containing data regarding the contract's creation
	*		-required properties are: 
	*			code - the byte code of the contract
	*			gasAmount - the amount of gas to send with the transaction
	*		-optional property:
	*			fromAddr - the address from which to send the transaction,
	*					defaults to web3 coinbase
	*	@param cbk a callback function to which to send the created web3 contract object
	*
	*	--Note: Unsure whether we'll ever actually need this; maybe all contracts are created
	*			indirectly through other existing contracts
	*/
	var deployContract = function(abi, data, cbk)
	{
		var contractParams = {
			from: data.fromAddr || web3.eth.coinbase, //default to coinbase
			data:  data.code,
			gas: data.gasAmount
		};
		
		var constructor = contract.new;
		var constructorParams = data.params;
		for (let i = 0; i < constructorParams.length; i++)
    	{
    		constructor = _.partial(constructor, constructorParams[i]);
    	}	
		
		constructor(contractParams, function(err, theContract)
			{
				if (err)
				{
					//handle it
					cbk(err, null);
				}
				else if (theContract.address)
				{
					//contract has been mined
					cbk('', theContract);
				}
				else
				{
					//report the transaction hash somehow
					//theContract.transactionHash
				}
			});
	};

//------ Utility Functions ------//
	
	function hexEncodeArgs(argObj)
	{
		var encodedArgs = {};
		for (let arg in argObj)
		{
			if (argObj.hasOwnProperty(arg))
			{
				encodedArgs[arg] = web3.toHex(argObj[arg]);
			}
		}	
		
		return encodedArgs;
	}
}

