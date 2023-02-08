const fs = require("fs")

// Loads environment variables from .env file (if it exists)
require("dotenv").config()

const Location = {
  Inline: 0,
  Remote: 1,
}

const CodeLanguage = {
  JavaScript: 0,
}

const ReturnType = {
  uint: "uint256",
  uint256: "uint256",
  int: "int256",
  int256: "int256",
  string: "string",
  bytes: "Buffer",
  Buffer: "Buffer",
}

// Configure the request by setting the fields below
const requestConfig = {
  // location of source code (only Inline is currently supported)
  codeLocation: Location.Inline,
  // location of secrets (Inline or Remote)
  secretsLocation: Location.Inline,
  // code language (only JavaScript is currently supported)
  codeLanguage: CodeLanguage.JavaScript,
  // string containing the source code to be executed
  source: fs.readFileSync("./Functions-request-source-API-example.js").toString(),
  // secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey). following secrets are required - secretKey, accessKey
  secrets: {
    secretKey: process.env.SECRET_KEY,
    accessKey: process.env.ACCESS_KEY,
    dataSetID: process.env. DATASET_ID,
    revisionID: process.env.REVISION_ID,
    assetID: process.env.ASSET_ID
  },
  // ETH wallet key used to sign secrets so they cannot be accessed by a 3rd party
  walletPrivateKey: process.env["PRIVATE_KEY"],
  // args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
  args: [
    "GET", // AWS request method
    "api-fulfill.dataexchange.us-east-1.amazonaws.com", // Host of AWS service
    "/v1/currencies/eur/jpy.json", // Data provider API URL. Query params should be part of URL
    "us-east-1", // AWS service region
    "dataexchange", // AWS service name
    "", // request BODY payload. empty string for GET or empty BODY
    "jpy" // one level result path
  ],
  // expected type of the returned value
  expectedReturnType: ReturnType.string,
  // Redundant URLs which point to encrypted off-chain secrets
  secretsURLs: [],
  // Default offchain secrets object used by the `functions-build-offchain-secrets` command
  globalOffchainSecrets: {},
  // Per-node offchain secrets objects used by the `functions-build-offchain-secrets` command
  perNodeOffchainSecrets: [],
}

module.exports = requestConfig