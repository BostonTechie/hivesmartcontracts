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
    await api.db.createTable('burnpair', ['issuer', 'symbol', 'name', 'parentSymbol', 'burnRouting', 'minConvertibleAmount', 'feePercentage', 'callingContractInfo']);

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
    name, symbol, url, precision, maxSupply, isSignedWithActiveKey, burnRouting, minConvertableAmount, feePercentage,
  } = payload;

  const params = await api.db.findOne('params', {});
  const { issueDTokenFee } = params;

  const beedTokenBalance = await api.db.findOneInTable('tokens', 'balances', { account: api.sender, symbol: 'BEED' });

  const authorizedCreation = beedTokenBalance && api.BigNumber(beedTokenBalance.balance).gte(issueDTokenFee);

  if (api.assert(authorizedCreation, 'you must have enough BEED tokens to cover the creation fees')
   && api.assert(symbol && typeof symbol === 'string' && symbol.length <= 8, 'symbol must be string of length 8 or less to create a xxx-D token')
  && api.assert((url === undefined || (url && typeof url === 'string')), 'url must be string')
  ) {
    // ensure the user issuing D token is owner of the parent pair token
    const tokenIssuer = await api.db.findOneInTable('tokens', 'tokens', { issuer: api.sender, symbol });

    const finalRouting = burnRouting === undefined ? 'null' : burnRouting;
    if (api.assert(tokenIssuer !== null, 'You must be the token issuer in order to issue D token')
    && api.assert(finalRouting === null || (typeof finalRouting === 'string'), 'burn routing must be string')
    && api.assert(minConvertableAmount && typeof minConvertableAmount === 'string' && !api.BigNumber(minConvertableAmount).isNaN() && api.BigNumber(minConvertableAmount).gte(1), 'min convert amount must be string(number) greater than 1')
    && api.assert(feePercentage && typeof feePercentage === 'string' && !api.BigNumber(feePercentage).isNaN() && api.BigNumber(feePercentage).gte(0) && api.BigNumber(feePercentage).lte(1), 'fee percentage must be between 0 and 1 / 0% and 100%')
    && api.assert(maxSupply && typeof maxSupply === 'string' && !api.BigNumber(maxSupply).isNaN() && api.BigNumber(maxSupply).gte(2000), 'max supply must be a minimum of 2000 units')
    ) {
      const burnAccount = await api.db.findOneInTable('tokens', 'balances', { account: burnRouting });
      const dsymbol = `${symbol}.D`;
      const tokenDExists = await api.db.findOneInTable('tokens', 'tokens', { symbol: dsymbol });
      if (api.assert(burnAccount !== null, 'account for burn routing must exist')
        && api.assert(tokenDExists === null, 'D token must not already exist')
      ) {
        try {
          const finalUrl = url === undefined ? '' : url;
          const finalname = name === undefined ? '' : name;
          let metadata = {
            url: finalUrl,
          };
          metadata = JSON.stringify(metadata);

          const newToken = {
            issuer: api.sender,
            symbol: dsymbol,
            name: finalname,
            metadata,
            precision,
            maxSupply: api.BigNumber(maxSupply).toFixed(precision),
            supply: '0',
            circulatingSupply: '0',
            stakingEnabled: false,
            unstakingCooldown: 1,
            delegationEnabled: false,
            undelegationCooldown: 0,
          };

          // !! Not sure as owner is a good idea, this we the easiest way I could find a way to bypass a 100 bee fee on token creation
          await api.executeSmartContractAsOwner('tokens', 'create', newToken);


          const burnPairParams = {
            issuer: api.sender,
            symbol: dsymbol,
            name: finalname,
            parentSymbol: symbol,
            burnRouting: finalRouting,
            minConvertableAmount,
            feePercentage,
          };

          await api.db.insert('burnpair', burnPairParams);


          if (api.BigNumber(issueDTokenFee).gt(0)) {
            await api.executeSmartContract('tokens', 'transfer', {
              to: 'null', symbol: 'BEED', quantity: issueDTokenFee, isSignedWithActiveKey,
            });
          }
        } catch (error) {
          // Handle any errors that occur during the await calls source is token.js
          console.error(error);
        }
      }
    }
  }
};


actions.updateBurnPair = async (payload) => { //    this function will update the parameters of the D token in the burnpair table
  const {

    symbol,
    name,
    burnRouting,
    feePercentage,
    isSignedWithActiveKey,
  } = payload;

  const finalRouting = burnRouting === undefined ? 'null' : burnRouting;
  const finalName = name === undefined ? '' : name;

  const burnAccount = await api.db.findOneInTable('tokens', 'balances', { account: burnRouting });
  if (api.assert(burnAccount !== null, 'account for burn routing must exist')) {
    if (api.assert(isSignedWithActiveKey === true, 'you must use a custom_json signed with your active key')
    && api.assert(symbol && typeof symbol === 'string', 'symbol must be string')
    && api.assert(finalName && typeof finalName === 'string', 'token name must be string')
    && api.assert(api.validator.isAlphanumeric(api.validator.blacklist(finalName, ' ')) && finalName.length > 0 && finalName.length <= 50, 'invalid name: letters, numbers, whitespaces only, max length of 50')
    && api.assert(finalRouting && typeof finalRouting === 'string', 'burnroute must be string or null')
    && api.assert(feePercentage && typeof feePercentage === 'string' && !api.BigNumber(feePercentage).isNaN() && api.BigNumber(feePercentage).gte(0) && api.BigNumber(feePercentage).lte(1), 'fee percentage must be between 0 and 1 / 0% and 100%')
    ) {
      const token = await api.db.findOne('burnpair', { symbol });

      api.assert(token !== null && token !== undefined, 'D token must exist');

      if (token) {
        if (api.assert(token.issuer === api.sender, 'must be the issuer')) {
          const params = await api.db.findOne('params', {});
          const { updateParamsFee } = params;

          const beedTokenBalance = await api.db.findOneInTable('tokens', 'balances', { account: api.sender, symbol: 'BEED' });

          const authorizedCreation = beedTokenBalance && api.BigNumber(beedTokenBalance.balance).gte(updateParamsFee);
          if (api.assert(authorizedCreation, 'you must have enough BEED tokens to cover the creation fees')) {
            token.name = finalName;
            token.burnRouting = finalRouting;
            token.feePercentage = feePercentage;
            await api.db.update('burnpair', token);

            if (api.BigNumber(updateParamsFee).gt(0)) {
              await api.executeSmartContract('tokens', 'transfer', {
                to: 'null', symbol: 'BEED', quantity: updateParamsFee, isSignedWithActiveKey,
              });
            }
          }
        }
      }
    }
  }
};
