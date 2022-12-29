const ethers = require("ethers")
const { networkConfig } = require("./helper-hardhat-config")
require("@nomicfoundation/hardhat-toolbox")
require("hardhat-contract-sizer")
require("./tasks")
require("dotenv").config()

const MAINNET_RPC_URL =
    process.env.MAINNET_RPC_URL ||
    process.env.ALCHEMY_MAINNET_RPC_URL ||
    "https://eth-mainnet.alchemyapi.io/v2/your-api-key"
const POLYGON_MAINNET_RPC_URL =
    process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-mainnet.alchemyapi.io/v2/your-api-key"
MUMBAI_RPC_URL = 
    process.env.MUMBAI_RPC_URL || "https://polygon-mumbai.g.alchemy.com/v2/v2/your-api-key"
const GOERLI_RPC_URL =
    process.env.GOERLI_RPC_URL || "https://eth-goerli.alchemyapi.io/v2/your-api-key"
const PRIVATE_KEY = process.env.PRIVATE_KEY
if (!PRIVATE_KEY) {
    throw Error('Set the PRIVATE_KEY environment variable with your EVM wallet private key')
}

let setRpcUrlCount = 0
if (MAINNET_RPC_URL !== "https://eth-mainnet.alchemyapi.io/v2/your-api-key") setRpcUrlCount++
if (POLYGON_MAINNET_RPC_URL !== "https://polygon-mainnet.alchemyapi.io/v2/your-api-key") setRpcUrlCount++
if (GOERLI_RPC_URL !== "https://eth-goerli.alchemyapi.io/v2/your-api-key") setRpcUrlCount++
if (MUMBAI_RPC_URL !== "https://polygon-mumbai.g.alchemy.com/v2/v2/your-api-key") setRpcUrlCount++
if (setRpcUrlCount > 1) {
    throw Error(
        'Only 1 of the following environment variables can be set: ALCHEMY_MAINNET_RPC_URL, MAINNET_RPC_URL, GOERLI_RPC_URL, POLYGON_MAINNET_RPC_URL, or MUMBAI_RPC_URL'
    )
}
if (setRpcUrlCount === 0) {
    throw Error(
        '1 of the following environment variables must be set: ALCHEMY_MAINNET_RPC_URL, MAINNET_RPC_URL, GOERLI_RPC_URL, POLYGON_MAINNET_RPC_URL, or MUMBAI_RPC_URL'
    )
}

const FORKING_BLOCK_NUMBER = process.env.FORKING_BLOCK_NUMBER
    ? parseInt(process.env.FORKING_BLOCK_NUMBER)
    : undefined

// Your API key for Etherscan, obtain one at https://etherscan.io/
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "Your etherscan API key"
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key"

const REPORT_GAS = process.env.REPORT_GAS || false

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.7",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100_000_000,
                    },
                },
            },
            {
                version: "0.6.6",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100_000_000,
                    },
                },
            },
            {
                version: "0.4.24",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100_000_000,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            hardfork: "merge",
            // If you want to do some forking set `enabled` to true
            // TODO: fix this so the fork is correct
            forking: {
                url:
                    `${
                        GOERLI_RPC_URL != 'https://eth-goerli.alchemyapi.io/v2/your-api-key' ? GOERLI_RPC_URL : ''
                    }${
                        MUMBAI_RPC_URL != 'https://polygon-mumbai.g.alchemy.com/v2/v2/your-api-key' ? MUMBAI_RPC_URL : ''
                    }${
                        POLYGON_MAINNET_RPC_URL != 'https://polygon-mainnet.alchemyapi.io/v2/your-api-key' ? POLYGON_MAINNET_RPC_URL : ''
                    }${
                        MAINNET_RPC_URL != 'https://eth-mainnet.alchemyapi.io/v2/your-api-key' ? MAINNET_RPC_URL : ''
                    }`,
                blockNumber: FORKING_BLOCK_NUMBER,
                enabled: true,
            },
            chainId: 31337,
            accounts:
                process.env.PRIVATE_KEY ?
                    [{
                        privateKey: process.env.PRIVATE_KEY,
                        balance: "10000000000000000000000",
                    }]
                    : [],
        },
        localhost: {
            chainId: 31337,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            chainId: 5,
        },
        mainnet: {
            url: MAINNET_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            chainId: 1,
        },
        polygon: {
            url: POLYGON_MAINNET_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            chainId: 137,
        },
        mumbai: {
            url: MUMBAI_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            gas: 3_000_000,
            chainId: 80001,
        },
    },
    defaultNetwork: "hardhat",
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            polygon: POLYGONSCAN_API_KEY,
            goerli: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    contractSizer: {
        runOnCompile: false,
        only: [
            "APIConsumer",
            "AutomationCounter",
            "NFTFloorPriceConsumerV3",
            "PriceConsumerV3",
            "RandomNumberConsumerV2",
            "OCR2DRRegistry",
        ],
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./build/cache",
        artifacts: "./build/artifacts",
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
}
