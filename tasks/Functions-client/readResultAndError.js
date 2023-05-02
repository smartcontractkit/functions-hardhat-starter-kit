const { getDecodedResultLog } = require("../../FunctionsSandboxLibrary")
const path = require("path")
const process = require("process")

task(
  "functions-read",
  "Reads the latest response (or error) returned to a FunctionsConsumer or AutomatedFunctionsConsumer client contract"
)
  .addParam("contract", "Address of the client contract to read")
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../../Functions-request-config.js`,
    types.string
  )
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    console.log(`Reading data from Functions client contract ${taskArgs.contract} on network ${network.name}`)
    const clientContractFactory = await ethers.getContractFactory("FunctionsConsumer")
    const clientContract = await clientContractFactory.attach(taskArgs.contract)

    let latestError = await clientContract.latestError()
    if (latestError.length > 0 && latestError !== "0x") {
      const errorString = Buffer.from(latestError.slice(2), "hex").toString()
      console.log(`\nOn-chain error message: ${Buffer.from(latestError.slice(2), "hex").toString()}`)
    }

    let latestResponse = await clientContract.latestResponse()
    if (latestResponse.length > 0 && latestResponse !== "0x") {
      const requestConfig = require(path.isAbsolute(taskArgs.configpath)
        ? taskArgs.configpath
        : path.join(process.cwd(), taskArgs.configpath))
      console.log(
        `\nOn-chain response represented as a hex string: ${latestResponse}\n${getDecodedResultLog(
          requestConfig,
          latestResponse
        )}`
      )
    }
  })
