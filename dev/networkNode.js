const express = require('express')
const app = express()
const bodyparser=require('body-parser');
const Blockchain=require('./blockchain')
const { v1: uuidv1 } = require('uuid');
const port=process.argv[2];
const rp=require("request-promise");

const bitcoin=new Blockchain();
const nodeAddress=uuidv1().split('-').join('');

app.use(bodyparser.json())
app.use(bodyparser.urlencoded({extended:false}))

app.get('/blockchain', function (req, res) {
res.send(bitcoin);
});


app.post('/transaction', function (req, res) {
//const blockIndex=bitcoin.createNewTransaction(req.body.amount,req.body.sender,req.body.recipient);
//res.json({note:`Transaction will be added in the block ${blockIndex}.`});
try {
    const newTransaction = req.body;
    console.log('New Transaction:',newTransaction);
    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
    res.json({ note: `Transaction will be added in block ${blockIndex}.` });
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ error: 'Error processing transaction.' });
  }

});


app.post('/transaction/broadcast',function(req,res){
    const newTransaction=bitcoin.createNewTransaction(req.body.amount,req.body.sender,req.body.recipient);
    console.log('Broadcasting transaction:', newTransaction);
    bitcoin.addTransactionToPendingTransactions(newTransaction);

    const requestPromises=[];

    bitcoin.networkNodes.forEach(networkNodeUrl =>{
        const requestOptions={
            url:networkNodeUrl+'/transaction',
            method:'POST',
            body:newTransaction,
            json:true,
        };

        requestPromises.push(rp(requestOptions));
        console.log('Broadcast request to', networkNodeUrl);
    });
    Promise.all(requestPromises)
    .then(data => {
        console.log('Broadcast responses:', data);
        res.json({ note: 'Transaction created and broadcast successfully.' });
    })
    .catch(error => {
        console.error('Error broadcasting transaction:', error);
        res.status(500).json({ error: 'Error broadcasting transaction.' });
    });


});


app.get('/mine', function (req, res) {
    const lastBlock=bitcoin.getLastBlock();
    const previousBlockHash=lastBlock['hash'];
    const currentBlockData={
        transactions:bitcoin.pendingTransactions,
        index:lastBlock['index']+1,

    }

    const nonce=bitcoin.proofOfWork(previousBlockHash,currentBlockData);
    const blockHash=bitcoin.hashBlock(previousBlockHash,currentBlockData,nonce);

    //bitcoin.createNewTransaction(12.5,"00",nodeAddress);

    const newBlock=bitcoin.createNewBlock(nonce,previousBlockHash,blockHash);
    const requestPromises=[];
    bitcoin.networkNodes.forEach(networkNodeUrl =>{

        const requestOptions={
            url:networkNodeUrl+'/receive-new-block',
            method:'POST',
            body:{newBlock:newBlock},
            json:true
        };
        requestPromises.push(rp(requestOptions));

    });
    Promise.all(requestPromises)
    .then(data=>{
        const requestOptions={
            url:bitcoin.currentNodeUrl+'/transaction/broadcast',
            method:'POST',
            body:{
                amount:12.5,
                sender:"00",
                recipient:nodeAddress
            },
            json:true
        };
        return rp(requestOptions);
    })
    .then(data=>{
        res.json({
            node:"New block mined and broadcast successfully",
            block:newBlock,
        })
    })
    .catch(error => {
        console.error('Error mining and broadcasting block:', error);
        res.status(500).json({ error: 'Error mining and broadcasting block.' });
    });

});



app.post('/receive-new-block',function(req,res){

    const newBlock=req.body.newBlock;
    const lastBlock=bitcoin.getLastBlock();
    const correctHash=lastBlock.hash===newBlock.previousBlockHash;
    const correctIndex=lastBlock['index']+1===newBlock['index'];
    if (correctHash && correctIndex){
        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions=[];

        res.json(
        {
        note:'New Block received and accepted',
        newBlock:newBlock
        });
    }
    else{
        res.json(
            {
            note:'New Block rejected',
            newBlock:newBlock
            });
    }

})



