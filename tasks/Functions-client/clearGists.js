const axios = require("axios")
const { deleteGist } = require("../utils/github")
const { RequestStore } = require("../utils/artifact")

task(
  "functions-clear-gists",
  "Deletes long-lived GitHub Gists that have been created for use in Automated Functions requests"
)
  .addParam("contract", "Address of the contract")
  .setAction(async (taskArgs, hre) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    const store = new RequestStore(hre.network.config.chainId, network.name, "automatedConsumer")

    let artifact
    try {
      artifact = await store.read(taskArgs.contract)
    } catch {
      return console.log(`Automated Consumer ${taskArgs.contract} not found.`)
    }

    if (!artifact.activeManagedSecretsURLs || artifact.secretsURLs.length < 1) {
      return console.log(`Automated Consumer ${taskArgs.contract} does not have active secret Gists.`)
    }

    let success = true
    await Promise.all(
      artifact.secretsURLs.map(async (url) => {
        if (!url.includes("github")) return console.log(`\n${url} is not a GitHub Gist - skipping`)
        const exists = axios.get(url)
        if (exists) {
          // Gist URLs end with '/raw', remove this
          const urlNoRaw = url.slice(0, -4)
          const succeeded = await deleteGist(process.env["GITHUB_API_TOKEN"], urlNoRaw)
          if (!succeeded) success = succeeded
        }
      })
    )

    if (!success)
      return console.log(
        `\nSome off-chain secret Gists for Automated Consumer ${taskArgs.contract} could not be deleted. Please re-try or delete manually.`
      )

    await store.update(taskArgs.contract, { activeManagedSecretsURLs: false })

    console.log(`\nAll off-chain secret Gists for Automated Consumer ${taskArgs.contract} have been deleted.`)
  })
