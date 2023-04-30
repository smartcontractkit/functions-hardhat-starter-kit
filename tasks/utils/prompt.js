const readline = require("readline")
const chalk = require("chalk")
const { getPriceUSD } = require("./price")

function ask(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

async function prompt(query) {
  if (!process.env.SKIP_PROMPTS) {
    if (query) console.log(`${query}\n`)
    const reply = await ask(`${chalk.green("Continue?")} Enter (y) Yes / (n) No\n`)
    if (reply.toLowerCase() !== "y" && reply.toLowerCase() !== "yes") {
      console.log("Aborted.")
      process.exit(1)
    }
  }
}

async function promptTxCost(gasEstimate, hre, skipPrompt = false) {
  const { lastBaseFeePerGas, maxPriorityFeePerGas } = await hre.ethers.provider.getFeeData()

  const transactionEstimateNative = hre.ethers.utils.formatUnits(
    gasEstimate.mul(maxPriorityFeePerGas.add(lastBaseFeePerGas)),
    network.config.nativeCurrencyDecimals
  )
  const signer = await hre.ethers.getSigner()
  const nativePriceUSD = await getPriceUSD(network.config.linkPriceFeed, hre.ethers)
  const transactionEstimateUSD = transactionEstimateNative * nativePriceUSD

  console.log(`Estimating cost if the current gas price remains the same...\n`)

  console.log(`The transaction to initiate this request will charge the wallet (${signer.address}):`)
  console.log(
    `${chalk.blue(transactionEstimateNative + " " + network.config.nativeCurrencySymbol)}, which ${
      network.config.mainnet ? "" : "(using mainnet value) "
    }is $${transactionEstimateUSD}\n`
  )

  if (skipPrompt) return

  await prompt()
}

module.exports = {
  ask,
  prompt,
  promptTxCost,
}
