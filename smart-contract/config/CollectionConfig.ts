import CollectionConfigInterface from '../lib/CollectionConfigInterface';
import * as Networks from '../lib/Networks';
import * as Marketplaces from '../lib/Marketplaces';
import whitelistAddresses from './whitelist.json';

const CollectionConfig: CollectionConfigInterface = {
  testnet: Networks.ethereumTestnet,
  mainnet: Networks.ethereumMainnet,
  // The contract name can be updated using the following command:
  // yarn rename-contract NEW_CONTRACT_NAME
  // Please DO NOT change it manually!
  contractName: 'APEtest',
  tokenName: 'APE TEST',
  tokenSymbol: 'APPN',
  hiddenMetadataUri: 'ipfs://__CID__/hidden.json',
  maxSupply: 3333,
  whitelistSale: {
    price: 0.01,
    maxMintAmountPerTx: 1,
  },
  preSale: {
    price: 0.01,
    maxMintAmountPerTx: 2,
  },
  publicSale: {
    price: 0.01,
    maxMintAmountPerTx: 5,
  },
  contractAddress: '0xb125e8852885507119925913607d2bb5c250a10d',
  marketplaceIdentifier: 'APPN',
  marketplaceConfig: Marketplaces.openSea,
  whitelistAddresses,
};

export default CollectionConfig;
