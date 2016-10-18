if [ $# -eq 0 ]
	then echo "usage: startgeth <etherbase addr>"
	exit
fi
	
geth --rpc --rpccorsdomain "http://localhost:8545" --etherbase $1 --testnet
