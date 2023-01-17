const path = require("path")

const Location = {
  Inline: 0,
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

const defaultRequestConfigPath = "./Functions-request-config.js"
const getRequestConfigPath = (requestPath) => {
  if (requestPath) {
    console.log(`load request config file from ${requestPath}`)
    return path.resolve(requestPath)
  } else {
    console.log(`no load request config file provided. Load config from ${defaultRequestConfigPath}`)
    return path.resolve(defaultRequestConfigPath)
  }
}

module.exports = {
  Location,
  CodeLanguage,
  ReturnType,
  defaultRequestConfigPath,
  getRequestConfigPath,
}
