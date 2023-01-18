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
    functionsOracle: "0xeB6863217327B044Ac3380D4122b32951377389A",
    functionsOracleFactory: "0x3F43f18E05b2578FDe8e55FC71383D0d02e05150",
    functionsOracleRegistry: "0x510edc20c85B414e765A14fE3d6D3909d2e204a0",
    functionsPublicKey:
      "f2f9c47363202d89aa9fa70baf783d70006fe493471ac8cfa82f1426fd09f16a5f6b32b7c4b5d5165cd147a6e513ba4c0efd39d969d6b20a8a21126f0411b9c6",
  },
  polygon: {
    linkToken: "0xb0897686c545045afc77cf20ec7a532e3120e0f1",
  },
  mumbai: {
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    linkEthPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528",
    functionsOracle: "0x6199175d137B791B7AB06C3452aa6acc3519b254",
    functionsOracleFactory: "0xCBEAb3ECc3Af26bE11E25767bc6DDA5f0B129BEA",
    functionsOracleRegistry: "0xB12044Ba63F66191E53b0Cd8C10095080b4c8434",
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
