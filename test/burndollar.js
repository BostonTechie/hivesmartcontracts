/* eslint-disable */
const assert = require('assert').strict;
const { MongoClient } = require('mongodb');

const { CONSTANTS } = require('../libs/Constants');
const { Database } = require('../libs/Database');
const blockchain = require('../plugins/Blockchain');
const { Transaction } = require('../libs/Transaction');
const { setupContractPayload } = require('../libs/util/contractUtil');
const { Fixture, conf } = require('../libs/util/testing/Fixture');
const { TableAsserts } = require('../libs/util/testing/TableAsserts');
const { assertError } = require('../libs/util/testing/Asserts');
const { query } = require('winston');
const { table } = require('console');


const tknContractPayload = setupContractPayload('tokens', './contracts/tokens.js');
const bdContractPayload = setupContractPayload('burndollar', './contracts/burndollar.js');
const beeContractPayload = setupContractPayload('beedollar', './contracts/beedollar.js');
const mpContractPayload = setupContractPayload('marketpools', './contracts/marketpools.js');

const fixture = new Fixture();
const tableAsserts = new TableAsserts(fixture);

// test cases for beedollar smart contract
describe('burndollar', function () {
  this.timeout(5000);

  before((done) => {
    new Promise(async (resolve) => {
      client = await MongoClient.connect(conf.databaseURL, { useNewUrlParser: true, useUnifiedTopology: true });
      db = await client.db(conf.databaseName);
      await db.dropDatabase();
      resolve();
    })
      .then(() => {
        done()
      })
  });
  
  after((done) => {
    new Promise(async (resolve) => {
      await client.close();
      resolve();
    })
      .then(() => {
        done()
      })
  });

  beforeEach((done) => {
    new Promise(async (resolve) => {
      db = await client.db(conf.databaseName);
      resolve();
    })
      .then(() => {
        done()
      })
  });

  afterEach((done) => {
    // runs after each test in this block
    new Promise(async (resolve) => {
      fixture.tearDown();
      await db.dropDatabase()
      resolve();
    })
      .then(() => {
        done()
      })
  });

  it('updates parameters on the fee charges in the burndollar contract', (done) => {
    new Promise(async (resolve) => {

      await fixture.setUp();

      let refBlockNumber = fixture.getNextRefBlockNumber();
      let transactions = [];
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(tknContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(bdContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(bdContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'burndollar', 'updateParams', '{ "issueDTokenFee": "1200", "updateParamsFee": "200", "burnUsageFee": "2"}'));

      let block = {
        refHiveBlockNumber: refBlockNumber,
        refHiveBlockId: 'ABCD1',
        prevRefHiveBlockId: 'ABCD2',
        timestamp: '2018-06-01T00:00:00',
        transactions,
      };

      await fixture.sendBlock(block);

      const res = await fixture.database.getBlockInfo(1);

      const block1 = res;
      const transactionsBlock1 = block1.transactions;

      // check if the params updated OK
      const params = await fixture.database.findOne({
        contract: 'burndollar',
        table: 'params',
        query: {}
      });

      console.log(" ")
      console.log( '\u001b[' + 93 + 'm' + 'Test: updates parameters on the fee charges in the burndollar contract' + '\u001b[0m')

      assert.equal(params.issueDTokenFee, '1200');
      assert.equal(params.updateParamsFee, '200');
      assert.equal(params.burnUsageFee, '2');

      resolve();
    })
      .then(() => {
        fixture.tearDown();
        done();
      });
  });


  it('generates errors when trying to issue D tokens with wrong parameters', (done) => {
    new Promise(async (resolve) => {

      await fixture.setUp();

      let refBlockNumber =  74391382; 
      let transactions = [];
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(tknContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(bdContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(bdContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(beeContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(beeContractPayload)));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(mpContractPayload))); // update 1
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(mpContractPayload))); // update 2
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'create', '{ "isSignedWithActiveKey": true,  "name": "HBD Pegged", "url": "https://hive-engine.com", "symbol": "SWAP.HBD", "precision": 8, "maxSupply": "1000000000000" }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "SWAP.HBD", "to": "drewlongshot", "quantity": "1000", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_PEGGED_ACCOUNT, 'tokens', 'transfer', '{ "symbol": "SWAP.HIVE", "to": "drewlongshot", "quantity": "100000", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'transfer', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "to": "drewlongshot", "quantity": "100000", "isSignedWithActiveKey": true }`));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'transfer', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "to": "whale", "quantity": "100000", "isSignedWithActiveKey": true }`));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "SWAP.HBD", "to": "whale", "quantity": "100000", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'whale', 'market', 'sell', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "quantity": "10000", "price": "10", "isSignedWithActiveKey": true }`));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'whale', 'market', 'sell', '{ "symbol": "SWAP.HBD", "quantity": "10000", "price": "0.5", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'market', 'buy', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "quantity": "100", "price": "10", "isSignedWithActiveKey": true }`));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'market', 'buy', '{ "symbol": "SWAP.HBD", "quantity": "100", "price": "0.5","isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'marketpools', 'createPool', '{ "tokenPair": "SWAP.HIVE:BEE", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'marketpools', 'createPool', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'addLiquidity', '{ "tokenPair": "SWAP.HIVE:BEE", "baseQuantity": "20000", "quoteQuantity": "200", "maxDeviation": "0", "isSignedWithActiveKey": true }')); 
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'addLiquidity', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "baseQuantity": "20000", "quoteQuantity": "200", "maxDeviation": "0", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'swapTokens', '{ "tokenPair": "SWAP.HIVE:BEE", "tokenSymbol": "SWAP.HIVE", "tokenAmount": "5", "tradeType": "exactOutput", "isSignedWithActiveKey": true}'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'swapTokens', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "tokenSymbol": "SWAP.HBD", "tokenAmount": "5", "tradeType": "exactOutput", "isSignedWithActiveKey": true}'));
      // now, do a convert from bee to beed
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "200.0", "isSignedWithActiveKey": true }'));
      //user must be the owner a pre-existing token that they wish to make into corresponding D token
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'tokens', 'create', '{ "isSignedWithActiveKey": true,  "name": "token", "url": "https://token.com", "symbol": "URQTEST", "precision": 3, "maxSupply": "10000", "isSignedWithActiveKey": true  }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "URQTEST", "quantity": "200", "to": "drewlongshot", "isSignedWithActiveKey": true }'));
      //trans #26 active key test anduser has BEED enough test
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "2000.0", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "isSignedWithActiveKey": false }'));
      //trans29 + 30 symbol must be string of less than 8 contract to append -D
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": 156, "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "RUTTMUTTT", "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
      //trans31 + 32 precision must be number between 0 and 8 
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "TIM3", "maxSupply": "20000", "precision": "ty", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "TIM3", "maxSupply": "20000", "precision": 9, "isSignedWithActiveKey": true }'));
      //trans33+ 34 + 35 maxSupply must be a valid param
       transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "THR", "url": "good.com" , "maxSupply": 20000, "precision": 2, "isSignedWithActiveKey": true }'));
       transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "THR", "url": "good.com" , "maxSupply": "tim", "precision": 2, "isSignedWithActiveKey": true }'));
       transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "THR", "url": "good.com" , "maxSupply": "9999999999999999999999999999999999999999999999999", "precision": 2, "isSignedWithActiveKey": true }'));
      //trans36 URL must be string and not be undefined
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "THR", "url": 123 , "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
      //trans 37 user must be issuer on the Parent token
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "BEE", "url":"myurl", "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
      // trans38 the parent token is set to burn to null by default, but a user can send it to any other account
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "URQTEST", "burnRouting": 123, "url":"myurl", "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
      // trans39 the min convertable amount has to be a string(value) of at least 1
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "URQTEST", "minConvertableAmount": "0", "burnRouting": "aggroed", "url":"myurl", "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
       // trans40 fee conversion rate must be between 0 and 100% as a decimal
       transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "URQTEST", "feePercentage": "1.1","minConvertableAmount": "1", "burnRouting": "aggroed", "url":"myurl", "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
       // trans41 the account for routing the fee portion of a converion must exist
       transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "URQTEST", "feePercentage": ".5","minConvertableAmount": "1", "burnRouting": "aggroedthesmall", "url":"myurl", "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
      //trans 42+44 the name XXX-D token already exists
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'tokens', 'create', '{ "isSignedWithActiveKey": true,  "name": "token", "url": "https://token.com", "symbol": "URQTEST-D", "precision": 3, "maxSupply": "10000", "isSignedWithActiveKey": true  }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "URQTEST-D", "quantity": "200", "to": "drewlongshot", "isSignedWithActiveKey": true }'));
      transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot','burndollar', 'createTokenD', '{ "symbol": "URQTEST", "feePercentage": ".5","minConvertableAmount": "1", "burnRouting": "whale", "url":"myurl", "maxSupply": "20000", "precision": 2, "isSignedWithActiveKey": true }'));
    
      
      let block = {
        refHiveBlockNumber: refBlockNumber,
        refHiveBlockId: 'ABCD1',
        prevRefHiveBlockId: 'ABCD2',
        timestamp: '2018-06-01T00:00:00',
        transactions,
      };

      await fixture.sendBlock(block);

      const res = await fixture.database.getBlockInfo(1);

      const block1 = res;
      const transactionsBlock1 = block1.transactions;

      const res2 = await fixture.database.find({
        contract: 'tokens',
        table: 'tokens',
        query: {}
      });

      // console.log(res2)
       console.log(JSON.parse(transactionsBlock1[43].logs))
      // console.log(JSON.parse(transactionsBlock1[46].logs))
      console.log(" ")
      console.log( '\u001b[' + 93 + 'm' + 'Test: generates errors when trying to issue D tokens with wrong parameters' + '\u001b[0m')
      console.log("  ⚪",JSON.parse(transactionsBlock1[26].logs).errors[0])
      console.log("  ⚪",JSON.parse(transactionsBlock1[28].logs).errors[0])
      console.log("  ⚪",JSON.parse(transactionsBlock1[29].logs).errors[0],"... the symbol must be string")
      console.log("  ⚪",JSON.parse(transactionsBlock1[30].logs).errors[0],"... the symbol must be less than 8 Chars")
      console.log("  ⚪",JSON.parse(transactionsBlock1[31].logs).errors[0],"... precision must be number")
      console.log("  ⚪",JSON.parse(transactionsBlock1[32].logs).errors[0],"... precision must be number less than 8")
      console.log("  ⚪",JSON.parse(transactionsBlock1[33].logs).errors[0],"...  maxsupply must be string(of number)")
      console.log("  ⚪",JSON.parse(transactionsBlock1[34].logs).errors[0],"... maxsupply must be string(of number)")
      console.log("  ⚪",JSON.parse(transactionsBlock1[35].logs).errors[0],"... maxSupply must be lower than ")
      console.log("  ⚪",JSON.parse(transactionsBlock1[36].logs).errors[0],"... url must be a string ")
      console.log("  ⚪",JSON.parse(transactionsBlock1[37].logs).errors[0],"... user not token parent issure ")
      console.log("  ⚪",JSON.parse(transactionsBlock1[38].logs).errors[0],"... burn routing must be a string and is set to null by default ")
      console.log("  ⚪",JSON.parse(transactionsBlock1[39].logs).errors[0],"... min convertable amount must equal 1 ")
      console.log("  ⚪",JSON.parse(transactionsBlock1[40].logs).errors[0],"... fee percent must be btwn 0 and 1 ")
      console.log("  ⚪",JSON.parse(transactionsBlock1[41].logs).errors[0],"... does account exist")
      console.log("  ⚪",JSON.parse(transactionsBlock1[44].logs).errors[0],"... XXX-D already exists")


      assert.equal(JSON.parse(transactionsBlock1[26].logs).errors[0], 'you must have enough tokens to cover the creation fees');
      assert.equal(JSON.parse(transactionsBlock1[28].logs).errors[0], 'you must use a custom_json signed with your active key');
      assert.equal(JSON.parse(transactionsBlock1[29].logs).errors[0], 'symbol must be string of length 8 or less to create a xxx-D token');
      assert.equal(JSON.parse(transactionsBlock1[30].logs).errors[0], 'symbol must be string of length 8 or less to create a xxx-D token');
      assert.equal(JSON.parse(transactionsBlock1[31].logs).errors[0], 'invalid precision must be number between 0 and 8');
      assert.equal(JSON.parse(transactionsBlock1[32].logs).errors[0], 'invalid precision must be number between 0 and 8');
      assert.equal(JSON.parse(transactionsBlock1[33].logs).errors[0], 'maxSupply must be positive string(number)');
      assert.equal(JSON.parse(transactionsBlock1[34].logs).errors[0], 'maxSupply must be positive string(number)');
      assert.equal(JSON.parse(transactionsBlock1[35].logs).errors[0], `maxSupply must be lower than ${Number.MAX_SAFE_INTEGER}`);
      assert.equal(JSON.parse(transactionsBlock1[36].logs).errors[0], `invalid url must be string of less thna 255 chars`);
      assert.equal(JSON.parse(transactionsBlock1[37].logs).errors[0], `You must be the token issuer in order to issue D token`);
      assert.equal(JSON.parse(transactionsBlock1[38].logs).errors[0], `burn routing must be string`);
      assert.equal(JSON.parse(transactionsBlock1[39].logs).errors[0], `min convert amount must be string(number) greater than 1`);
      assert.equal(JSON.parse(transactionsBlock1[40].logs).errors[0], `fee percentage must be between 0 and 1 / 0% and 100%`);
      assert.equal(JSON.parse(transactionsBlock1[41].logs).errors[0], `account for burn routing must exist`);
      assert.equal(JSON.parse(transactionsBlock1[44].logs).errors[0], `D token must not already exist`);

      resolve();
    })
      .then(() => {
        fixture.tearDown();
        done();
      });
  });

  // it('rejects invalid parameters', (done) => {
  //   new Promise(async (resolve) => {

  //     await fixture.setUp();

  //     let refBlockNumber = fixture.getNextRefBlockNumber();
  //     let transactions = [];
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(tknContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(bdContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(bdContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'updateParams', '{ "minConvertibleAmount": "5.5", "feePercentage": "0.025" }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'beedollar', 'updateParams', '{ "wrongKey": "oops" }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'beedollar', 'updateParams', '{ "minConvertibleAmount": 5 }'));

  //     let block = {
  //       refHiveBlockNumber: refBlockNumber,
  //       refHiveBlockId: 'ABCD1',
  //       prevRefHiveBlockId: 'ABCD2',
  //       timestamp: '2018-06-01T00:00:00',
  //       transactions,
  //     };

  //     await fixture.sendBlock(block);

  //     // params should not have changed from their initial values
  //     const params = await fixture.database.findOne({
  //       contract: 'beedollar',
  //       table: 'params',
  //       query: {}
  //     });

  //     console.log(params);

  //     assert.equal(params.minConvertibleAmount, '1');
  //     assert.equal(params.feePercentage, '0.01');

  //     resolve();
  //   })
  //     .then(() => {
  //       fixture.tearDown();
  //       done();
  //     });
  // });

  // it('converts BEE to BEE Dollars', (done) => {
  //   new Promise(async (resolve) => {

  //     await fixture.setUp();

  //     let refBlockNumber = fixture.getNextRefBlockNumber();
  //     let transactions = [];
  //     // first, setup the test
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(tknContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(bdContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(bdContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(mpContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(mpContractPayload))); // update 1
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(mpContractPayload))); // update 2
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'create', '{ "isSignedWithActiveKey": true,  "name": "HBD Pegged", "url": "https://hive-engine.com", "symbol": "SWAP.HBD", "precision": 8, "maxSupply": "1000000000000" }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "SWAP.HBD", "to": "drewlongshot", "quantity": "1000", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_PEGGED_ACCOUNT, 'tokens', 'transfer', '{ "symbol": "SWAP.HIVE", "to": "drewlongshot", "quantity": "1000", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'transfer', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "to": "drewlongshot", "quantity": "1000", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'transfer', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "to": "whale", "quantity": "1000", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "SWAP.HBD", "to": "whale", "quantity": "1000", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'whale', 'market', 'sell', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "quantity": "100", "price": "10", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'whale', 'market', 'sell', '{ "symbol": "SWAP.HBD", "quantity": "100", "price": "0.5", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'market', 'buy', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "quantity": "1", "price": "10", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'market', 'buy', '{ "symbol": "SWAP.HBD", "quantity": "1", "price": "0.5","isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'marketpools', 'createPool', '{ "tokenPair": "SWAP.HIVE:BEE", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'marketpools', 'createPool', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'addLiquidity', '{ "tokenPair": "SWAP.HIVE:BEE", "baseQuantity": "200", "quoteQuantity": "200", "maxDeviation": "0", "isSignedWithActiveKey": true }')); 
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'addLiquidity', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "baseQuantity": "200", "quoteQuantity": "200", "maxDeviation": "0", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'swapTokens', '{ "tokenPair": "SWAP.HIVE:BEE", "tokenSymbol": "SWAP.HIVE", "tokenAmount": "5", "tradeType": "exactOutput", "isSignedWithActiveKey": true}'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'swapTokens', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "tokenSymbol": "SWAP.HBD", "tokenAmount": "5", "tradeType": "exactOutput", "isSignedWithActiveKey": true}'));

  //     // now, do a convert
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "10.0", "isSignedWithActiveKey": true }'));

  //     let block = {
  //       refHiveBlockNumber: refBlockNumber,
  //       refHiveBlockId: 'ABCD1',
  //       prevRefHiveBlockId: 'ABCD2',
  //       timestamp: '2018-06-01T00:00:00',
  //       transactions,
  //     };

  //     await fixture.sendBlock(block);
  //     await tableAsserts.assertNoErrorInLastBlock();

  //     let res = await fixture.database.find({
  //       contract: 'marketpools',
  //       table: 'pools',
  //       query: {}
  //     });
  //     console.log(res);

  //     res = await fixture.database.find({
  //       contract: 'tokens',
  //       table: 'balances',
  //       query: {
  //         account: 'drewlongshot'
  //       }
  //     });
  //     console.log(res);

  //     // confirm that BEE was burned in the convert
  //     await tableAsserts.assertUserBalances({ account: 'drewlongshot', symbol: `${CONSTANTS.UTILITY_TOKEN_SYMBOL}`, balance: '785.85894222'});

  //     // confirm that BEED was issued
  //     await tableAsserts.assertUserBalances({ account: 'drewlongshot', symbol: 'BEED', balance: '8.9453'});

  //     // confirm that BEED was bootstrapped into existence OK
  //     const token = await fixture.database.findOne({
  //       contract: 'tokens',
  //       table: 'tokens',
  //       query: {
  //         symbol: 'BEED',
  //       }
  //     });
  //     console.log(token);
  //     assert.equal(token.issuer, 'null');
  //     assert.equal(token.symbol, 'BEED');
  //     assert.equal(token.name, 'BeeD');
  //     assert.equal(token.metadata, '{"url":"https://tribaldex.com","icon":"https://cdn.tribaldex.com/tribaldex/token-icons/BEE.png","desc":"BEED is the native stablecoin for the Hive Engine platform. You can mint new BEED by burning BEE."}');
  //     assert.equal(token.precision, 4);
  //     assert.equal(token.maxSupply, '9007199254740991.0000');
  //     assert.equal(token.supply, '8.9453');

  //     resolve();
  //   })
  //     .then(() => {
  //       fixture.tearDown();
  //       done();
  //     });
  // });

  // it('fails to convert BEE to BEE Dollars', (done) => {
  //   new Promise(async (resolve) => {

  //     await fixture.setUp();

  //     let refBlockNumber = fixture.getNextRefBlockNumber();
  //     let transactions = [];
  //     // first, setup the test
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(tknContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(bdContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(bdContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'deploy', JSON.stringify(mpContractPayload)));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(mpContractPayload))); // update 1
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'contract', 'update', JSON.stringify(mpContractPayload))); // update 2
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'create', '{ "isSignedWithActiveKey": true,  "name": "HBD Pegged", "url": "https://hive-engine.com", "symbol": "SWAP.HBD", "precision": 8, "maxSupply": "1000000000000" }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "SWAP.HBD", "to": "drewlongshot", "quantity": "1000", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_PEGGED_ACCOUNT, 'tokens', 'transfer', '{ "symbol": "SWAP.HIVE", "to": "drewlongshot", "quantity": "1000", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'transfer', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "to": "drewlongshot", "quantity": "1000", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'transfer', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "to": "whale", "quantity": "1000", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'tokens', 'issue', '{ "symbol": "SWAP.HBD", "to": "whale", "quantity": "1000", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'whale', 'market', 'sell', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "quantity": "100", "price": "10", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'whale', 'market', 'sell', '{ "symbol": "SWAP.HBD", "quantity": "100", "price": "0.5", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'market', 'buy', `{ "symbol": "${CONSTANTS.UTILITY_TOKEN_SYMBOL}", "quantity": "1", "price": "10", "isSignedWithActiveKey": true }`));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'market', 'buy', '{ "symbol": "SWAP.HBD", "quantity": "1", "price": "0.5","isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'marketpools', 'createPool', '{ "tokenPair": "SWAP.HIVE:BEE", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), CONSTANTS.HIVE_ENGINE_ACCOUNT, 'marketpools', 'createPool', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'addLiquidity', '{ "tokenPair": "SWAP.HIVE:BEE", "baseQuantity": "200", "quoteQuantity": "200", "maxDeviation": "0", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'addLiquidity', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "baseQuantity": "200", "quoteQuantity": "200", "maxDeviation": "0", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'swapTokens', '{ "tokenPair": "SWAP.HIVE:BEE", "tokenSymbol": "SWAP.HIVE", "tokenAmount": "5", "tradeType": "exactOutput", "isSignedWithActiveKey": true}'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'marketpools', 'swapTokens', '{ "tokenPair": "SWAP.HIVE:SWAP.HBD", "tokenSymbol": "SWAP.HBD", "tokenAmount": "5", "tradeType": "exactOutput", "isSignedWithActiveKey": true}'));

  //     // now, do some converts (all of these should fail)
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "10.0", "isSignedWithActiveKey": false }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "abcdef", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "0.99", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "-5", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "5.123456789", "isSignedWithActiveKey": true }'));
  //     transactions.push(new Transaction(refBlockNumber, fixture.getNextTxId(), 'drewlongshot', 'beedollar', 'convert', '{ "quantity": "5000", "isSignedWithActiveKey": true }'));

  //     let block = {
  //       refHiveBlockNumber: refBlockNumber,
  //       refHiveBlockId: 'ABCD1',
  //       prevRefHiveBlockId: 'ABCD2',
  //       timestamp: '2018-06-01T00:00:00',
  //       transactions,
  //     };

  //     await fixture.sendBlock(block);

  //     // confirm that no BEE was burned
  //     await tableAsserts.assertUserBalances({ account: 'drewlongshot', symbol: `${CONSTANTS.UTILITY_TOKEN_SYMBOL}`, balance: '795.85894222'});

  //     // confirm that no BEED was issued
  //     await tableAsserts.assertUserBalances({ account: 'drewlongshot', symbol: 'BEED' });

  //     const token = await fixture.database.findOne({
  //       contract: 'tokens',
  //       table: 'tokens',
  //       query: {
  //         symbol: 'BEED',
  //       }
  //     });
  //     console.log(token);
  //     assert.equal(token.supply, '0');

  //     const latestBlock = await fixture.database.getLatestBlockInfo();
  //     const transactionsBlock1 = latestBlock.transactions;

  //     console.log(JSON.parse(transactionsBlock1[22].logs).errors);
  //     console.log(JSON.parse(transactionsBlock1[23].logs).errors);
  //     console.log(JSON.parse(transactionsBlock1[24].logs).errors);
  //     console.log(JSON.parse(transactionsBlock1[25].logs).errors);
  //     console.log(JSON.parse(transactionsBlock1[26].logs).errors);
  //     console.log(JSON.parse(transactionsBlock1[27].logs).errors);

  //     assert.equal(JSON.parse(transactionsBlock1[22].logs).errors[0], 'you must use a custom_json signed with your active key');
  //     assert.equal(JSON.parse(transactionsBlock1[23].logs).errors[0], 'invalid params');
  //     assert.equal(JSON.parse(transactionsBlock1[24].logs).errors[0], 'amount to convert must be >= 1');
  //     assert.equal(JSON.parse(transactionsBlock1[25].logs).errors[0], 'amount to convert must be >= 1');
  //     assert.equal(JSON.parse(transactionsBlock1[26].logs).errors[0], 'symbol precision mismatch');
  //     assert.equal(JSON.parse(transactionsBlock1[27].logs).errors[0], 'not enough balance');

  //     resolve();
  //   })
  //     .then(() => {
  //       fixture.tearDown();
  //       done();
  //     });
  // });
});