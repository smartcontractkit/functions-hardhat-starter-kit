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
            "7e00a17e0d8c5c59bbe1f580f2405d51feb66c947fe66136190e80aabaf850964b837bcd379a92d5db52d2a8c8e044f8033cb981450bf3710ead0c4a43122ec1",
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
            "7e00a17e0d8c5c59bbe1f580f2405d51feb66c947fe66136190e80aabaf850964b837bcd379a92d5db52d2a8c8e044f8033cb981450bf3710ead0c4a43122ec1",
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
        ocr2drPublicKey: "7e00a17e0d8c5c59bbe1f580f2405d51feb66c947fe66136190e80aabaf850964b837bcd379a92d5db52d2a8c8e044f8033cb981450bf3710ead0c4a43122ec1",
    },
}

// This is set to 2 for speed & convenience.  For mainnet deployments, it is recommended to set this to 6 or higher
const VERIFICATION_BLOCK_CONFIRMATIONS = 2

module.exports = {
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
}
