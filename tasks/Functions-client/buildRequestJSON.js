const { simulateRequest, buildRequest, getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { generateOffchainSecrets } = require("../utils/generateOffchainSecrets")
const { networks } = require("../../networks")
const utils = require("../utils")
const axios = require("axios")
const fs = require("fs")
const { createGist } = require("../utils/github")
const path = require("path")
const process = require("process")

task("functions-build-request", "Creates a JSON file with Functions request parameters")
  .addOptionalParam("output", "Output file name (defaults to Functions-request.json)")
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
  .setAction(async (taskArgs, hre) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local development chain.  Specify a valid network or simulate an Functions request locally with "npx hardhat functions-simulate".'
      )
    }

    const unvalidatedRequestConfig = require(path.isAbsolute(taskArgs.configpath)
      ? taskArgs.configpath
      : path.join(process.cwd(), taskArgs.configpath))
    const requestConfig = getRequestConfig(unvalidatedRequestConfig)

    const request = await generateRequest(requestConfig, taskArgs)

    fs.writeFileSync(taskArgs.output ?? "Functions-request.json", JSON.stringify(request))
    console.log(`Wrote request to ${taskArgs.output ?? "Functions-request.json"}`)
  })

const verifyOffchainSecrets = async (secretsURLs, nodeAddresses) => {
  const offchainSecretsResponses = []
  for (const url of secretsURLs) {
    try {
      const response = await axios.request({
        url,
        timeout: 3000,
        responseType: "json",
        maxContentLength: 1000000,
      })
      offchainSecretsResponses.push({
        url,
        secrets: response.data,
      })
    } catch (error) {
      throw Error(`Failed to fetch off-chain secrets from ${url}\n${error}`)
    }
  }

  for (const { secrets, url } of offchainSecretsResponses) {
    if (JSON.stringify(secrets) !== JSON.stringify(offchainSecretsResponses[0].secrets)) {
      throw Error(
        `Off-chain secrets URLs ${url} and ${offchainSecretsResponses[0].url} do not contain the same JSON object.  All secrets URLs must have an identical JSON object.`
      )
    }

    for (const nodeAddress of nodeAddresses) {
      if (!secrets[nodeAddress.toLowerCase()]) {
        if (!secrets["0x0"]) {
          throw Error(`No secrets specified for node ${nodeAddress.toLowerCase()} and no default secrets found.`)
        }
        if (Object.keys(secrets) > 1) {
          console.log(
            `WARNING: No secrets found for node ${nodeAddress.toLowerCase()}.  That node will use default secrets specified by the "0x0" entry.`
          )
        }
      }
    }
  }
}

const generateRequest = async (requestConfig, taskArgs) => {
  if (taskArgs.simulate !== false) {
    console.log("Simulating Functions request locally...")

    if (!requestConfig.secrets || Object.keys(requestConfig.secrets).length === 0) {
      if (requestConfig.perNodeSecrets && requestConfig.perNodeSecrets[0]) {
        requestConfig.secrets = requestConfig.perNodeSecrets[0]
      }
    }

    const { success, resultLog } = await simulateRequest(requestConfig)
    console.log(`\n${resultLog}`)

    // If the simulated JavaScript source code contains an error, confirm the user still wants to continue
    if (!success) {
      await utils.prompt("There was an error when running the JavaScript source code for the request.")
    }
  }

  const OracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
  const oracle = await OracleFactory.attach(networks[network.name]["functionsOracleProxy"])
  const [nodeAddresses, perNodePublicKeys] = await oracle.getAllNodePublicKeys()
  const DONPublicKey = await oracle.getDONPublicKey()

  if (
    (requestConfig.secrets && Object.keys(requestConfig.secrets).length > 0) ||
    (requestConfig.perNodeSecrets && Object.keys(requestConfig.perNodeSecrets).length > 0)
  ) {
    if (!requestConfig.secretsURLs || requestConfig.secretsURLs.length === 0) {
      // If their are secrets (or per-node secrets) and no secretsURLs are provided, create and upload an off-chain secrets Gist
      const offchainSecrets = await generateOffchainSecrets(
        requestConfig,
        process.env["PRIVATE_KEY"],
        DONPublicKey,
        nodeAddresses,
        perNodePublicKeys
      )

      if (!process.env["GITHUB_API_TOKEN"] || process.env["GITHUB_API_TOKEN"] === "") {
        throw Error("GITHUB_API_TOKEN environment variable not set")
      }

      const secretsURL = await createGist(process.env["GITHUB_API_TOKEN"], offchainSecrets)
      console.log(`Successfully created encrypted secrets Gist: ${secretsURL}`)
      requestConfig.secretsURLs = [`${secretsURL}/raw`]
    } else {
      // Else, verify the provided off-chain secrets URLs are valid
      await verifyOffchainSecrets(requestConfig.secretsURLs, nodeAddresses)
    }
  }

  // Remove the preceding 0x from the DON public key
  requestConfig.DONPublicKey = DONPublicKey.slice(2)
  // Build the parameters to make a request from the client contract
  const request = await buildRequest(requestConfig)
  request.secretsURLs = requestConfig.secretsURLs
  return request
}

exports.generateRequest = generateRequest
exports.verifyOffchainSecrets = verifyOffchainSecrets
