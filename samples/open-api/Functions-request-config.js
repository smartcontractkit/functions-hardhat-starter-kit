const fs = require("fs")
const path = require("path")
const { CodeLanguage, Location, ReturnType } = require("../../functionsRequestCommon")

// Loads environment variables from .env file (if it exists)
require("dotenv").config()

// Configure the request by setting the fields below
const requestConfig = {
  // location of source code (only Inline is curently supported)
  codeLocation: Location.Inline,
  // location of secrets (only Inline is currently supported)
  secretsLocation: Location.Inline,
  // code language (only JavaScript is currently supported)
  codeLanguage: CodeLanguage.JavaScript,
  // string containing the source code to be executed
  source: fs.readFileSync(path.resolve("samples/open-api", "Functions-request-source-open-api.js")).toString(),
  // number of HTTP queries the source code is allowed to make
  numAllowedQueries: 1,
  // args can be accessed within the source code with `args[index]` (ie: args[0])
  args: ["ETH", "USD"],
  // maximum size of a response in bytes
  maxResponseBytes: 256,
  // expected type of the returned value
  expectedReturnType: ReturnType.uint256,
}

module.exports = requestConfig
