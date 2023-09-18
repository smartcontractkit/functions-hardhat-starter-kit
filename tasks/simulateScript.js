const { simulateScript, decodeResult } = require("@chainlink/functions-toolkit")
const path = require("path")
const process = require("process")

task("functions-simulate-script", "Executes the JavaScript source code locally")
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../Functions-request-config.js`,
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    const requestConfig = require(path.isAbsolute(taskArgs.configpath)
      ? taskArgs.configpath
      : path.join(process.cwd(), taskArgs.configpath))

    // Simulate the JavaScript execution locally
    const { responseBytesHexstring, errorString, capturedTerminalOutput } = await simulateScript(requestConfig)
    console.log(`${capturedTerminalOutput}\n`)
    if (responseBytesHexstring) {
      console.log(
        `Response returned by script during local simulation: ${decodeResult(
          responseBytesHexstring,
          requestConfig.expectedReturnType
        ).toString()}\n`
      )
    }
    if (errorString) {
      console.log(`Error returned by simulated script:\n${errorString}\n`)
    }
  })
