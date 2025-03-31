const chainIdentifier = 'mainnet-hive';

if (refBlockNumber >= 54106800) {
    id = `ssc-${chainIdentifier}`;
    permlink = operationValue.permlink; // eslint-disable-line prefer-destructuring
    sscTransactions = [
      {
        contractName: 'comments',
        contractAction: 'comment',
        contractPayload: {
          author: operationValue.author,
          jsonMetadata: commentMeta,
          parentAuthor: operationValue.parent_author,
          parentPermlink: operationValue.parent_permlink,
        },
      },
    ];
  }