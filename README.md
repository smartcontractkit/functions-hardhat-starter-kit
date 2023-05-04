# Chainlink Functions Starter Kit

- [Chainlink Functions Starter Kit](#chainlink-functions-starter-kit)
- [Overview](#overview)
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
  - [Off-chain Secrets](#off-chain-secrets)
- [Automation Integration](#automation-integration)
- [Gas Spikes](#gas-spikes)

# Overview

<p><b>This project is currently in a closed beta. Request access to send on-chain requests here <a href="https://functions.chain.link/">https://functions.chain.link/</a></b></p>

<p>Chainlink Functions allows users to request data from almost any API and perform custom computation using JavaScript.</p>
<p>It works by using a <a href="https://chain.link/education/blockchain-oracles#decentralized-oracles">decentralized oracle network</a> (DON).<br>When a request is initiated, each node in the DON executes the user-provided JavaScript code simultaneously.  Then, nodes use the <a href="https://docs.chain.link/architecture-overview/off-chain-reporting/">Chainlink OCR</a> protocol to come to consensus on the results.  Finally, the median result is returned to the requesting contract via a callback function.</p>
<p>Chainlink Functions also enables users to share encrypted secrets with each node in the DON.  This allows users to access APIs that require authentication, without exposing their API keys to the general public.

## Supported Networks

### Mainnets

- Not supported yet.

### Testnets

- Ethereum Sepolia: `ETHEREUM_SEPOLIA_RPC_URL`, `--network ethereumSepolia`
- Polygon Mumbai: `POLYGON_MUMBAI_RPC_URL`, `--network polygonMumbai`
- Avalanche Fuji: `AVALANCHE_FUJI_RPC_URL`, `--network avalancheFuji`

# For Beginners

If you're new to web3, it is recommended starting with the [Functions - Getting Started](https://docs.chain.link/chainlink-functions/getting-started/) before diving into the code.

The above document will help you:

- Set up a wallet
- Get funds
- Provides more detailed step-by-step instructions and further information

## Tutorials & examples

For more detailed tutorials and examples, check out the [Chainlink Functions Tutorials](https://docs.chain.link/chainlink-functions/tutorials/) to get started.

# Quickstart

## Requirements

- Node.js version [18](https://nodejs.org/en/download/)

## Steps

1. Clone this repository to your local machine<br><br>
2. Open this directory in your command line, then run `npm install` to install all dependencies.<br><br>
3. Aquire a Github personal access token which allows reading and writing Gists.
   1. Visit [https://github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) and click "Generate new token"
   2. Name the token and enable read & write access for Gists from the "Account permissions" drop-down menu. Do not enable any additional permissions.
   3. Click "Generate token" and copy the resulting personal access token for step 4.<br><br>
4. Set the required environment variables.
   1. Set an encryption password for your environment variables to a secure password by running:<br>`npx env-enc set-pw`<br>
   2. Use the command `npx env-enc set` to set the required environment variables (see [Environment Variable Management](#environment-variable-management)):
      - _GITHUB_API_TOKEN_ for your Github token obtained from step 3
      - _PRIVATE_KEY_ for your development wallet
      - _POLYGON_MUMBAI_RPC_URL_, _ETHEREUM_SEPOLIA_RPC_URL_, _AVALANCHE_FUJI_RPC_URL_ for the network that you intend to use
   3. If desired, the `<explorer>_API_KEY` can be set in order to verify contracts, along with any values used in the _secrets_ object in _Functions-request-config.js_ such as `COINMARKETCAP_API_KEY`.<br><br>
5. There are two files to notice that the default example will use:
   - _contracts/FunctionsConsumer.sol_ contains the smart contract that will receive the data
   - _calculation-example.js_ contains JavaScript code that will be executed by each node of the DON<br><br>
6. Test an end-to-end request and fulfillment locally by simulating it using:<br>`npx hardhat functions-simulate`<br><br>
7. Deploy and verify the client contract to an actual blockchain network by running:<br>`npx hardhat functions-deploy-client --network network_name_here --verify true`<br>**Note**: Make sure `<explorer>_API_KEY` is set if using `--verify true`, depending on which network is used.<br><br>
8. Create, fund & authorize a new Functions billing subscription by running:<br> `npx hardhat functions-sub-create --network network_name_here --amount LINK_funding_amount_here --contract 0xDeployed_client_contract_address_here`<br>**Note**: Ensure your wallet has a sufficient LINK balance before running this command. Testnet LINK can be obtained at <a href="https://faucets.chain.link/">faucets.chain.link</a>.<br><br>
9. Make an on-chain request by running:<br>`npx hardhat functions-request --network network_name_here --contract 0xDeployed_client_contract_address_here --subid subscription_id_number_here`

# Environment Variable Management

This repo uses the NPM package `@chainlink/env-enc` for keeping environment variables such as wallet private keys, RPC URLs, and other secrets encrypted at rest. This reduces the risk of credential exposure by ensuring credentials are not visible in plaintext.

By default, all encrypted environment variables will be stored in a file named `.env.enc` in the root directory of this repo.

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

> **NOTE:** When you finish each work session, close down your terminal to prevent your encryption password from becoming exposes if your machine is compromised.

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

The Functions and Functions subscription management commands commands can be executed in the following format:
`npx hardhat command_here --parameter1 parameter_1_value_here --parameter2 parameter_2_value_here`

Example: `npx hardhat functions-read --network polygonMumbai --contract 0x787Fe00416140b37B026f3605c6C72d096110Bb8`

## Functions Commands

| Command                            | Description                                                                                                                          | Parameters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compile`                          | Compiles all smart contracts                                                                                                         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `functions-simulate`               | Simulates an end-to-end fulfillment locally for the _FunctionsConsumer_ contract                                                     | `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 100,000 & must be less than 300,000), `configpath` (optional): Path to request config file (defaults to _./Functions-request-config.js_)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `functions-deploy-client`          | Deploys the _FunctionsConsumer_ contract                                                                                             | `network`: Name of blockchain network, `verify` (optional): Set to `true` to verify the deployed _FunctionsConsumer_ contract (defaults to `false`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `functions-request`                | Initiates a request from a _FunctionsConsumer_ client contract using data from the Functions request config file                     | `network`: Name of blockchain network, `contract`: Address of the client contract to call, `subid`: Billing subscription ID used to pay for the request, `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 100,000 & must be less than 300,000), `requestgas` (optional): Gas limit for calling the _executeRequest_ function (defaults to 1,500,000), `simulate` (optional): Flag indicating if simulation should be run before making an on-chain request (defaults to true), `configpath` (optional): Path to request config file (defaults to _./Functions-request-config.js_)                                                              |
| `functions-read`                   | Reads the latest response (or error) returned to a _FunctionsConsumer_ or _AutomatedFunctionsConsumer_ client contract               | `network`: Name of blockchain network, `contract`: Address of the client contract to read, `configpath` (optional): Path to request config file (defaults to _./Functions-request-config.js_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `functions-deploy-auto-client`     | Deploys the _AutomatedFunctionsConsumer_ contract and sets the Functions request using data from the Functions request config file   | `network`: Name of blockchain network, `subid`: Billing subscription ID used to pay for Functions requests, `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 250000), `interval` (optional): Update interval in seconds for Chainlink Automation to call _performUpkeep_ (defaults to 300), `verify` (optional): Set to `true` to verify the deployed _AutomatedFunctionsConsumer_ contract (defaults to `false`), `simulate` (optional): Flag indicating if simulation should be run before making an on-chain request (defaults to true), `configpath` (optional): Path to request config file (defaults to _./Functions-request-config.js_) |
| `functions-check-upkeep`           | Checks if _checkUpkeep_ returns true for an Automation compatible contract                                                           | `network`: Name of blockchain network, `contract`: Address of the contract to check, `data` (optional): Hex string representing bytes that are passed to the _checkUpkeep_ function (defaults to empty bytes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `functions-perform-upkeep`         | Manually call _performUpkeep_ in an Automation compatible contract                                                                   | `network`: Name of blockchain network, `contract`: Address of the contract to call, `data` (optional): Hex string representing bytes that are passed to the _performUpkeep_ function (defaults to empty bytes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `functions-set-auto-request`       | Updates the Functions request in deployed _AutomatedFunctionsConsumer_ contract using data from the Functions request config file    | `network`: Name of blockchain network, `contract`: Address of the contract to update, `subid`: Billing subscription ID used to pay for Functions requests, `interval` (optional): Update interval in seconds for Chainlink Automation to call _performUpkeep_ (defaults to 300), `gaslimit` (optional): Maximum amount of gas that can be used to call _fulfillRequest_ in the client contract (defaults to 250,000), `configpath` (optional): Path to request config file (defaults to _./Functions-request-config.js_)                                                                                                                                                                                                 |
| `functions-set-oracle-addr`        | Updates the oracle address for a client contract using the _FunctionsOracle_ address from _network-config.js_                        | `network`: Name of blockchain network, `contract`: Address of the client contract to update                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `functions-build-request`          | Creates a JSON file with Functions request parameters including encrypted secrets, using data from the Functions request config file | `network`: Name of blockchain network, `output` (optional): Output JSON file name (defaults to _Functions-request.json_), `simulate` (optional): Flag indicating if simulation should be run before building the request JSON file (defaults to true), `configpath` (optional): Path to request config file (defaults to _./Functions-request-config.js_)                                                                                                                                                                                                                                                                                                                                                                |
| `functions-build-offchain-secrets` | Builds an off-chain secrets object that can be uploaded and referenced via URL                                                       | `network`: Name of blockchain network, `output` (optional): Output JSON file name (defaults to _offchain-secrets.json_), `configpath` (optional): Path to request config file (defaults to _./Functions-request-config.js_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

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
| `functions-sub-accept`       | Accepts ownership of a Functions subscription after a transfer is requested                                                              | `network`: Name of blockchain network, `subid`: Subscription ID                                                                                                                                                            |
| `functions-timeout-requests` | Times out expired requests                                                                                                               | `network`: Name of blockchain network, `requestids`: 1 or more request IDs to timeout separated by commas                                                                                                                  |

# Request Configuration

Chainlink Functions requests can be configured by modifying values in the `requestConfig` object found in the _Functions-request-config.js_ file located in the root of this repository.

| Setting Name         | Description                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeLocation`       | This specifies where the JavaScript code for a request is located. Currently, only the `Location.Inline` option is supported (represented by the value `0`). This means the JavaScript string is provided directly in the on-chain request instead of being referenced via a URL.                                                                                     |
| `codeLanguage`       | This specifies the language of the source code which is executed in a request. Currently, only `JavaScript` is supported (represented by the value `0`).                                                                                                                                                                                                              |
| `source`             | This is a string containing the source code which is executed in a request. This must be valid JavaScript code that returns a Buffer. See the [JavaScript Code](#javascript-code) section for more details.                                                                                                                                                           |
| `secrets`            | This is an object which contains secret values that are injected into the JavaScript source code and can be accessed using the name `secrets`. This object can only contain string values. This object will be automatically encrypted by the tooling using the DON public key before making request. Any DON member can use these secrets when processing a request. |
| `perNodeSecrets`     | This is an array of `secrets` objects that enables the optional ability to assign a separate set of secrets for each node in the DON. DON members can only use the set of secrets which they have been assigned.                                                                                                                                                      |
| `walletPrivateKey`   | This is the EVM private key. It is used to generate a signature for the encrypted secrets such that the secrets cannot be reused by an unauthorized 3rd party.                                                                                                                                                                                                        |
| `args`               | This is an array of strings which contains values that are injected into the JavaScript source code and can be accessed using the name `args`. This provides a convenient way to set modifiable parameters within a request.                                                                                                                                          |
| `expectedReturnType` | This specifies the expected return type of a request. It has no on-chain impact, but is used by the CLI to decode the response bytes into the specified type. The options are `uint256`, `int256`, `string`, or `Buffer`.                                                                                                                                             |
| `secretsURLs`        | This is an array of URLs where encrypted secrets can be fetched when a request is executed. This array is converted into a space-separated string, encrypted using the DON public key, and used as the `secrets` parameter on-chain. If any URLs are provided, automatic Gist uploading will be disabled in favor of the provided URLs.                               |

## JavaScript Code

The JavaScript source code for a Functions request can use vanilla Node.js features, but _cannot_ use any `require` statements or imported modules other than the built-in modules `buffer`, `crypto`, `querystring`, `string_decoder`, `url`, and `util`.

It must return a JavaScript Buffer which represents the response bytes that are sent back to the requesting contract.
Encoding functions are provided in the [Functions library](#functions-library).
Additionally, the script must return in **less than 10 seconds** or it will be terminated and send back an error to the requesting contract.

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

Client contracts which initiate a request and receive a fulfillment can be modified for specific use cases. The only requirements are that the contract successfully calls _sendRequest_ in the _FunctionsOracle_ contract and correctly implements their own _handleOracleFulfillment_ function. At this time, the maximum amount of gas that _handleOracleFulfillment_ can use is 300,000. See _FunctionsClient.sol_ for details.

## Simulating Requests

An end-to-end request initiation and fulfillment can be simulated for the default _FunctionsConsumer_ contract using the `functions-simulate` command. This command will report the total estimated gas use.
If the _FunctionsConsumer_ client contract is modified, this task must also be modified to accomodate the changes. See `tasks/Functions-client/simulate` for details.

**Note:** The actual gas use on-chain can vary, so it is recommended to set a higher fulfillment gas limit when making a request to account for any differences.

## Off-chain Secrets

Instead of using encrypted secrets written directly on the blockchain, encrypted secrets are hosted off-chain and be fetched by DON nodes via HTTP when a request is initiated. This allows encrypted secrets to be deleted when they are no longer in use. By default, the tooling automatically uploads secrets to private Github Gists and deletes them once a request is fulfilled unless the secrets are being used for an `AutomatedFunctionsConsumer.sol` contract. If integrating with Chainlink Automation, it is recommended to delete the secrets Gist manually once it is not longer in use. Note that if there are URL(s) provided for the `secretsURLs` parameter in _Functions_request_config.js_, automatic Gist uploading will be disabled in favor of using the provided URL(s).

Additionally, per-node secrets allow a separate set of secrets to be assigned to each node in the DON. Each node will not be able to decrypt the set of secrets belonging to another node. Optionally, a set of default secrets encrypted with the DON public key can be used as a fallback by any DON member who does not have a set of secrets assigned to them. This handles the case where a new member is added to the DON, but the assigned secrets have not yet been updated.

To use per-node assigned secrets, enter a list of secrets objects into `perNodeSecrets` in _Functions-request-config.js_. The number of objects in the array must correspond to the number of nodes in the DON. Default secrets can be entered into the `secrets` parameter of `Functions-request-config.js`. Each secrets object must have the same set of entries, but the values for each entry can be different (ie: `[ { apiKey: '123' }, { apiKey: '456' }, ... ]`). If the per-node secrets feature is not desired, `perNodeSecrets` can be left empty and a single set of secrets can be entered for `secrets`.

If you prefer to host secrets elsewhere instead of having them automatically uploaded to a Github Gist, generate the encrypted secrets JSON file by running the command `npx hardhat functions-build-offchain-secrets --network network_name_here`. This will output the file _offchain-secrets.json_ which can be uploaded to any other hosting service that allows the JSON file to be fetched via URL.
Once the JSON file is uploaded, enter the URL(s) where the JSON file is hosted into `secretsURLs`. Multiple URLs can be entered as a fallback in case any of the URLs are offline. Each URL should host the exact same JSON file. The tooling will automatically pack the secrets URL(s) into a space-separated string and encrypt the string using the DON public key so no 3rd party can view the URLs. Finally, this encrypted string of URLs is used in the `secrets` parameter when making an on-chain request.

URLs which host secrets must be available every time a request is executed by DON nodes. For optimal security, it is recommended to expire the URLs when the off-chain secrets are no longer in use.

# Automation Integration

Chainlink Functions can be used with Chainlink Automation in order to automatically trigger a Functions request.

1. Create & fund a new Functions billing subscription by running:<br>`npx hardhat functions-sub-create --network network_name_here --amount LINK_funding_amount_here`<br>**Note**: Ensure your wallet has a sufficient LINK balance before running this command.<br><br>
2. Deploy the _AutomationFunctionsConsumer_ client contract by running:<br>`npx hardhat functions-deploy-auto-client --network network_name_here --subid subscription_id_number_here --interval time_between_requests_here --verify true`<br>**Note**: Make sure `<explorer>_API_KEY` environment variable is set. API keys for these services are freely available to anyone who creates an EtherScan, PolygonScan or SnowTrace account.<br><br>
3. Register the contract for upkeep via the Chainlink Automation web app here: [https://automation.chain.link/](https://automation.chain.link/)
   - Be sure to set the `Gas limit` for the _performUpkeep_ function to a high enough value. The recommended value is 1,000,000.
   - Find further documentation for working with Chainlink Automation here: [https://docs.chain.link/chainlink-automation/introduction](https://docs.chain.link/chainlink-automation/introduction)

Once the contract is registered for upkeep, check the latest response or error with the commands `npx hardhat functions-read --network network_name_here --contract contract_address_here`.

For debugging, use the command `npx hardhat functions-check-upkeep --network network_name_here --contract contract_address_here` to see if Automation needs to call _performUpkeep_.
To manually trigger a request, use the command `npx hardhat functions-perform-upkeep --network network_name_here --contract contract_address_here`.

# Gas Spikes

When on-chain traffic is high, transaction gas prices can spike unexpectedly. This may decrease the accuracy of the estimated requests costs or cause transactions to fail.
In order to mitigate these problems, ensure your billing subscription balance has a sufficient buffer of two or more times the expected request cost in LINK.
Additionally, you can manually set a hardcoded transaction gas price in the HardHat tooling by modifying the `gasPrice` parameter in the _networks.js_ config file for a particular network.
