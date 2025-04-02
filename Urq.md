questions:
    Will  The token pairs always have a D on it?  pal / pald or palm / palmD
     Will the token pairs always have the same creator or the same issuer?
     does the db collection market_metrics not get updated often and so the "lastprice" field is inaccurate?


marketpools_pools
  
_id: 1
tokenPair: "SWAP.HIVE:BEE"
baseQuantity: "106918.98103833"
baseVolume :"33460143.84845312"
basePrice: "2.68997911"
quoteQuantity:"287609.82621386"
quoteVolume:"55329022.24131199"
quotePrice:"0.37175009"
totalShares:"150882.81905373511819707165"
precision:8
creator: "hive-engine"


tokens_tokens


_id:1
issuer: "null"
symbol:"BEE"
name: "Hive Engine Token"
metadata: "{"url":"https://hive-engine.com","icon":"https://s3.amazonaws.com/stee…"
precision:8
maxSupply:"9007199254740991.00000000"
supply:"4027225.02239076"
circulatingSupply:"3171469.01321579"
stakingEnabled:true
unstakingCooldown:40
delegationEnabled:true
undelegationCooldown:7
numberTransactions:4
totalStaked: "605003.66427627"


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


    if (api.assert(tokenIssuer !== null, 'You must be the token issuer in order to issue D token')
    && api.assert(burnRouting === null || (typeof burnRouting === 'string'), 'burn routing must be string')
    && api.assert(minConvertableAmount && typeof minConvertableAmount === 'string' && !api.BigNumber(minConvertableAmount).isNaN() && api.BigNumber(minConvertableAmount).gte(1), 'min convert amount must be string(number) greater than 1')
    && api.assert(feePercentage && typeof feePercentage === 'string' && !api.BigNumber(feePercentage).isNaN() && api.BigNumber(feePercentage).gte(0) && api.BigNumber(feePercentage).lte(1), 'fee percentage must be between 0 and 1 / 0% and 100%')
    ) {
      const burnAccount = await api.db.findOneInTable('tokens', 'balances', { account: burnRouting });
      const dsymbol = `${symbol}-D`;
      const tokenDExists = await api.db.findOneInTable('tokens', 'tokens', { symbol: dsymbol });
      if (api.assert(burnAccount !== null, 'account for burn routing must exist')
        && api.assert(tokenDExists === null, 'D token must not already exist')
      ) { // bootstrap the BEED token into existence
        const tokenProps = {
          name: 'fgfg',
          symbol: dsymbol,
          url,
          precision,
          maxSupply: `${Number.MAX_SAFE_INTEGER}`,
        };

        const meta = {
          url,
          icon: 'https://cdn.tribaldex.com/tribaldex/token-icons/BEE.png',
          desc: 'BEED is the native stablecoin for the Hive Engine platform. You can mint new BEED by burning BEE.',
        };

        const updateData = {
          symbol: dsymbol,
          metadata: meta,
        };


        try {
          await api.executeSmartContract('tokens', 'create', tokenProps);
          await api.executeSmartContract('tokens', 'updateMetadata', updateData);

          // This line will only run if the above two await calls resolve without errors
          console.log('Both actions completed successfully.');
        } catch (error) {
          // Handle any errors that occur during the await calls
          console.error(error);
        }
      }
    }
  }
};