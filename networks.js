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
if (PRIVATE_KEY !== undefined) {
  accounts.push(PRIVATE_KEY)
}
if (SECOND_PRIVATE_KEY !== undefined) {
  accounts.push(SECOND_PRIVATE_KEY)
}

const networks = {
  ethereumSepolia: {
    url: process.env.ETHEREUM_SEPOLIA_RPC_URL || "UNSET",
    gasPrice: undefined,
    accounts,
    verifyApiKey: process.env.ETHERSCAN_API_KEY || "UNSET",
    chainId: 11155111,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "ETH",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    linkPriceFeed: "0x42585eD362B3f1BCa95c640FdFf35Ef899212734",
    functionsRouter: "", // TODO @zeuslawyer
    donId: "", // TODO @zeuslawyer
    gatewayUrls: "", // TODO @zeuslawyer
  },
  polygonMumbai: {
    url: process.env.POLYGON_MUMBAI_RPC_URL || "UNSET",
    gasPrice: undefined,
    accounts,
    verifyApiKey: process.env.POLYGONSCAN_API_KEY || "UNSET",
    chainId: 80001,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "MATIC",
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    linkPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528", // LINK/MATIC
    functionsRouter: "0x2673266D3Cd08b53494B5a92B66DEec7F1408E7A",
    donId: "fun-staging-mumbai-1",
    gatewayUrls: ["https://gateway-stg-one.main.stage.cldev.sh"], //  "https://gateway-stg-two.main.stage.cldev.sh"
  },
  avalancheFuji: {
    url: process.env.AVALANCHE_FUJI_RPC_URL || "UNSET",
    gasPrice: undefined,
    accounts,
    verifyApiKey: process.env.FUJI_SNOWTRACE_API_KEY || "UNSET",
    chainId: 43113,
    confirmations: 2 * DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "AVAX",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    linkPriceFeed: "0x79c91fd4F8b3DaBEe17d286EB11cEE4D83521775", // LINK/AVAX
    functionsRouter: "", // TODO @zeuslawyer
    donId: "", // TODO @zeuslawyer
    gatewayUrls: "", // TODO @zeuslawyer
  },
  // localFunctionsTestnet is updated dynamically by scripts/startLocalFunctionsTestnet.js so it should not be modified here.
  localFunctionsTestnet: {
    url: "http://localhost:8545/",
    accounts,
    confirmations: 1,
    nativeCurrencySymbol: "ETH",
    linkToken: "0x4a70F3e45825DDa29Fe20ea1bF2b4747a4937fCE",
    functionsRouter: "0x96771a175972c1e250df536Fa58E2717BA6d8bA9",
    donId: "coordinator1",
  },
}

module.exports = {
  networks,
}
