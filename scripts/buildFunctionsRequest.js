const { simulateRequest, buildRequest, getDecodedResultLog } = require("../FunctionsRequestSimulator")
const { writeFileSync } = require("fs")

const build = async (requestConfigPath) => {
  if (!requestConfigPath) throw new Error("Request config path not provided")
  const outputFile = "Functions-request.json"
  const builtRequest = await buildRequest(require(requestConfigPath))
  writeFileSync(outputFile, JSON.stringify(builtRequest))
  console.log(`Build file ${outputFile} generated`)
}

module.exports = { build }
