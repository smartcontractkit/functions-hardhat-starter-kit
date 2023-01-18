// Loads environment variables from .env file (if it exists)
require("dotenv").config()

const getLinkEthPriceFeed = () => {
    if (process.env.MAINNET_RPC_URL) return "0xdc530d9457755926550b59e8eccdae7624181557"
    if (process.env.POLYGON_MAINNET_RPC_URL) return "0xb77fa460604b9c6435a235d057f7d319ac83cb53"
    if (process.env.MUMBAI_RPC_URL) return "0x12162c3E810393dEC01362aBf156D7ecf6159528"
    if (process.env.GOERLI_RPC_URL) return "0xb4c4a493AB6356497713A78FFA6c60FB53517c63"
    if (process.env.SEPOLIA_RPC_URL) return "NOT_AVAILABLE_YET"
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
  goerli: {
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    linkEthPriceFeed: "0xb4c4a493AB6356497713A78FFA6c60FB53517c63",
    functionsOracle: "0xf90Dfc940DB85467DA7632321FcC898D224476B0",
    functionsOracleFactory: "0x4AB8770f17AE630Eaf32AAd67727f05cc9FAD966",
    functionsOracleRegistry: "0x7476a7688C0336EeEc859436Fe9071D27d1cdbf0",
    functionsPublicKey:
      "f2f9c47363202d89aa9fa70baf783d70006fe493471ac8cfa82f1426fd09f16a5f6b32b7c4b5d5165cd147a6e513ba4c0efd39d969d6b20a8a21126f0411b9c6",
  },
  polygon: {
    linkToken: "0xb0897686c545045afc77cf20ec7a532e3120e0f1",
  },
  mumbai: {
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    linkEthPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528",
    functionsOracle: "0x305a8D56144a75C1ce505255feEc9E254E418e17",
    functionsOracleFactory: "0x4E73E14cdA1F16FC0c5B31fe695C5D284b6c9587",
    functionsOracleRegistry: "0x25Db40c0B62fB7a4Cc357d81b9962AF7487259A1",
    functionsPublicKey:
      "f2f9c47363202d89aa9fa70baf783d70006fe493471ac8cfa82f1426fd09f16a5f6b32b7c4b5d5165cd147a6e513ba4c0efd39d969d6b20a8a21126f0411b9c6",
  },
  sepolia: {
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    linkEthPriceFeed: "",
    functionsOracle: "0x642E1EEE05Deedb98D92e3E0efDc37d36F7e6aeB",
    functionsOracleFactory: "",
    functionsOracleRegistry: "0x49A98D5B7fd9B258db53D712C48619A97d36f230",
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
