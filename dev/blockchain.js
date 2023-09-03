const { v1: uuidv1 } = require('uuid');

//SHA-256 hashing algorithm
const sha256=require('sha256');
// 'sha256' library, which is used to generate cryptographic hashes.
const currentNodeUrl=process.argv[3];

//Blockchain Constructor
function Blockchain(){
    this.chain=[];
    this.pendingTransactions=[];
    this.currentNodeUrl=currentNodeUrl;

    this.networkNodes=[];

    //Genesis Block(First Block)
    this.createNewBlock(100,'0','0');

}
//Create New Block -> which is added to blockchain
Blockchain.prototype.createNewBlock = function(nonce,previousBlockHash,hash){
const newBlock={
    index:this.chain.length+1,
    timestamp:Date.now(),
    transactions:this.pendingTransactions,
    nonce:nonce,//This is the proof of work (PoW) number that validates the block
    hash:hash,
    previousBlockHash:previousBlockHash,
};
// After creating the new block, it clears the pendingTransactions array. This is because these transactions have now been included in the new block and shouldn't be included in the next block.
this.pendingTransactions=[];
//The new block (newBlock) is then pushed onto the chain array, effectively adding it to the blockchain
this.chain.push(newBlock);

return newBlock;

}

//last block - (It helps in keeping getting previous block hash while creating a new block)
Blockchain.prototype.getLastBlock=function(){
    return this.chain[this.chain.length-1];
}

//Create Transaction -> It is added to the pending Transaction array
Blockchain.prototype.createNewTransaction=function(amount,sender,recipient){
    const newTransaction={
        amount:amount,
        sender:sender,
        recipient:recipient,
        transactionId:uuidv1().split('-').join('')
    };

    //this.pendingTransactions.push(newTransaction);

   // return this.getLastBlock()['index']+1;
   return newTransaction;
}

// The purpose of this function is to facilitate the process of adding newly created transactions to the list of pending transactions within the blockchain
Blockchain.prototype.addTransactionToPendingTransactions=function(transactionObj){
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()['index']+1;
};

//Hash (Hash value is used in Proof of work)
Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
  };

//This is basically getting the nonce  where the first four digits of hash are 0000
  Blockchain.prototype.proofOfWork=function(previousBlockHash,currentBlockData){
    let nonce=0;
    let hash=this.hashBlock(previousBlockHash,currentBlockData,nonce);
    
    while (hash.substring(0,4) !== '0000'){
        nonce++;
        hash=this.hashBlock(previousBlockHash,currentBlockData,nonce);
        //console.log(hash);
    }
    return nonce;
  };



  Blockchain.prototype.chainIsValid = function(blockchain){

    let validChain=true;

    for(var i=1;i<blockchain.length;i++){
        const currentBlock=blockchain[i];
        const prevBlock=blockchain[i-1];
        const blockHash=this.hashBlock(prevBlock['hash'],{
            transactions:currentBlock['transactions'],
            index:currentBlock['index']
        },
        currentBlock['nonce']
        )
        //This check is essential for Proof of Work (PoW) 
        if (blockHash.substring(0,4) !== '0000') validChain=false;
      
       // if (currentBlock['previousBlockHash'] !== prevBlock['hash']) validChain=false;//chain not 
       if (currentBlock['previousBlockHash'] !== prevBlock['hash']) validChain = false;

    };

    const genesisBlock=blockchain[0];
    const correctNonce=genesisBlock['nonce']===100;
    const correctPreviousBlockHash=genesisBlock['previousBlock']==='0';
    const correctHash=genesisBlock['hash']==='0';
    const correctTransactions=genesisBlock['transactions'].length === 0;

    if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions) validChain=false;
    


    return validChain;
  };


//getBlock function allows you to retrieve a block from the blockchain by providing its hash.
  Blockchain.prototype.getBlock=function(blockhash){
    let correctBlock=null;
    this.chain.forEach(block=>{
        if(block.hash === blockhash) correctBlock=block;
    });

    return correctBlock;

  };

//getTransaction function is used to retrieve a specific transaction from the blockchain based on its transaction ID.
  Blockchain.prototype.getTransaction=function(transactionId){
    let correctTransaction=null;
    let correctBlock=null;

    this.chain.forEach(block=>{
        block.transactions.forEach(transaction => {
            if(transaction.transactionId === transactionId) {
                correctTransaction=transaction;
                correctBlock=block;
            };
        });
    });
    return {
        transaction:correctTransaction,
        block:correctBlock
    };
  };

//getAddressData function is used to retrieve transaction history and calculate the balance for a given wallet address within the blockchain
  Blockchain.prototype.getAddressData=function(address){
    const addressTransactions=[];
    this.chain.forEach(block =>{
        block.transactions.forEach(transaction=>{
            if(transaction.sender === address || transaction.recipient === address){
                addressTransactions.push(transaction);
            };
        });

    });
    let balance=0;
    addressTransactions.forEach(transaction=>{
        if (transaction.recipient === address) balance+=transaction.amount;
        else if (transaction.sender === address) balance-=transaction.amount;
    });

    return {
        addressTransactions:addressTransactions,
        addressBalance:balance
    };
  }


module.exports=Blockchain;