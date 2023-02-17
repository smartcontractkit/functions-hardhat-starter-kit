// Loads environment variables from .env file (if it exists)
require("dotenv").config()

const getLinkEthPriceFeed = () => {
  if (process.env.MAINNET_RPC_URL) return "0xdc530d9457755926550b59e8eccdae7624181557"
  if (process.env.POLYGON_MAINNET_RPC_URL) return "0xb77fa460604b9c6435a235d057f7d319ac83cb53"
  // Ignore the default example RPC URLs in .env
  if (process.env.MUMBAI_RPC_URL && process.env.MUMBAI_RPC_URL !== "https://polygon-mumbai.g.alchemy.com/v2/ExampleKey")
    return "0x12162c3E810393dEC01362aBf156D7ecf6159528"
  if (
    process.env.SEPOLIA_RPC_URL &&
    process.env.SEPOLIA_RPC_URL !== "https://polygon-mumbai.g.alchemy.com/v2/ExampleKey"
  )
    return "0x42585eD362B3f1BCa95c640FdFf35Ef899212734"
}

const networkConfig = {
  hardhat: {
    // TODO: for networks other than mainnet, gas costs should be calculated the native token, not ETH
    linkEthPriceFeed: getLinkEthPriceFeed(),
    functionsPublicKey:
      "971f006163a12ee3383a00d7743334480d6b1c83fdf60497e0c520b16d1a4ee421cc61375679b63466156fee6f2f1da5a7e630ba0b1cddb2704ef907ead223db",
    mockFunctionsPrivateKey: "0x09768a19def4dce2b6793d7dc807828ef47b681709cf1005627a93f0da9c8065",
  },
  mainnet: {
    linkToken: "0x514910771af9ca656af840dff83e8264ecf986ca",
  },
  polygon: {
    linkToken: "0xb0897686c545045afc77cf20ec7a532e3120e0f1",
  },
  mumbai: {
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    linkEthPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528",
    functionsOracleProxy: "0xeA6721aC65BCeD841B8ec3fc5fEdeA6141a0aDE4",
    functionsBillingRegistryProxy: "0xEe9Bf52E5Ea228404bB54BCFbbDa8c21131b9039",
    functionsPublicKey:
      "a30264e813edc9927f73e036b7885ee25445b836979cb00ef112bc644bd16de2db866fa74648438b34f52bb196ffa386992e94e0a3dc6913cee52e2e98f1619c",
  },
  sepolia: {
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    linkEthPriceFeed: "0x42585eD362B3f1BCa95c640FdFf35Ef899212734",
    functionsOracleProxy: "0x649a2C205BE7A3d5e99206CEEFF30c794f0E31EC",
    functionsBillingRegistryProxy: "0x3c79f56407DCB9dc9b852D139a317246f43750Cc",
    functionsPublicKey:
      "a30264e813edc9927f73e036b7885ee25445b836979cb00ef112bc644bd16de2db866fa74648438b34f52bb196ffa386992e94e0a3dc6913cee52e2e98f1619c",
  },
}

// This is set to 2 for speed & convenience.  For mainnet deployments, it is recommended to set this to 6 or higher
const VERIFICATION_BLOCK_CONFIRMATIONS = 2

module.exports = {
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
}
