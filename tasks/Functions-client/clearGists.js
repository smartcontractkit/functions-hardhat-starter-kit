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

    let gist
    try {
      gist = await store.read(taskArgs.contract)
    } catch {
      return console.log(`Automated Consumer ${taskArgs.contract} not found.`)
    }

    if (!gist.activeManagedSecretsURLs || gist.secretsURLs.length < 1) {
      return console.log(`Automated Consumer ${taskArgs.contract} does not have active secret Gists.`)
    }

    let success = true
    await Promise.all(
      gist.secretsURLs.map(async (url) => {
        const exists = axios.get(url)
        if (exists) {
          const succeeded = await deleteGist(process.env["GITHUB_API_TOKEN"], url.slice(0, -4))
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
