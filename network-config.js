// Loads environment variables from .env file (if it exists)
require("dotenv").config()

const getLinkEthPriceFeed = () => {
  if (process.env.MAINNET_RPC_URL) return "0xdc530d9457755926550b59e8eccdae7624181557"
  if (process.env.POLYGON_MAINNET_RPC_URL) return "0xb77fa460604b9c6435a235d057f7d319ac83cb53"
  // Ignore the default example RPC URLs in .env
  if (process.env.MUMBAI_RPC_URL && process.env.MUMBAI_RPC_URL !== "https://polygon-mumbai.g.alchemy.com/v2/ExampleKey")
    return "0x12162c3E810393dEC01362aBf156D7ecf6159528"
  if (process.env.GOERLI_RPC_URL && process.env.GOERLI_RPC_URL !== "https://sepolia.infura.io/v3/ExampleKey")
    return "0xb4c4a493AB6356497713A78FFA6c60FB53517c63"
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
      "f2f9c47363202d89aa9fa70baf783d70006fe493471ac8cfa82f1426fd09f16a5f6b32b7c4b5d5165cd147a6e513ba4c0efd39d969d6b20a8a21126f0411b9c6",
  },
  sepolia: {
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    linkEthPriceFeed: "0x42585eD362B3f1BCa95c640FdFf35Ef899212734",
    functionsOracleProxy: "0xeA6721aC65BCeD841B8ec3fc5fEdeA6141a0aDE4",
    functionsBillingRegistryProxy: "0xEe9Bf52E5Ea228404bB54BCFbbDa8c21131b9039",
    functionsPublicKey:
      "f2f9c47363202d89aa9fa70baf783d70006fe493471ac8cfa82f1426fd09f16a5f6b32b7c4b5d5165cd147a6e513ba4c0efd39d969d6b20a8a21126f0411b9c6",
  },
}

// This is set to 2 for speed & convenience.  For mainnet deployments, it is recommended to set this to 6 or higher
const VERIFICATION_BLOCK_CONFIRMATIONS = 2

module.exports = {
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
}
