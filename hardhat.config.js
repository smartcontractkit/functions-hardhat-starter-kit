require("@nomicfoundation/hardhat-toolbox")
require("hardhat-contract-sizer")
require("./tasks")
require("dotenv").config()

// Set one of the following RPC endpoints (required)
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL

// Ensure one of the RPC endpoints has been set
let setRpcUrlCount = 0
if (!MAINNET_RPC_URL && !POLYGON_MAINNET_RPC_URL && !MUMBAI_RPC_URL && !GOERLI_RPC_URL) {
  throw Error(
    "One of the following environment variables must be set: MAINNET_RPC_URL, GOERLI_RPC_URL, POLYGON_MAINNET_RPC_URL, or MUMBAI_RPC_URL"
  )
}

// Set EVM private key (required)
const PRIVATE_KEY = process.env.PRIVATE_KEY
if (!PRIVATE_KEY) {
  throw Error("Set the PRIVATE_KEY environment variable with your EVM wallet private key")
}

// Set a specific bock number to fork (optional)
const FORKING_BLOCK_NUMBER = isNaN(process.env.FORKING_BLOCK_NUMBER) ? undefined : parseInt(process.env.FORKING_BLOCK_NUMBER)

// Your API key for Etherscan, obtain one at https://etherscan.io/ (optional)
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "Your etherscan API key"
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key"

// Enable gas reporting (optional)
const REPORT_GAS = process.env.REPORT_GAS?.toLowerCase() === "true" ? true : false

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1_000,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1_000,
          },
        },
      },
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1_000,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      hardfork: "merge",
      forking: {
        url: MAINNET_RPC_URL ?? POLYGON_MAINNET_RPC_URL ?? GOERLI_RPC_URL ?? MUMBAI_RPC_URL,
        blockNumber: FORKING_BLOCK_NUMBER,
        enabled: true,
      },
      chainId: 31337,
      accounts: process.env.PRIVATE_KEY
        ? [
            {
              privateKey: process.env.PRIVATE_KEY,
              balance: "10000000000000000000000",
            },
          ]
        : [],
    },
    goerli: {
      url: GOERLI_RPC_URL ?? '',
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 5,
    },
    mainnet: {
      url: MAINNET_RPC_URL ?? '',
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 1,
    },
    polygon: {
      url: POLYGON_MAINNET_RPC_URL ?? '',
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 137,
    },
    mumbai: {
      url: MUMBAI_RPC_URL ?? '',
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      // TODO: check if this is still needed
      gas: 3_000_000,
      chainId: 80001,
    },
  },
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
  },
  contractSizer: {
    runOnCompile: false,
    only: ["FunctionsConsumer", "AutomatedFunctionsConsumer", "FunctionsBillingRegistry"],
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
