
const Blockchain =require('./blockchain');

const bitcoin=new Blockchain();
// bitcoin.createNewBlock(2389,'01NA90SDNF90N','90ANSD9F0N900N');
// bitcoin.createNewTransaction(100,'BA98HJBH99','ZS95HJHBHB');

// bitcoin.createNewBlock(989,'01NANNNNF90N','90AOOO9F0N900N');


// bitcoin.createNewTransaction(180,'PA98PJBH99','ZP95HJHBHB');
// bitcoin.createNewTransaction(1900,'BL98HJBH99','ZL95HJHBHB');

// bitcoin.createNewBlock(23,'01NAL0SDNF90N','90MNSD9F0N900N');

// const previousBlockHash='0JSDFHEWJFJFKE';
// const currentBlockData=[
//     {
//         amount:10,
//         sender:'NNJJJQWJ99',
//         recipient:'OKEFIOEWU77'
//     },
//     {
//         amount:90,
//         sender:'NNJLLQWJ99',
//         recipient:'PPEFIOEWU77'
//     },
//     {
//         amount:20,
//         sender:'NNPPJQWJ99',
//         recipient:'OK97FIOEWU77'
//     },
// ];



//bitcoin.hashBlock(previousBlockHash,currentBlockData,nonce);

// console.log(bitcoin.proofOfWork(previousBlockHash,currentBlockData));
// console.log(bitcoin.hashBlock(previousBlockHash,currentBlockData,98565));



console.log(bitcoin);