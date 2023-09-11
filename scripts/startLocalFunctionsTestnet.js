const process = require("process")
const path = require("path")
const fs = require("fs")
const { startLocalFunctionsTestnet } = require("@chainlink/functions-toolkit")
const { utils } = require("ethers")
// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config("../.env.enc")
;(async () => {
  const addressToFund = "0x2334dE553AB93c69b0ccbe278B6f5E8350Db6204" // TODO @dev update this to the address you want to fund

  const requestConfigPath = path.join(process.cwd(), "Functions-request-config.js") // @dev Update this to point to your desired request config file

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

  console.log("\nFunctionsRouter Contract Address:", localFunctionsTestnetInfo.functionsRouterContract.address)
  console.log("DON ID:".padStart(33, " "), localFunctionsTestnetInfo.donId)
  console.log("Mock LINK Token Contract Address:", localFunctionsTestnetInfo.linkTokenContract.address, "\n")

  if (addressToFund.length > 0) {
    await localFunctionsTestnetInfo.getFunds(addressToFund, {
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
