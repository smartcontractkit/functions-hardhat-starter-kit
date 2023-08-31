# Chainlink Functions Starter Kit

- [Chainlink Functions Starter Kit](#chainlink-functions-starter-kit)
- [Overview](#overview)
- [Motivation](#motivation)
  - [Supported Networks](#supported-networks)
    - [Mainnets](#mainnets)
    - [Testnets](#testnets)
- [For Beginners](#for-beginners)
  - [Tutorials \& examples](#tutorials--examples)
- [Quickstart](#quickstart)
  - [Requirements](#requirements)
  - [Steps](#steps)
- [Environment Variable Management](#environment-variable-management)
  - [Environment Variable Management Commands](#environment-variable-management-commands)
- [Functions Command Glossary](#functions-command-glossary)
  - [Functions Commands](#functions-commands)
  - [Functions Subscription Management Commands](#functions-subscription-management-commands)
- [Request Configuration](#request-configuration)
  - [JavaScript Code](#javascript-code)
    - [Functions Library](#functions-library)
  - [Modifying Contracts](#modifying-contracts)
  - [Simulating Requests](#simulating-requests)
  - [Managing Secrets](#managing-secrets)
- [Automation Integration](#automation-integration)
- [Gas Spikes](#gas-spikes)
- [Troubleshooting](#troubleshooting)

# Overview

<p><b>This project is currently in a closed beta. Request access to send on-chain requests here <a href="https://functions.chain.link/">https://functions.chain.link</a>    //TODO</b></p> 

<p>Chainlink Functions allows users to request data from almost publicly accessible HTTP APIs and perform custom computation using JavaScript.</p>
<p>It works by using a <a href="https://chain.link/education/blockchain-oracles#decentralized-oracles">decentralized oracle network</a> (DON).</p>
<p>When a request is initiated, each node in the DON executes the user-provided JavaScript code simultaneously.  Then, nodes use the <a href="https://docs.chain.link/architecture-overview/off-chain-reporting/">Chainlink OCR</a> protocol to come to consensus on the results.  Finally, the median result is returned to the requesting contract via a callback function.</p>
<p>Chainlink Functions also enables users to share encrypted secrets with each node in the DON.  This allows users to access APIs that require authentication, without exposing their API keys to the general public.

# Motivation
This repo provides developers with a "works out of the box" experience as it comes preconfigured with dependencies and popular tooling like [Hardhat](https://hardhat.org). This is not a tutorial for the Hardhat toolchain.  It assumes basic familiarity with Hardhat and the Command line.  We use CLI scripts to run Chainlink Functions commands and operations.

## Supported Networks

### Mainnets

- Not supported yet. // TODO

### Testnets

- Ethereum Sepolia: `ETHEREUM_SEPOLIA_RPC_URL`, `--network ethereumSepolia`
- Polygon Mumbai: `POLYGON_MUMBAI_RPC_URL`, `--network polygonMumbai`
- Avalanche Fuji: `AVALANCHE_FUJI_RPC_URL`, `--network avalancheFuji`

# For Beginners

If you're new to web3, it is recommended starting with the [Functions - Getting Started](https://docs.chain.link/chainlink-functions/getting-started/) guide before diving into the code.

The above document will help you:

- Set up a wallet
- Get funds
- Provides more detailed step-by-step instructions and further information

## Tutorials & examples

For other detailed tutorials and examples, check out the [Chainlink Functions Tutorials](https://docs.chain.link/chainlink-functions/tutorials/) to get started.

# Quickstart

## Requirements

- Node.js version [18](https://nodejs.org/en/download/)

## Steps
Allow at least 15 minutes to set up this project.

1. Clone this repository to your local machine<br><br>
2. Open this directory in your command line/terminal app, then run `npm install` to install all dependencies.<br><br>
3. Acquire a Github personal access token which allows reading and writing Gists.
   1. Visit [https://github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) and click "Generate new token"
   2. Name the token and enable read & write access for Gists from the "Account permissions" drop-down menu. Do not enable any additional permissions.
   3. Click "Generate token" and copy the resulting personal access token for step 4.<br><br>
4. Obtain the values for following environment variables:  
      - `GITHUB_API_TOKEN` for your Github token obtained from step 3
      - `PRIVATE_KEY` for your development wallet
      - `POLYGON_MUMBAI_RPC_URL`, `ETHEREUM_SEPOLIA_RPC_URL`, `AVALANCHE_FUJI_RPC_URL` 
      - `POLYGONSCAN_API_KEY`, `ETHERSCAN_API_KEY`, `FUJI_SNOWTRACE_API_KEY` blockchain explore API keys (no cost) depending on which network you're connecting to
      - `COINMARKETCAP_API_KEY` (from [here](https://pro.coinmarketcap.com/)) so that you can verify contracts upon deployment
<br><br>
5. Set the required environment variables. More detail on environment variable management and the tooling is provided in the [Environment Variable Management](#environment-variable-management) section.
   1. Set an encryption password for your environment variables to a secure password by running:<br>`npx env-enc set-pw`. This password needs to be set each time you create or restart a terminal shell session<br>
   2. Use the command `npx env-enc set` to set the required environment variables :
   3 Set any other  values you intend to pass into the _secrets_ object in _Functions-request-config.js_ .<br><br>
6. There are four files to notice that the default example will use:
   - `/Functions-request-config.js` which contains the `request` object that has all the data necessary to trigger a Functions request. This config file also specifiies which `source` code to pass to Functions. More information on request configuration is in the [Request Configuration section](#request-configuration).
   - `contracts/FunctionsConsumer.sol` is the client smart contract that will receive the Functions-related data from the request config, and trigger the functions request.
   - `calculation-example.js`` contains JavaScript code that will be executed by each node of the DON. This example performs complex calculations but no API requests.
   - `./API-request-example.js` which fetches data from APIs before processing the data <br><br>
7. Simulate a request and it's fulfillment locally by using:<br>`npx hardhat functions-simulate`. This will surface most errors in your smart contract and/or JavaScript source code and configuration.<br><br>
8. Deploy and verify the client contract to an actual blockchain network by running:<br>`npx hardhat functions-deploy-client --network network_name_here --verify true`<br>**Note**: Make sure `<explorer>_API_KEY` is set if using `--verify true`, depending on which network is used.<br><br>
9. Create and fund  a new Functions billing subscription, and then authorize your deployed Client contract to use that subscription by running:<br> `npx hardhat functions-sub-create --network network_name_here --amount LINK_funding_amount_here --contract 0xDeployed_client_contract_address_here`<br><br>**Note**: Ensure your wallet has a sufficient LINK balance before running this command. Testnet LINK can be obtained at <a href="https://faucets.chain.link/">faucets.chain.link</a>.
 **Note**: also make a note of your subscription Id as you will need it for most commands. <br><br> 
10. Make an on-chain request by running:<br>`npx hardhat functions-request --network network_name_here --contract 0xDeployed_client_contract_address_here --subid subscription_id_number_here`

# Environment Variable Management

This repo uses the NPM package `@chainlink/env-enc` for keeping environment variables such as wallet private keys, RPC URLs, and other secrets encrypted at rest. This reduces the risk of credential exposure by ensuring credentials are not visible in plaintext.

By default, all encrypted environment variables will be stored in a file named `.env.enc` in the root directory of this repo. This file is `.gitignore`d.

First, set the encryption password by running the command `npx env-enc set-pw`.
The password must be set at the beginning of each new session.
If this password is lost, there will be no way to recover the encrypted environment variables.

Run the command `npx env-enc set` to set and save environment variables.
These variables will be loaded into your environment when the `config()` method is called at the top of `hardhat.config.js`.
Use `npx env-enc view` to view all currently saved environment variables.
When pressing _ENTER_, the terminal will be cleared to prevent these values from remaining visible.
Running `npx env-enc remove VAR_NAME_HERE` deletes the specified environment variable.
The command `npx env-enc remove-all` deletes the entire saved environment variable file.

When running this command on a Windows machine, you may receive a security confirmation prompt. Enter `r` to proceed.

> **NOTE:** When you finish each work session, close down your terminal to prevent your encryption password from becoming exposes if your machine is compromised. You will need to set the same password on future session to decrypt the `.env.enc` file.

## Environment Variable Management Commands

The following commands accept an optional `--path` flag followed by a path to the desired encrypted environment variable file.
If one does not exist, it will be created automatically by the `npx env-enc set` command.

The `--path` flag has no effect on the `npx env-enc set-pw` command as the password is stored as an ephemeral environment variable for the current terminal session.

| Command                     | Description                                                                                                                                       | Parameters            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `npx env-enc set-pw`        | Sets the password to encrypt and decrypt the environment variable file **NOTE:** On Windows, this command may show a security confirmation prompt |                       |
| `npx env-enc set`           | Sets and saves variables to the encrypted environment variable file                                                                               |                       |
| `npx env-enc view`          | Shows all currently saved variables in the encrypted environment variable file                                                                    |                       |
| `npx env-enc remove <name>` | Removes a variable from the encrypted environment variable file                                                                                   | `name`: Variable name |
| `npx env-enc remove-all`    | Deletes the encrypted environment variable file                                                                                                   |                       |

# Functions Command Glossary

Chainlink Functions rely on Decentralized Oracle Networks to execute your source code.  This network is compensated using funds from your subscription.  You can see pricing details here (TODO). Subscription management commands differ from Chainlink Functions execution commands.  But both [Functions Commands](#functions-commands) and  [Subscription Management Commands](#functions-subscription-management-commands) commands can be executed in the following format:
`npx hardhat command_here --parameter1 parameter_1_value_here --parameter2 parameter_2_value_here`

Example: `npx hardhat functions-read --network polygonMumbai --contract 0x787Fe00416140b37B026f3605c6C72d096110Bb8`

## Functions Commands

| Command                            | Description                                                                                                                          | Parameters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compile`                          | Compiles all smart contracts                                                                                                         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `functions-simulate`               | Simulates an end-to-end fulfillment locally for the _FunctionsConsumer_ contract                                                     | `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 100,000 & must be less than 300,000), `configpath` (optional): Path to request config file (defaults to `./Functions-request-config`.js_)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `functions-deploy-client`          | Deploys the _FunctionsConsumer_ contract                                                                                             | `network`: Name of blockchain network, `verify` (optional): Set to `true` to verify the deployed _FunctionsConsumer_ contract (defaults to `false`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `functions-request`                | Initiates a request from a _FunctionsConsumer_ client contract using data from the Functions request config file                     | `network`: Name of blockchain network, `contract`: Address of the client contract to call, `subid`: Billing subscription ID used to pay for the request, `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 100,000 & must be less than 300,000), `requestgas` (optional): Gas limit for calling the _executeRequest_ function (defaults to 1,500,000), `simulate` (optional): Flag indicating if simulation should be run before making an on-chain request (defaults to true), `configpath` (optional): Path to request config file (defaults to `./Functions-request-config`.js_)                                                              |
| `functions-read`                   | Reads the latest response (or error) returned to a _FunctionsConsumer_ or _AutomatedFunctionsConsumer_ client contract               | `network`: Name of blockchain network, `contract`: Address of the client contract to read, `configpath` (optional): Path to request config file (defaults to `./Functions-request-config`.js_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `functions-deploy-auto-client`     | Deploys the _AutomatedFunctionsConsumer_ contract and sets the Functions request using data from the Functions request config file   | `network`: Name of blockchain network, `subid`: Billing subscription ID used to pay for Functions requests, `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 250000),  `verify` (optional): Set to `true` to verify the deployed _AutomatedFunctionsConsumer_ contract (defaults to `false`), `simulate` (optional): Flag indicating if simulation should be run before making an on-chain request (defaults to true), `configpath` (optional): Path to request config file (defaults to `./Functions-request-config`.js_) |
| `functions-check-upkeep`           | Checks if _checkUpkeep_ returns true for an Automation compatible contract                                                           | `network`: Name of blockchain network, `contract`: Address of the contract to check, `data` (optional): Hex string representing bytes that are passed to the _checkUpkeep_ function (defaults to empty bytes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `functions-perform-upkeep`         | Manually call _performUpkeep_ in an Automation compatible contract                                                                   | `network`: Name of blockchain network, `contract`: Address of the contract to call, `data` (optional): Hex string representing bytes that are passed to the _performUpkeep_ function (defaults to empty bytes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `functions-set-auto-request`       | Updates the Functions request in deployed _AutomatedFunctionsConsumer_ contract using data from the Functions request config file    | `network`: Name of blockchain network, `contract`: Address of the contract to update, `subid`: Billing subscription ID used to pay for Functions requests, `interval` (optional): Update interval in seconds for Chainlink Automation to call _performUpkeep_ (defaults to 300), `slotid` (optional) 0 or higher integer denoting the storage slot for DON-hosted secrets, `ttl` (optional) the minutes after which DON hosted secrets must be expired,  `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 250,000), `simulate` (optional): Flag indicating if simulation should be run before making an on-chain request (defaults to true), `configpath` (optional): Path to request config file (defaults to `./Functions-request-config``.js_)                                                                                                                                                                                                 |
| `functions-set-donid`        | Updates the DonId for a client contract using the `donId` address from `networks.js`                        | `network`: Name of blockchain network, `contract`: Address of the client contract to update                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `functions-build-request`          | Creates a JSON file with Functions request parameters including encrypted secrets, using data from the Functions request config file | `network`: Name of blockchain network, `output` (optional): Output JSON file name (defaults to _Functions-request.json_), `simulate` (optional): Flag indicating if simulation should be run before building the request JSON file (defaults to true), `configpath` (optional): Path to request config file (defaults to `./Functions-request-config``.js_)                                                                                                                                                                                                                                                                                                                                                                |
| `functions-build-offchain-secrets` | Builds an off-chain secrets object that can be uploaded and referenced via URL                                                       | `network`: Name of blockchain network, `output` (optional): Output JSON file name (defaults to `offchain-encrypted-secrets.json`), `configpath` (optional): Path to request config file (defaults to `./Functions-request-config`.js_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Functions Subscription Management Commands

| Command                      | Description                                                                                                                              | Parameters                                                                                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `functions-sub-create`       | Creates a new Functions billing subscription for Functions client contracts                                                              | `network`: Name of blockchain network, `amount` (optional): Initial amount used to fund the subscription in LINK (decimals are accepted), `contract` (optional): Address of the client contract to add to the subscription |
| `functions-sub-info`         | Gets the Functions billing subscription balance, owner, and list of authorized client contract addresses                                 | `network`: Name of blockchain network, `subid`: Subscription ID                                                                                                                                                            |
| `functions-sub-fund`         | Funds a Functions billing subscription with LINK                                                                                         | `network`: Name of blockchain network, `subid`: Subscription ID, `amount`: Amount to fund subscription in LINK (decimals are accepted)                                                                                     |
| `functions-sub-cancel`       | Cancels a Functions billing subscription and refunds the unused balance. Cancellation is only possible if there are no pending requests. | `network`: Name of blockchain network, `subid`: Subscription ID, `refundaddress` (optional): Address where the remaining subscription balance is sent (defaults to caller's address)                                       |
| `functions-sub-add`          | Authorizes a client contract to use the Functions billing subscription                                                                   | `network`: Name of blockchain network, `subid`: Subscription ID, `contract`: Address of the client contract to authorize for billing                                                                                       |
| `functions-sub-remove`       | Removes a client contract from a Functions billing subscription                                                                          | `network`: Name of blockchain network, `subid`: Subscription ID, `contract`: Address of the client contract to remove from billing subscription                                                                            |
| `functions-sub-transfer`     | Request ownership of a Functions subscription be transferred to a new address                                                            | `network`: Name of blockchain network, `subid`: Subscription ID, `newowner`: Address of the new owner                                                                                                                      |
| `functions-sub-accept`       | Accepts ownership of a Functions subscription after a transfer is requested                                                              | `network`: Name of blockchain network, `subid`: Subscription ID                                                                                                                                                            |                                                                                                              |

# Request Configuration

Chainlink Functions requests can be configured by modifying values in the `requestConfig` object found in the _Functions-request-config.js_ file located in the root of this repository.

| Setting Name         | Description                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeLocation`       | This specifies where the JavaScript code for a request is located. Currently, only the `Location.Inline` option is supported (represented by the value `0`). This means the JavaScript string is provided directly in the on-chain request instead of being referenced via a URL.                                                                                     |
| `codeLanguage`       | This specifies the language of the source code which is executed in a request. Currently, only `JavaScript` is supported (represented by the value `0`).                                                                                                                                                                                                              |
| `source`             | This is a string containing the source code which is executed in a request. This must be valid JavaScript code that returns a Buffer. See the [JavaScript Code](#javascript-code) section for more details.                                                                                                                                                           |
| `secrets`            | This is an (optional) object which contains secret values that are injected into the JavaScript source code and can be accessed using the name `secrets`. This object can only contain string values. This object will be automatically encrypted by the tooling using the DON public key before making request. Any DON member can use these secrets when processing a request. |                                                                   |
| `secretsLocation`             | This (optional) value must be present if `secrets` are present. Values must be one of either `DONhosted` or `Remote`. This refers to the location of the Secrets - which can be User-hosted (Remote) at a URL or DON-hosted.  
| `args`               | This is an array of strings which contains values that are injected into the JavaScript source code and can be accessed using the name `args`. This provides a convenient way to set modifiable parameters within a request. If no arguments, then an empty array is passed.                                                                                                                                          |
| `expectedReturnType` | This specifies the expected return type of a request. It has no on-chain impact, but is used by the CLI to decode the response bytes into the specified type. The options are `uint256`, `int256`, `string`, or `bytes`.                                                                                                                                           |

## JavaScript Code

The JavaScript source code for a Functions request can use vanilla Node.js features, but _cannot_ use any `require` statements or imported modules other than the built-in modules `buffer`, `crypto`, `querystring`, `string_decoder`, `url`, and `util`.

It must return a JavaScript Buffer which represents the response bytes that are sent back to the requesting contract.
Encoding functions are provided in the [Functions library](#functions-library).
Additionally, any external APIs to which requests are made must script must return **less than 3 seconds** and the JavaScript Code as a whole must return in **less than 10 seconds** or it will be terminated and send back an error (in bytes) to the requesting contract.

In order to make HTTP requests, the source code must use the `Functions.makeHttpRequest` function from the exposed [Functions library](#functions-library).
Asynchronous code with top-level `await` statements is supported, as shown in the file _API-request-example.js_.

### Functions Library

The `Functions` library is injected into the JavaScript source code and can be accessed using the name `Functions`.

In order to make HTTP requests, only the `Functions.makeHttpRequest` function can be used. All other methods of accessing the Internet are restricted.
The function takes an object with the following parameters.

```
{
  url: String with the URL to which the request is sent,
  method (optional): String specifying the HTTP method to use which can be either 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', or 'OPTIONS' (defaults to 'GET'),
  headers (optional): Object with headers to use in the request,
  params (optional): Object with URL query parameters,
  data (optional): Object which represents the body sent with the request,
  timeout (optional): Number with the maximum request duration in ms (defaults to 5000 ms),
  responseType (optional): String specifying the expected response type which can be either 'json', 'arraybuffer', 'document', 'text' or 'stream' (defaults to 'json'),
}
```

The function returns a promise that resolves to either a success response object or an error response object.

A success response object will have the following parameters.

```
{
  error: false,
  data: Response data sent by the server,
  status: Number representing the response status,
  statusText: String representing the response status,
  headers: Object with response headers sent by the server,
}
```

An error response object will have the following parameters.

```
{
  error: true,
  message (may be undefined): String containing error message,
  code (may be undefined): String containing an error code,
  response (may be undefined): Object containing response sent from the server,
}
```

This library also exposes functions for encoding JavaScript values into Buffers which represent the bytes that a returned on-chain.

- `Functions.encodeUint256` takes a positive JavaScript integer number and returns a Buffer of 32 bytes representing a `uint256` type in Solidity.
- `Functions.encodeInt256` takes a JavaScript integer number and returns a Buffer of 32 bytes representing a `int256` type in Solidity.
- `Functions.encodeString` takes a JavaScript string and returns a Buffer representing a `string` type in Solidity.

Remember, it is not required to use these encoding functions. The JavaScript code must only return a Buffer which represents the `bytes` array that is returned on-chain.

## Modifying Contracts

Client contracts which initiate a request and receive a fulfillment can be modified for specific use cases. The only requirements are that the contract successfully  calls `sendRequest` in the `FunctionsRouter` contract via the inherited `FunctionsClient` contract,  and that it correctly implements the `fulfillRequest` function which is called by `handleOracleFulfillment` in the inherited `FunctionsClient` contract. </br> 
At this time, the maximum amount of gas that _handleOracleFulfillment_ can use is 300,000. See _FunctionsClient.sol_ for details.

## Simulating Requests

An end-to-end request initiation and fulfillment can be simulated for the default _FunctionsConsumer_ contract using the `functions-simulate` command. This command will report the total estimated gas use.
If the _FunctionsConsumer_ client contract is modified, this task must also be modified to accomodate the changes. See `tasks/Functions-client/simulate` for details.

**Note:** The actual gas use on-chain can vary, so it is recommended to set a higher fulfillment gas limit when making a request to account for any differences.

## Managing Secrets

// TODO *maybe just refer to the NPM package here so that we're not double maintaining docs? This will also be covered in the CL docs so we ought not triplicate. This repo should not document secrets management, but should just document how secrets are used in this project*

Secrets can be managed in either of two ways - User-hosted or DON hosted. // TODO link to docs

This project uses DONHosted secrets which means secrets from the `./Functions-request-config.js` file are encrypted and then uploaded to the DON and given a `tty` - the minutes after which these secrets will expire on the DON.

The CLI command do to this is `npx hardhat functions-upload-secrets-don --slotid _0_or_higher --network network_name --ttl minutes_until_expired`.

# Automation Integration

Chainlink Functions can be used with [Chainlink Automation](https://docs.chain.link/chainlink-automation/introduction) in order to automatically trigger a Functions as specified intervals.

1. Create & fund a new Functions billing subscription by running:<br>`npx hardhat functions-sub-create --network network_name_here --amount LINK_funding_amount_here`<br>**Note**: Ensure your wallet has a sufficient LINK balance before running this command.<br><br>

2. Deploy the `AutomationFunctionsConsumer` client contract by running:<br>`npx hardhat functions-deploy-auto-client --network network_name_here --subid subscription_id_number_here --interval time_between_requests_here --verify true`<br>**Note**: Make sure `<blockexplorer>_API_KEY` environment variable is set because this CLI command also verifies the client contract (if --verify is true) using this API KEY. See the [Quick Start section](#quickstart) for more details on blockexplorer API keys. <br><br>

3. Encode the request parameters into CBOR and store it on chain with `npx hardhat functions-set-auto-request --network network_name_here  --subid subscription_id_number_here --interval time_between_requests_here --slotid don_hosted_secret_slotId --ttl minutes_till_secrets_expiry --contract 0x_contract_address` . You can now manually check that your on-chain requests work if you try the manual debugging step #4 or you can go ahead and run Chainlink Automations on your contract by following the next step.

> ⚠️ Keep in mind that this task sets DON-Hosted secrets and expires those secrets after 10 minutes. If you see error bytes returned to your client which decode to secrets not being found, you should run this functions-set-auto-request command or the functions-upload-secrets-don to refresh the DON-hosted secrets for that slotId.

> ⚠️ Keep in mind that this task sets DON-Hosted secrets and expires those secrets after 10 minutes (or minutes you pass in as `--ttl`).  If you execute functions after the `tty` has expired you will see error bytes returned to your client; you should run this `functions-set-auto-request` command or the `functions-upload-secrets-don` to refresh the DON-hosted secrets for that slotId.

4. Register the `AutomationFunctionsConsumer` contract for upkeep via the Chainlink Automation web app here: [https://automation.chain.link/](https://automation.chain.link/)
   - Be sure to set the `Gas limit` for the `performUpkeep` function to a high enough value. The recommended value is 1,000,000.
   - Find further documentation for working with Chainlink Automation here: [https://docs.chain.link/chainlink-automation/introduction](https://docs.chain.link/chainlink-automation/introduction)

Once the contract is registered for upkeep, check the latest response or error with the commands `npx hardhat functions-read --network network_name_here --contract contract_address_here`. Note that you can also pause and unpause your Automation Upkeep using the web app's UI.

4. For debugging on your machine, use the command `npx hardhat functions-check-upkeep --network network_name_here --contract contract_address_here` to see if Automation needs to call `performUpkeep`. If this call returns `false` then the upkeep interval has not yet passed and `performUpkeep` will not execute.

You can also attach a listener to a Subscription ID by updating the `subId` variable in `/scripts/listen.js`, and then running `npm run listen --network your_network_name` from the repo root. To do this open a new terminal or split terminal and run `npm run listen`. This script uses nodemon which restarts the script when you save files or when the listener returns a result.

# Gas Spikes

When on-chain traffic is high, transaction gas prices can spike unexpectedly. This may decrease the accuracy of the estimated requests costs or cause transactions to fail.
In order to mitigate these problems, ensure your Functions subscription balance has a sufficient buffer of two or more times the expected request cost in LINK.
Additionally, you can manually set a hardcoded transaction gas price in the HardHat tooling by modifying the `gasPrice` parameter in the _networks.js_ config file for a particular network.

# Troubleshooting

1. When running Chainlink Functions make sure your subscription ID has your client contract added as an authorized client. Also make sure that your subscription has enough LINK balance. You do this by calling `npx hardhat functions-sub-info --network network_name_here --subid subscription_id_here `

2. When running Chainlink Functions with Automation you also need to ensure the Chainlink Automation Keepers are funded to run the automation calls. The fastest way to maintain your Automation LINK subscription balance is through the Chainlink Automation web app here: [https://automation.chain.link/](https://automation.chain.link/)
