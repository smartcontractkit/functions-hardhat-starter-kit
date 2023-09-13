const process = require("process")
const path = require("path")
const fs = require("fs")
const { startLocalFunctionsTestnet } = require("@chainlink/functions-toolkit")
const { utils, Wallet } = require("ethers")
// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config("../.env.enc")
;(async () => {
  const requestConfigPath = path.join(process.cwd(), "Functions-request-config.js") // @dev Update this to point to your desired request config file
  console.log(`Using Functions request config file ${requestConfigPath}\n`)

  const localFunctionsTestnetInfo = await startLocalFunctionsTestnet(
    requestConfigPath,
    {
      logging: {
        debug: false,
        verbose: false,
        quiet: true, // Set this to `false` to see logs from the local testnet
      },
    } // Ganache server options (optional)
  )

  console.table({
    "FunctionsRouter Contract Address": localFunctionsTestnetInfo.functionsRouterContract.address,
    "DON ID": localFunctionsTestnetInfo.donId,
    "Mock LINK Token Contract Address": localFunctionsTestnetInfo.linkTokenContract.address,
  })

  // Fund wallets with ETH and LINK
  const addressToFund = new Wallet(process.env["PRIVATE_KEY"]).address
  await localFunctionsTestnetInfo.getFunds(addressToFund, {
    weiAmount: utils.parseEther("100").toString(), // 100 ETH
    juelsAmount: utils.parseEther("100").toString(), // 100 LINK
  })
  if (process.env["SECOND_PRIVATE_KEY"]) {
    const secondAddressToFund = new Wallet(process.env["SECOND_PRIVATE_KEY"]).address
    await localFunctionsTestnetInfo.getFunds(secondAddressToFund, {
      weiAmount: utils.parseEther("100").toString(), // 100 ETH
      juelsAmount: utils.parseEther("100").toString(), // 100 LINK
    })
  }

  // Update values in networks.js
  let networksConfig = fs.readFileSync(path.join(process.cwd(), "networks.js")).toString()
  const regex = /localFunctionsTestnet:\s*{\s*([^{}]*)\s*}/s
  const newContent = `localFunctionsTestnet: {
    url: "http://localhost:8545/",
    accounts,
    confirmations: 1,
    nativeCurrencySymbol: "ETH",
    linkToken: "${localFunctionsTestnetInfo.linkTokenContract.address}",
    functionsRouter: "${localFunctionsTestnetInfo.functionsRouterContract.address}",
    donId: "${localFunctionsTestnetInfo.donId}",
  }`
  networksConfig = networksConfig.replace(regex, newContent)
  fs.writeFileSync(path.join(process.cwd(), "networks.js"), networksConfig)
})()
