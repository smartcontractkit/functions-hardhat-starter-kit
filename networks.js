// All supported networks and related contract addresses are defined here.
//
// LINK token addresses: https://docs.chain.link/resources/link-token-contracts/
// Price feeds addresses: https://docs.chain.link/data-feeds/price-feeds/addresses
// Chain IDs: https://chainlist.org/?testnets=true

// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config()

const DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS = 2

const npmCommand = process.env.npm_lifecycle_event
const isTestEnvironment = npmCommand == "test" || npmCommand == "test:unit"

// Set EVM private keys (required)
const PRIVATE_KEY = process.env.PRIVATE_KEY

// TODO @dev - set this to run the accept.js task.
const SECOND_PRIVATE_KEY = process.env.SECOND_PRIVATE_KEY

if (!isTestEnvironment && !PRIVATE_KEY) {
  throw Error("Set the PRIVATE_KEY environment variable with your EVM wallet private key")
}

const accounts = []
if (PRIVATE_KEY) {
  accounts.push(PRIVATE_KEY)
}
if (SECOND_PRIVATE_KEY) {
  accounts.push(SECOND_PRIVATE_KEY)
}

const networks = {
  ethereum: {
    url: process.env.ETHEREUM_RPC_URL || "UNSET",
    gasPrice: undefined,
    nonce: undefined,
    accounts,
    verifyApiKey: process.env.ETHERSCAN_API_KEY || "UNSET",
    chainId: 1,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "ETH",
    linkToken: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    linkPriceFeed: "0xDC530D9457755926550b59e8ECcdaE7624181557", // LINK/ETH
    functionsRouter: "0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6",
    donId: "fun-ethereum-mainnet-1",
    gatewayUrls: ["https://01.functions-gateway.chain.link/", "https://02.functions-gateway.chain.link/"],
  },
  avalanche: {
    url: process.env.AVALANCHE_RPC_URL || "UNSET",
    gasPrice: undefined,
    nonce: undefined,
    accounts,
    verifyApiKey: process.env.SNOWTRACE_API_KEY || "UNSET",
    chainId: 43114,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "AVAX",
    linkToken: "0x5947BB275c521040051D82396192181b413227A3",
    linkPriceFeed: "0x1b8a25F73c9420dD507406C3A3816A276b62f56a", // LINK/AVAX
    functionsRouter: "0x9f82a6A0758517FD0AfA463820F586999AF314a0",
    donId: "fun-avalanche-mainnet-1",
    gatewayUrls: ["https://01.functions-gateway.chain.link/", "https://02.functions-gateway.chain.link/"],
  },
  polygon: {
    url: process.env.POLYGON_RPC_URL || "UNSET",
    gasPrice: undefined,
    nonce: undefined,
    accounts,
    verifyApiKey: process.env.POLYGONSCAN_API_KEY || "UNSET",
    chainId: 137,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "ETH",
    linkToken: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
    linkPriceFeed: "0x5787BefDc0ECd210Dfa948264631CD53E68F7802", // LINK/MATIC
    functionsRouter: "0xdc2AAF042Aeff2E68B3e8E33F19e4B9fA7C73F10",
    donId: "fun-polygon-mainnet-1",
    gatewayUrls: ["https://01.functions-gateway.chain.link/", "https://02.functions-gateway.chain.link/"],
  },
  ethereumSepolia: {
    url: process.env.ETHEREUM_SEPOLIA_RPC_URL || "UNSET",
    gasPrice: undefined,
    nonce: undefined,
    accounts,
    verifyApiKey: process.env.ETHERSCAN_API_KEY || "UNSET",
    chainId: 11155111,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "ETH",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    linkPriceFeed: "0x42585eD362B3f1BCa95c640FdFf35Ef899212734", // LINK/ETH
    functionsRouter: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
    donId: "fun-ethereum-sepolia-1",
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
  },
  polygonMumbai: {
    url: process.env.POLYGON_MUMBAI_RPC_URL || "UNSET",
    gasPrice: 20_000_000_000,
    nonce: undefined,
    accounts,
    verifyApiKey: process.env.POLYGONSCAN_API_KEY || "UNSET",
    chainId: 80001,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "MATIC",
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    linkPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528", // LINK/MATIC
    functionsRouter: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
    donId: "fun-polygon-mumbai-1",
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
  },
  avalancheFuji: {
    url: process.env.AVALANCHE_FUJI_RPC_URL || "UNSET",
    gasPrice: undefined,
    nonce: undefined,
    accounts,
    verifyApiKey: process.env.FUJI_SNOWTRACE_API_KEY || "UNSET",
    chainId: 43113,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "AVAX",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    linkPriceFeed: "0x79c91fd4F8b3DaBEe17d286EB11cEE4D83521775", // LINK/AVAX
    functionsRouter: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
    donId: "fun-avalanche-fuji-1",
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
  },
  // localFunctionsTestnet is updated dynamically by scripts/startLocalFunctionsTestnet.js so it should not be modified here
  localFunctionsTestnet: {
    url: "http://localhost:8545/",
    accounts,
    confirmations: 1,
    nativeCurrencySymbol: "ETH",
    linkToken: "0x94d3C68A91C972388d7863D25EDD2Be7e2F21F21",
    functionsRouter: "0xCbfD616baE0F13EFE0528c446184C9C0EAa8040e",
    donId: "local-functions-testnet",
  },
}

module.exports = {
  networks,
}
