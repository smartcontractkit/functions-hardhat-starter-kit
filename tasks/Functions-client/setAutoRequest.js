const { types } = require("hardhat/config")
const { VERIFICATION_BLOCK_CONFIRMATIONS } = require("../../network-config")
const { getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { generateRequest } = require("./buildRequestJSON")

task("functions-set-auto-request", "Updates the Functions request in a deployed AutomatedFunctionsConsumer contract")
  .addParam("contract", "Address of the client contract")
  .addParam("subid", "Billing subscription ID used to pay for Functions requests", undefined, types.int)
  .addOptionalParam("interval", "Update interval in seconds for Automation to call performUpkeep", 300, types.int)
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the client contract",
    250000,
    types.int
  )
  .addOptionalParam(
    "simulate",
    "Flag indicating if simulation should be run before making an on-chain request",
    true,
    types.boolean
  )
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    await setAutoRequest(taskArgs.contract, taskArgs)
  })

const setAutoRequest = async (contract, taskArgs) => {
  if (taskArgs.gaslimit > 300000) {
    throw Error("Gas limit must be less than or equal to 300,000")
  }

  console.log(
    `Setting the Functions request in AutomatedFunctionsConsumer contract ${contract} on ${network.name}`
  )

  const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
  const autoClientContract = await autoClientContractFactory.attach(contract)

  const unvalidatedRequestConfig = require("../../Functions-request-config.js")
  const requestConfig = getRequestConfig(unvalidatedRequestConfig)

  const request = await generateRequest(requestConfig, taskArgs)

  const functionsRequestBytes = await autoClientContract.generateRequest(
    request.source,
    request.secrets ?? [],
    request.secretsLocation,
    request.args ?? []
  )

  console.log("Setting Functions request")
  const setRequestTx = await autoClientContract.setRequest(
    taskArgs.subid,
    taskArgs.gaslimit,
    taskArgs.interval,
    functionsRequestBytes
  )

  console.log(
    `\nWaiting ${VERIFICATION_BLOCK_CONFIRMATIONS} block for transaction ${setRequestTx.hash} to be confirmed...`
  )
  await setRequestTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

  console.log(
    `\nSet new Functions request in AutomatedFunctionsConsumer contract ${autoClientContract.address} on ${network.name}`
  )
}

exports.setAutoRequest = setAutoRequest