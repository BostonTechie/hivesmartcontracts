/* eslint-disable no-await-in-loop */
/* eslint-disable no-template-curly-in-string */
/* eslint-disable valid-typeof */
/* eslint-disable max-len */
/* eslint-disable no-continue */
/* global actions, api */

actions.createSSC = async () => {
  const tableExists = await api.db.tableExists('params');
  if (tableExists === false) {
    await api.db.createTable('params');

    /*
    Every token that is created by this smart contract(burndollar) in effect has a parent token
    the intent is that when a user burns a token XXX they would get token XXXD. There shold always be a one to one realtionship
    However the goal is to let the token owner decided how effcient their token conversion is
    A token owner can also decide is they want the ineffiecient portion of their token conversion to be burned or go to a DAO or another account
    This routing is to be controlled by a token issuer using burn routing field om the burndollar_burnpair collection
    */
    await api.db.createTable('burnpair', ['issuer', 'symbol', 'name', 'parentiId', 'burnRouting', 'minConvertibleAmount', 'feePercentage']);

    /* For a token_contract owner to issue a new -D token the price is 1000 BEED (burn).
      the smart contrart will bootstrap the -D token into existance
      The underlying token must already exist using seperate established token creation smart contract.
      token_contract owner inherits ownship of the new -D contract
      after the creation of -D token if the token_contract owner wants to edit the paramaters of their -D token they can for 100 BEED (burn).
      if the token and new -D token have sufficient liquidity pools then any user can burn xxx to get xxx-d for 1 BEED(burn).
      The 1 BEED(burn) is seperate from the -D token paramters set by token_contract owner, and is not subject to their edits of a token_contract owner
    */

    const params = {};
    params.issueDTokenFee = '1000';
    params.updateParamsFee = '100';
    params.burnUsageFee = '1';
    await api.db.insert('params', params);
  }
};

actions.updateParams = async (payload) => { //    this function will update the parameters of the burndollar_params collection
  if (api.sender !== api.owner) return;

  const {
    issueDTokenFee,
    updateParamsFee,
    burnUsageFee,
  } = payload;

  const params = await api.db.findOne('params', {});


  if (issueDTokenFee && typeof issueDTokenFee === 'string' && !api.BigNumber(issueDTokenFee).isNaN() && api.BigNumber(issueDTokenFee).gte(0)) {
    params.issueDTokenFee = issueDTokenFee;
  }

  if (updateParamsFee && typeof updateParamsFee === 'string' && !api.BigNumber(updateParamsFee).isNaN() && api.BigNumber(updateParamsFee).gte(0)) {
    params.updateParamsFee = updateParamsFee;
  }
  if (burnUsageFee && typeof burnUsageFee === 'string' && !api.BigNumber(burnUsageFee).isNaN() && api.BigNumber(burnUsageFee).gte(0)) {
    params.burnUsageFee = burnUsageFee;
  }

  await api.db.update('params', params);
};

actions.createTokenD = async (payload) => { // allow a token_owner to create the new D Token
  const { // not sure if I need name for blacklist or callingContractInfo
    symbol, url, precision, maxSupply, isSignedWithActiveKey, burnRouting, minConvertableAmount, feePercentage,
  } = payload;

  const params = await api.db.findOne('params', {});
  const { issueDTokenFee } = params;

  const beedTokenBalance = await api.db.findOneInTable('tokens', 'balances', { account: api.sender, symbol: 'BEED' });

  const authorizedCreation = beedTokenBalance && api.BigNumber(beedTokenBalance.balance).gte(issueDTokenFee);

  if (api.assert(authorizedCreation, 'you must have enough tokens to cover the creation fees')
   && api.assert(isSignedWithActiveKey === true, 'you must use a custom_json signed with your active key')
   && api.assert(symbol && typeof symbol === 'string' && symbol.length <= 8, 'symbol must be string of length 8 or less to create a xxx-D token')
   && api.assert((precision && typeof precision === 'number') && (precision >= 0 && precision <= 8) && (Number.isInteger(precision)), 'invalid precision must be number between 0 and 8')
   && api.assert(maxSupply && typeof maxSupply === 'string' && !api.BigNumber(maxSupply).isNaN() && api.BigNumber(maxSupply).gt(0), 'maxSupply must be positive string(number)')
   && api.assert(api.BigNumber(maxSupply).lte(Number.MAX_SAFE_INTEGER), `maxSupply must be lower than ${Number.MAX_SAFE_INTEGER}`)
   && api.assert(url === undefined || (typeof url === 'string') || url.length <= 255, 'invalid url must be string of less thna 255 chars')) {
    // ensure the user issuing D token is owner of the parent pair token
    const tokenIssuer = await api.db.findOneInTable('tokens', 'tokens', { issuer: api.sender, symbol });
    const dsymbol = `${symbol}-D`;
    const tokenDExists = await api.db.findOneInTable('tokens', 'tokens', { symbol: dsymbol });


    if (api.assert(tokenIssuer !== null, 'You must be the token issuer in order to issue D token')
    // && api.assert(tokenDExists !== null, 'The D token name is taken')
    && api.assert(burnRouting === null || (typeof burnRouting === 'string'), 'burn routing must be string')
    && api.assert(minConvertableAmount && typeof minConvertableAmount === 'string' && !api.BigNumber(minConvertableAmount).isNaN() && api.BigNumber(minConvertableAmount).gte(1), 'min convert amount must be string(number) greater than 1')
    && api.assert(feePercentage && typeof feePercentage === 'string' && !api.BigNumber(feePercentage).isNaN() && api.BigNumber(feePercentage).gte(0) && api.BigNumber(feePercentage).lte(1), 'fee percentage must be between 0 and 1 / 0% and 100%')
    ) {
      const burnAccount = await api.db.findOneInTable('tokens', 'balances', { account: burnRouting });
      if (api.assert(burnAccount !== null, 'account for burn routing must exist')) {

      }
    }
  }
};