//register a node and broadcast that node to the entire network
app.post('/register-and-broadcast-node',function(req,res){
    const newNodeUrl=req.body.newNodeUrl;
    if(bitcoin.networkNodes.indexOf(newNodeUrl) == -1) bitcoin.networkNodes.push(newNodeUrl);

    const registerNodesPromise=[];

    bitcoin.networkNodes.forEach(networkNodeUrl =>{
        const requestOptions={
            url:networkNodeUrl+'/register-node',
            method:'POST',
            body:{
                newNodeUrl:newNodeUrl
            },
            json:true,
        };

        registerNodesPromise.push(rp(requestOptions));

    });

    
    Promise.all(registerNodesPromise)
    .then(data =>{
        const bulkRegisterOptions={
            url:newNodeUrl+'/register-nodes-bulk',
            method:'POST',
            body:{
                allNetworkNodes:[...bitcoin.networkNodes,bitcoin.currentNodeUrl]
            },
            json:true
        };
        return rp(bulkRegisterOptions);
    })
    .then(data=>{
        res.json({node:"New Node registered with network successfully.."})
    });

});



//register a new node with a network
app.post('/register-node',function(req,res){
    const newNodeUrl=req.body.newNodeUrl;
    const newNodeAlreadyPresent=bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode=bitcoin.currentNodeUrl !== newNodeUrl;

    if (newNodeAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);
    res.json(
        {
            note:'New Node registered succesfully with node.'
        }
    );

});


//register multiple node as at once
app.post('/register-nodes-bulk',function(req,res){
const allNetworkNodes=req.body.allNetworkNodes;
allNetworkNodes.forEach(networkNodeUrl =>{
    const nodeNotAlreadyPresent=bitcoin.networkNodes.indexOf(networkNodeUrl);
    const notCurrentNode=bitcoin.currentNodeUrl != networkNodeUrl;
   if(nodeNotAlreadyPresent && notCurrentNode)  bitcoin.networkNodes.push(networkNodeUrl);
});
res.json({note:'Bulk registraton successfull'});
});




app.get('/consensus',function(req,res){
    console.log('Consensus endpoint hit.'); 
    const requestPromises=[];
    bitcoin.networkNodes.forEach(networkNodeUrl =>{
        const requestOptions={
            url:networkNodeUrl+'/blockchain',
            method:'GET',
            json:true
        };
        requestPromises.push(rp(requestOptions));

    });


    Promise.all(requestPromises)
    .then(blockchains => {
        const currentChainLength=bitcoin.chain.length;
        let maxChainLength=currentChainLength;
        let newLongestChain=null;
        let newPendingTransactions=null;

        blockchains.forEach(blockchain=>{

            if (blockchain.chain.length > maxChainLength){
                maxChainLength=blockchain.chain.length;
                newLongestChain=blockchain.chain;
                newPendingTransactions=blockchain.pendingTransactions;

            };

        });
        if (!newLongestChain || (newLongestChain && bitcoin.chainIsValid(newLongestChain))){
            res.json({
                note:'Current chain has not been replaced',
                chain:bitcoin.chain
            })
        }
        else if(newLongestChain && bitcoin.chainIsValid(newLongestChain)){
            bitcoin.chain=newLongestChain;
            bitcoin.pendingTransactions=newPendingTransactions;
            res.json({
                note:'This chain has been replaced',
                chain:bitcoin.chain
            })
        }
    })
    .catch(error => {
        console.error('Error in consensus process:', error); // Add this line
        res.status(500).json({ error: 'Error in consensus process.' });
    });

});


app.get('/block/:blockHash',function(req,res){
    const blockHash=req.params.blockHash;
    const correctBlock=bitcoin.getBlock(blockHash);
    res.json({
        block:correctBlock
    });

});

app.get('/transaction/:transactionId',function(req,res){
    const transactionId=req.params.transactionId;
    
    const transactionData=bitcoin.getTransaction(transactionId);

    res.json({
        transaction:transactionData.transaction,
        block:transactionData.block
    });

});

app.get('/address/:address',function(req,res){
    const address=req.params.address;

    const addressData=bitcoin.getAddressData(address);

    res.json({
        addressData:addressData
    });

});

app.get('/block-explorer',function(req,res){
    res.sendFile('./block-explorer/index.html',{root:__dirname});

});

app.listen(port,function(){
    console.log(`Running ${port}`)
})

