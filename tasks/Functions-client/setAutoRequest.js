const { buildRequestCBOR, Location, CodeLanguage } = require("@chainlink/functions-toolkit")

const { types } = require("hardhat/config")
const { networks } = require("../../networks")
const { getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { generateRequest } = require("./buildRequestJSON")
const { RequestStore } = require("../utils/artifact")
const { deleteGist } = require("../utils/github")
const path = require("path")
const process = require("process")

task("functions-set-auto-request", "Updates the Functions request in a deployed AutomatedFunctionsConsumer contract")
  .addParam("contract", "Address of the client contract")
  .addParam("subid", "Billing subscription ID used to pay for Functions requests", undefined, types.int)
  .addOptionalParam("interval", "Update interval in seconds for Automation to call performUpkeep", 300, types.int) // TODO zubin read from contract instead?
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

    await setAutoRequest(taskArgs.contract, taskArgs)
  })

const setAutoRequest = async (contract, taskArgs) => {
  if (taskArgs.gaslimit > 300000) {
    throw Error("Gas limit must be less than or equal to 300,000")
  }

  console.log(`Setting the Functions request in AutomatedFunctionsConsumer contract ${contract} on ${network.name}`)

  const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
  const autoClientContract = await autoClientContractFactory.attach(contract)

  const unvalidatedRequestConfig = require(path.isAbsolute(taskArgs.configpath)
    ? taskArgs.configpath
    : path.join(process.cwd(), taskArgs.configpath))

  const requestConfig = getRequestConfig(unvalidatedRequestConfig)
  // TODO @zeuslawyer add logic to obtain encryptedSecretsReference if secrets are provided in requestConfig.

  const functionsRequestCBOR = buildRequestCBOR({
    codeLocation: requestConfig.codeLocation,
    codeLanguage: requestConfig.codeLanguage,
    source: requestConfig.source,
    args: requestConfig.args,
  })

  console.log("\n\nrequestConfig >> \n\n", requestConfig) // TODO zubin cleanup
  console.log("\n\nfunctionsRequestCBOR >> \n\n", functionsRequestCBOR) // TODO zubin cleanup

  const store = new RequestStore(hre.network.config.chainId, network.name, "automatedConsumer")
  // const previousSecretURLs = []  // TODO  zubin remove
  // try {
  //   const artifact = await store.read(taskArgs.contract)
  //   if (artifact.activeManagedSecretsURLs) previousSecretURLs = artifact.secretsURLs
  // } catch {
  //   /* new request, continue */
  // }

  console.log("\nSetting Functions request...")
  const setRequestTx = await autoClientContract.setRequest(
    taskArgs.subid,
    taskArgs.gaslimit,
    taskArgs.interval,
    functionsRequestCBOR
  )

  console.log(
    `\nWaiting ${networks[network.name].confirmations} block for transaction ${setRequestTx.hash} to be confirmed...`
  )
  await setRequestTx.wait(networks[network.name].confirmations)

  // const create = await store.upsert(taskArgs.contract, { // TODO @zubin cleanup
  //   type: "automatedConsumer",
  //   automatedConsumerContractAddress: taskArgs.contract,
  //   transactionReceipt: setRequestTx,
  //   taskArgs,
  //   codeLocation: requestConfig.codeLocation,
  //   codeLanguage: requestConfig.codeLanguage,
  //   source: requestConfig.source,
  //   secrets: requestConfig.secrets,
  //   activeManagedSecretsURLs: doGistCleanup,
  //   args: requestConfig.args,
  //   expectedReturnType: requestConfig.expectedReturnType,
  //   DONPublicKey: requestConfig.DONPublicKey,
  // })

  // // Clean up previous secretsURLs
  // if (!create) {
  //   console.log(`Attempting to clean up previous GitHub Gist secrets`)
  //   await Promise.all(
  //     previousSecretURLs.map(async (url) => {
  //       if (!url.includes("github")) return console.log(`\n${url} is not a GitHub Gist - skipping`)
  //       const exists = axios.get(url)
  //       if (exists) {
  //         // Gist URLs end with '/raw', remove this
  //         const urlNoRaw = url.slice(0, -4)
  //         await deleteGist(process.env["GITHUB_API_TOKEN"], urlNoRaw)
  //       }
  //     })
  //   )
  // }

  // console.log(
  //   `\n${create ? "Created new" : "Updated"} Functions request in AutomatedFunctionsConsumer contract ${
  //     autoClientContract.address
  //   } on ${network.name}`
  // )
}

exports.setAutoRequest = setAutoRequest
