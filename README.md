# Chainlink Functions Starter Kit

- [Chainlink Functions Starter Kit](#chainlink-functions-starter-kit)
- [Overview](#overview)
- [Quickstart](#quickstart)
- [Request Configuration](#request-configuration)
  - [JavaScript Code](#javascript-code)
    - [Functions Library](#functions-library)
  - [Modifying Contracts](#modifying-contracts)
  - [Simulating Requests](#simulating-requests)
- [Command Glossary](#command-glossary)
    - [Functions Commands](#functions-commands)
    - [Functions Subscription Managment Commands](#functions-subscription-managment-commands)
    - [Admin Commands](#admin-commands)
  
# Overview

<p>Chainlink Functions allows users to request data from almost any API and perform custom computation using JavaScript.</p>
<p>It works by using a <a href="https://chain.link/education/blockchain-oracles#decentralized-oracles">decentralized oracle network</a> (DON).<br>When a request is initiated, each node in the DON executes the user-provided JavaScript code simultaneously.  Then, nodes use the <a href="https://docs.chain.link/architecture-overview/off-chain-reporting/">Chainlink OCR</a> protocol to come to consensus on the results.  Finally, the median result is returned to the requesting contract via a callback function.</p>
<p>Chainlink Functions also enables users to share encrypted secrets with each node in the DON.  This allows users to access to APIs that require authentication, without exposing their API keys to the general public.

# Quickstart

Ensure Node.js is installed.  It is recommended to use Node.js version 18.

1. Open this directory and run `npm install` to install all dependencies.<br><br>
2. Set the required environment variables.
   1. This can be done by renaming the file `.env.example` to `.env` and setting the values `PRIVATE_KEY` and either `GOERLI_RPC_URL` or `MUMBAI_RPC_URL`.
   2. If desired, the `REPORT_GAS`, `ETHERSCAN_API_KEY` and `POLYGONSCAN_API_KEY` can also be set, along with any values used in the `secrets` object in `Functions-request-config.js`.<br><br>
3. Simulate an end-to-end fulfillment locally by running:<br>`npx hardhat functions-simulate`<br><br>
4. Deploy a client contract by running:<br>`npx hardhat functions-deploy-client --network network_name_here`<br><br>
5. Create, fund & authorize a new Functions billing subscription by running:<br> `npx hardhat functions-sub-create --network network_name_here --amount LINK_funding_amount_here --contract 0xDeployed_client_contract_address_here`<br>**Note**: Ensure your wallet has a sufficent LINK balance before running this command.<br><br>
6. Make an on-chain request by running:<br>`nxp hardhat functions-request --network network_name_here --contract 0xDeployed_client_contract_address_here`

# Request Configuration

Chainlink Functions requests can be configured by modifying values in the `requestConfig` object found in the `Functions-request-config.js` file located in the root of this repository.

| Setting Name         | Description                                                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeLocation`       | This specifies where the JavaScript code for a request is located.  Currenly, only the `Inline` option is supported (represented by the value `0`).  This means the JavaScript string is provided directly in the on-chain request instead of being referenced via a URL or IPFS hash. |
| `secretsLocation`    | This specifies where the encrypted secrets for a request are located.  Currenly, only the `Inline` option is supported (represented by the value `0`).  This means encypted secrets are provided directly in the on-chain request instead of being referenced via a URL or IPFS hash.  |
| `codeLanguage`       | This specifies the language of the source code which is executed in a request.  Currently, only `JavaScript` is supported (represented by the value `0`).                                                                                                                              |
| `source`             | This is a string containing the source code which is executed in a request.  This must be valid JavaScript code that returns a Buffer.  See the [JavaScript Code](#javascript-code) section for more details.                                                                          |
| `secrets`            | This is a JavaScript object which contains secret values that are injected into the JavaScript source code and can be accessed using the name `secrets`.  This object will be automatically encrypted by the tooling using the DON public key before making an on-chain request.       |
| `walletPrivateKey`   | This is the EVM private key.  It is used to generate a signature for the encrypted secrets such that the secrets cannot be reused by an unauthorized 3rd party.                                                                                                                        |
| `DONPublicKey`       | This is the DON's public encryption key used to encrypt secrets.  This value is only used by the `npm run functions-build-request` command.  All other commands fetch the DON key directly from the `FunctionsOracle` contract on-chain.                                               |
| `args`               | This is an array of strings which contains values that are injected into the JavaScript source code and can be accessed using the name `args`.  This provides a convenient way to set modifiable parameters within a request.                                                          |
| `maxResponseBytes`   | This specifies the maximum size of a response.  If the response size is exceeded, it will be curtailed to this size.  It has no on-chain impact, but is used by the CLI to simulate on-chain behavior for responses which are too large.  It is recommended not to change this value.  |
| `expectedReturnType` | This specifies the expected return type of a request.  It has no on-chain impact, but is used by the CLI to decode the response bytes into the specified type.  The options are `uint256`, `int256`, `string`, or `Buffer`.                                                            |

## JavaScript Code

The JavaScript source code for an Functions request can use vanilla Node.js features, but cannot use any imported modules or `require` statements.
It must return a JavaScript Buffer which represents the response bytes that are sent back to the requesting contract.
Encoding functions are provided in the [Functions library](#functions-library).
Additionally, the script must return in **less than 10 seconds** or it will be terminated and send back an error to the requesting contract.

In order to make HTTP requests, the source code must use the `Functions.makeHttpRequest` function from the exposed [Functions library](#functions-library).
Asynchronous code with top-level `await` statements is supported, as shown in the file `Functions-request-source-API-example.js`.

### Functions Library

The `Functions` library is injected into the JavaScript source code and can be accessed using the name `Functions`.

In order to make HTTP requests, only the `Functions.makeHttpRequest(x)` function can be used.  All other methods of accessing the Internet are restricted.
The function takes an object `x` the following parameters.
```
{
  url: String with the URL to which the request is sent,
  method: (optional) String specifying the HTTP method to use which can be either 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', or 'OPTIONS' (defaults to 'GET'),
  headers: (optional) Object with headers to use in the request,
  params: (optional) Object with URL query parameters,
  data: (optional) Object which represents the body sent with the request,
  timeout: (optional) Number with the maximum request duration in ms (defaults to 10000ms),
  responseType: (optional) String specifying the expected response type which can be either 'json', 'arraybuffer', 'document', 'text' or 'stream' (defaults to 'json'),
}
```
The funtion returns a promise that resolves to either a success response object or an error response object.

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
  message: (may be undefined) String containing error message,
  code: (may be undefined) String containing an error code,
  response: (may be undefined) Object containing response from server,
}
```


This library also exposes functions for encoding JavaScript values into Buffers which represent the bytes that a returned on-chain.

- `Functions.encodeUint256(x)` takes a positive JavaScript integer number `x` and returns a 32 byte Buffer representing `x` as a `uint256` type in Solidity.
- `Functions.encodeUint256(x)` takes a JavaScript integer number `x` and returns a 32 byte Buffer representing `x` as a `int256` type in Solidity.
- `Functions.encodeString(x)` takes a JavaScript string `x` and returns a Buffer representing `x` as a `string` type in Solidity.

## Modifying Contracts

Client contracts which initiate a request and receive a fulfillment can be modified for specific use cases.  The only requirements are that the client contract extends the `FunctionsClient` contract and the `fulfillRequest` callback function never uses more than 300,000 gas.

## Simulating Requests

An end-to-end request initiation and fulfillment can be simulated using the `npx hardhat functions-simulate` command.  This command will report the total estimated cost of a request in LINK using the latest on-chain gas prices.  Costs are based on the amount of gas used to validate the response and call the client contract's `fulfillRequest` function, plus a flat fee.  Please note that actual request costs can vary based on gas prices when a request is inititated on-chain.

# Command Glossary

Each of these commands can be executed in the following format.

`npx hardhat command_here --parameter1 parameter_1_here --parameter2 parameter_2_here`

Be sure to specify the desired network using the `--network` parameter when running these commands (except for `compile` and `functions-simulate` which only run locally).

Example: `npx hardhat functions-read --network goerli --contract 0x787Fe00416140b37B026f3605c6C72d096110Bb8`

### Functions Commands

| Command                   | Description                                                               | Parameters                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compile`                 | Compiles all smart contracts                                              |                                                                                                                                                                                                                                                                                 |
| `functions-simulate`      | Simulates an end-to-end fulfillment locally for the Functions contract    | `gaslimit` (optional): Maximum amount of gas that can be used to call fulfillRequest in the client contract (defaults to 100,000 & must be less than 300,000)                                                                                                                   |
| `functions-deploy-client` | Deploys the FunctionsConsumer contract                                    |                                                                                                                                                                                                                                                                                 |
| `functions-request`       | Initiates a request from an FunctionsConsumer client contract             | `contract`: Address of the client contract to call, `subid`: Billing subscription ID used to pay for the request, `gaslimit` (optional): Maximum amount of gas that can be used to call fulfillRequest in the client contract (defaults to 100,000 & must be less than 300,000) |
| `functions-read`          | Reads the latest response returned to a FunctionsConsumer client contract | `contract`: Address of the client contract to read                                                                                                                                                                                                                              |
| `functions-read-error`    | Reads the latest error returned to a FunctionsConsumer client contract    | `contract`: Address of the client contract to read                                                                                                                                                                                                                              |

### Functions Subscription Managment Commands

| Command                  | Description                                                                                                                       | Parameters                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `functions-sub-create`   | Creates a new billing subscription for Functions consumer contracts                                                               | `amount` (optional): Inital amount used to fund the subscription in LINK, `contract` (optional): Address of the client contract address authorized to use the new billing subscription |
| `functions-sub-info`     | Gets the Functions billing subscription balance, owner, and list of authorized consumer contract addresses                        | `subid`: Subscription ID                                                                                                                                                               |
| `functions-sub-fund`     | Funds a billing subscription for Functions consumer contracts                                                                     | `subid`: Subscription ID, `amount`: Amount to fund subscription in LINK                                                                                                                |
| `functions-sub-cancel`   | Cancels Functions billing subscription and refunds unused balance. Cancellation is only possible if there are no pending requests | `subid`: Subscription ID, `refundaddress` (optional): Address where the remaining subscription balance is sent (defaults to caller's address)                                          |
| `functions-sub-add`      | Adds a client contract to the Functions billing subscription                                                                      | `subid`: Subscription ID, `contract`: Address of the Functions client contract to authorize for billing                                                                                |
| `functions-sub-remove`   | Removes a client contract from an Functions billing subscription                                                                  | `subid`: Subscription ID, `contract`: Address of the client contract to remove from billing subscription                                                                               |
| `functions-sub-transfer` | Request ownership of an Functions subscription be transferred to a new address                                                    | `subid`: Subscription ID, `newowner`: Address of the new owner                                                                                                                         |
| `functions-sub-accept`   | Accepts ownership of an Functions subscription after a transfer is requested                                                      | `subid`: Subscription ID                                                                                                                                                               |

### Admin Commands

| Command                    | Description                                                                                 | Parameters                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `functions-set-ocr-config` | Sets the OCR config using values from FunctionsOracleConfig.json                            |                                                |
| `functions-add-senders`    | Add wallets to allowlist in the Oracle contract                                             | `addresses`: Comma-separated list of addresses |
| `functions-set-don-key`    | Sets the DON public key in the Functions oracle contract using value from network-config.js |                                                |
| `functions-remove-senders` | Remove wallets from allowlist in the Oracle contract                                        | `addresses`: Comma-separated list of addresses |