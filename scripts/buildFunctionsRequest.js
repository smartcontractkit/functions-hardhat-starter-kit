const { simulateRequest, buildRequest, getDecodedResultLog } = require("../FunctionsSandboxLibrary")
const { writeFileSync } = require("fs")

;(async () => {
  const builtRequest = await buildRequest(require("../Functions-request-config.js"))
  writeFileSync("Functions-request.json", JSON.stringify(builtRequest))
})()
