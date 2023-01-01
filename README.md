# Chainlink On-Demand OCR Starter Kit

Recommended Node.js version: 18

- [Chainlink On-Demand OCR Starter Kit](#chainlink-on-demand-ocr-starter-kit)
- [Overview](#overview)
- [Quickstart](#quickstart)
- [Request Configuration](#request-configuration)
  - [JavaScript Code](#javascript-code)
    - [OCR2DR Library](#ocr2dr-library)
  - [Modifying Contracts](#modifying-contracts)
  - [Simulating Requests](#simulating-requests)
- [Command Glossary](#command-glossary)
  - [`npm run` Commands](#npm-run-commands)
  - [`npx hardhat` Commands](#npx-hardhat-commands)
    - [On-Demand Commands](#on-demand-commands)
  - [On-Demand Subscription Managment Commands](#on-demand-subscription-managment-commands)
  - [Admin Commands](#admin-commands)
  
# Overview

<p>Chainlink On-Demand OCR allows users to request data from almost any API and perform custom computation using JavaScript.</p>
<p>It works by using a <a href="https://chain.link/education/blockchain-oracles#decentralized-oracles">decentralized oracle network</a> (DON).<br>When a request is initiated, each node in the DON executes the user-provided JavaScript code simultaneously.  Then, nodes use the <a href="https://docs.chain.link/architecture-overview/off-chain-reporting/">Chainlink OCR</a> protocol to come to consensus on the results.  Finally, the median result is returned to the requesting contract via a callback function.</p>
<p>Chainlink On-Demand OCR also enables users to share encrypted secrets with each node in the DON.  This allows users to access to APIs that require authentication, without exposing their API keys to the general public.

# Quickstart

# Request Configuration

Chainlink On-Demand OCR requests can be configured by modifying values in the `requestConfig` object found in the `on-demand-request-config.js` file located in the root of this repository.

| Setting Name | Description |
| --------------------- | ----------- |
| `codeLocation` | This specifies where the JavaScript code for a request is located.  Currenly, only the `Inline` option is supported (represented by the value `0`).  This means the JavaScript string is provided directly in the on-chain request instead of being referenced via a URL or IPFS hash. |
| `secretsLocation` | This specifies where the encrypted secrets for a request are located.  Currenly, only the `Inline` option is supported (represented by the value `0`).  This means encypted secrets are provided directly in the on-chain request instead of being referenced via a URL or IPFS hash. |
| `codeLanguage` | This specifies the language of the source code which is executed in a request.  Currently, only `JavaScript` is supported (represented by the value `0`). |
| `source` | This is a string containing the source code which is executed in a request.  This must be valid JavaScript code that returns a Buffer.  See the [JavaScript Code](#javascript-code) section for more details. |
| `secrets` | This is a JavaScript object which contains secret values that are injected into the JavaScript source code and can be accessed using the name `secrets`.  This object will be automatically encrypted by the tooling using the DON public key before making an on-chain request. |
| `walletPrivateKey` | This is the EVM private key.  It is used to generate a signature for the encrypted secrets such that the secrets cannot be reused by an unauthorized 3rd party. |
| `DONPublicKey` | This is the DON's public encryption key used to encrypt secrets.  This value is only used by the `npm run on-demand-build-request` command.  All other commands fetch the DON key directly from the `OCR2DROracle` contract on-chain. |
| `args` | This is an array of strings which contains values that are injected into the JavaScript source code and can be accessed using the name `args`.  This provides a convenient way to set modifiable parameters within a request. |
| `maxResponseBytes` | This specifies the maximum size of a response.  If the response size is exceeded, it will be curtailed to this size.  It has no on-chain impact, but is used by the CLI to simulate on-chain behavior for responses which are too large.  It is recommended not to change this value. |
| `expectedReturnType` | This specifies the expected return type of a request.  It has no on-chain impact, but is used by the CLI to decode the response bytes into the specified type.  The options are `uint256`, `int256`, `string`, or `Buffer`. |

## JavaScript Code

### OCR2DR Library

## Modifying Contracts

Client contracts which initiate a request and receive a fulfillment can be modified for specific use cases.  The only requirements are that the client contract extends the `OCR2DRClient` contract and the `fulfillRequest` callback function never uses more than 300,000 gas.

## Simulating Requests

An end-to-end request and fulfillment can be simulated using the `npx hardhat on-demand-simulate` command.  This command will report the total estimated cost of a request in LINK using the latest on-chain gas prices.  Costs are based on the amount of gas used to validate the response and call the client contract's `fulfillRequest` function, plus a flat fee.  Please note that actual request costs can vary based on gas prices when a request is inititated on-chain.

# Command Glossary

## `npm run` Commands

| Command | Description |
| ------- | ----------- |


## `npx hardhat` Commands

### On-Demand Commands

| Command                   | Description                                                                   | Parameters                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `on-demand-simulate`      | Simulates an end-to-end fulfillment locally for the OnDemandConsumer contract | `gaslimit` (optional): Maximum amount of gas that can be used to call fulfillRequest in the client contract (defaults to 100,000)                                                                                                                   |
| `on-demand-deploy-client` | Deploys the OnDemandConsumer contract                                         |                                                                                                                                                                                                                                                     |
| `on-demand-request`       | Initiates a request from an OnDemandConsumer client contract                  | `contract`: Address of the client contract to call, `subid`: Billing subscription ID used to pay for the request, `gaslimit` (optional): Maximum amount of gas that can be used to call fulfillRequest in the client contract (defaults to 100,000) |
| `on-demand-read`          | Reads the latest response returned to a OnDemandConsumer client contract      | `contract`: Address of the client contract to read                                                                                                                                                                                                  |
| `on-demand-read-error`    | Reads the latest error returned to a OnDemandConsumer client contract         | `contract`: Address of the client contract to read                                                                                                                                                                                                  |

## On-Demand Subscription Managment Commands

| Command                  | Description                                                                                                                       | Parameters                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `on-demand-sub-create`   | Creates a new billing subscription for On-Demand consumer contracts                                                               | `amount` (optional): Inital amount used to fund the subscription in LINK, `contract` (optional): Address of the client contract address authorized to use the new billing subscription |
| `on-demand-sub-info`     | Gets the On-Demand billing subscription balance, owner, and list of authorized consumer contract addresses                        | `subid`: Subscription ID                                                                                                                                                               |
| `on-demand-sub-fund`     | Funds a billing subscription for On-Demand consumer contracts                                                                     | `subid`: Subscription ID, `amount`: Amount to fund subscription in LINK                                                                                                                |
| `on-demand-sub-cancel`   | Cancels On-Demand billing subscription and refunds unused balance. Cancellation is only possible if there are no pending requests | `subid`: Subscription ID, `refundaddress` (optional): Address where the remaining subscription balance is sent (defaults to caller's address)                                          |
| `on-demand-sub-add`      | Adds a client contract to the On-Demand billing subscription                                                                      | `subid`: Subscription ID, `contract`: Address of the On-Demand client contract to authorize for billing                                                                                |
| `on-demand-sub-remove`   | Removes a client contract from an On-Demand billing subscription                                                                  | `subid`: Subscription ID, `contract`: Address of the client contract to remove from billing subscription                                                                               |
| `on-demand-sub-transfer` | Request ownership of an On-Demand subscription be transferred to a new address                                                    | `subid`: Subscription ID, `newowner`: Address of the new owner                                                                                                                         |
| `on-demand-sub-accept`   | Accepts ownership of an On-Demand subscription after a transfer is requested                                                      | `subid`: Subscription ID                                                                                                                                                               |

## Admin Commands

| Command                    | Description                                                                                 | Parameters                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `on-demand-set-ocr-config` | Sets the OCR config using values from on-demand-request.json                                |                                                |
| `on-demand-add-senders`    | Add wallets to allowlist in the Oracle contract                                             | `addresses`: Comma-separated list of addresses |
| `on-demand-set-don-key`    | Sets the DON public key in the On-Demand oracle contract using value from network-config.js |                                                |
| `on-demand-remove-senders` | Remove wallets from allowlist in the Oracle contract                                        | `addresses`: Comma-separated list of addresses |
