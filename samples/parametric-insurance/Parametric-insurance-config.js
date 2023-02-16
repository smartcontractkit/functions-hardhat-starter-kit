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
  // source: fs.readFileSync("./calculation-example.js").toString(),
  source: fs.readFileSync("./samples/parametric-insurance/Parametric-insurance-example.js").toString(),
  // source: fs.readFileSync("./API-request-example-backup.js").toString(),
  // secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey)
  secrets: { 
    openWeatherApiKey: process.env.OPEN_WEATHER_API_KEY,
    worldWeatherApiKey: process.env.WORLD_WEATHER_API_KEY,
    ambeeWeatherApiKey: process.env.AMBEE_DATA_API_KEY,
    clientAddress: process.env.CLIENT_ADDR
  },
  // ETH wallet key used to sign secrets so they cannot be accessed by a 3rd party
  walletPrivateKey: process.env["PRIVATE_KEY"],
  // args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
  // the list of args are New York's latitude, longitude, code and name, this can be updated with any other city.
  args: ["40.71", "-74.00", "New+york"],
  // expected type of the returned value
  expectedReturnType: ReturnType.uint256,
  // Redundant URLs which point to encrypted off-chain secrets
  secretsURLs: [],
  // Default offchain secrets object used by the `functions-build-offchain-secrets` command
  globalOffchainSecrets: {},
  // Per-node offchain secrets objects used by the `functions-build-offchain-secrets` command
  perNodeOffchainSecrets: [],
}

module.exports = requestConfig
