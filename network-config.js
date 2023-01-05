// Loads environment variables from .env file (if it exists)
require('dotenv').config()

const networkConfig = {
    hardhat: {
        // TODO: for networks other than mainnet, gas costs should be calculated the native token, not ETH
        linkEthPriceFeed:
            `${
                process.env.MUMBAI_RPC_URL ? '0x12162c3E810393dEC01362aBf156D7ecf6159528' : ''
            }${
                process.env.GOERLI_RPC_URL ? '0xb4c4a493AB6356497713A78FFA6c60FB53517c63' : ''
            }${
                process.env.POLYGON_MAINNET_RPC_URL ? '0xb77fa460604b9c6435a235d057f7d319ac83cb53' : ''
            }${
                process.env.MAINNET_RPC_URL ? '0xdc530d9457755926550b59e8eccdae7624181557' : ''
            }`,
        ocr2drPublicKey:
            "971f006163a12ee3383a00d7743334480d6b1c83fdf60497e0c520b16d1a4ee421cc61375679b63466156fee6f2f1da5a7e630ba0b1cddb2704ef907ead223db",
        mockOcr2odPrivateKey: "0x09768a19def4dce2b6793d7dc807828ef47b681709cf1005627a93f0da9c8065",
    },
    mainnet: {
        linkToken: "0x514910771af9ca656af840dff83e8264ecf986ca",
    },
    goerli: {
        linkToken: "0x326c977e6efc84e512bb9c30f76e30c160ed06fb",
        linkEthPriceFeed: "0xb4c4a493AB6356497713A78FFA6c60FB53517c63",
        ocr2drOracle: "0xBAE17CF0694dF955F715D2eDC6cF0C86246Ed7Af",
        ocr2drOracleFactory: "0x5b2E2a078c6CF99c7Aa61555034CaD28cA08a54f",
        ocr2drOracleRegistry: "0x70511301892257bbD0071043E41385dF40Cd99f5",
        ocr2drPublicKey:
            "f2f9c47363202d89aa9fa70baf783d70006fe493471ac8cfa82f1426fd09f16a5f6b32b7c4b5d5165cd147a6e513ba4c0efd39d969d6b20a8a21126f0411b9c6",
    },
    polygon: {
        linkToken: "0xb0897686c545045afc77cf20ec7a532e3120e0f1",
    },
    mumbai: {
        linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
        linkEthPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528",
        ocr2drOracle: "0x0e9C779d5f2aDe5cf642433C584904B249441eFb",
        ocr2drOracleFactory: "0xF4387B2Ad01B479d1ba18e9A101C35d96A83d5a5",
        ocr2drOracleRegistry: "0xE7e4882E6cc98b4c20A5155ca83A18C85aaBfCe6",
        ocr2drPublicKey: "f2f9c47363202d89aa9fa70baf783d70006fe493471ac8cfa82f1426fd09f16a5f6b32b7c4b5d5165cd147a6e513ba4c0efd39d969d6b20a8a21126f0411b9c6",
    },
}

// This is set to 2 for speed & convenience.  For mainnet deployments, it is recommended to set this to 6 or higher
const VERIFICATION_BLOCK_CONFIRMATIONS = 2

module.exports = {
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
}
