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
const { application } = require('express');
const { sayHello } = require('../contracts/urqdollar');
const { resolve } = require('mongodb/lib/core/topologies/read_preference');

const app = require('../contracts/urqdollar')
const tknContractPayload = setupContractPayload('tokens', './contracts/tokens.js');
const urqContractPayload = setupContractPayload('beedollar', './contracts/urqdollar.js');
const mpContractPayload = setupContractPayload('marketpools', './contracts/marketpools.js');

const fixture = new Fixture();
const tableAsserts = new TableAsserts(fixture);

// test cases for beedollar smart contract
describe('urqdollar', function () {


  it('verifies we say hello', function(){
        let result = app()
        assert.equal(result, 'hello')

  })

  it('verifies we have a string', function (){
    let result = app()
    console.log("are we on")
    assert.equal(typeof result , 'string')

})

});
