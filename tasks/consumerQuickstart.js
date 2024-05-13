const { networks } = require("../networks")
const fs = require("fs")
const path = require("path")

/**
 * This script performs all the steps in the README's quickstart section, with a single command.
 * Remember to pass the network name as an argument when running this script. Ex: node scripts/all-quickstart.js --network ethereumSepolia
 * it stores relevant data outputs from each step in the temp.json file.
 */

task("functions-quickstart", "performs all the steps in the README's quickstart section")
  .addOptionalParam("amount", "Initial amount used to fund the subscription in LINK")
  .addOptionalParam(
    "simulate",
    "locally simulate the JS source before on-chain execution? (true/false)",
    false,
    types.boolean
  )
  .setAction(async (taskArgs) => {
    if (!networks[network.name]) {
      throw Error(`Invalid network name: ${network.name}`)
    }
    if (!process.env.PRIVATE_KEY && network.name !== "localFunctionsTestnet") {
      throw Error(`Missing PRIVATE_KEY environment variable for testnet: ${network.name}`)
    }

    let consumerContractAddress, subid

    // Step 1: npx hardhat functions-deploy-consumer --network network_name_here --verify true
    await run("functions-deploy-consumer", { network: network.name, verify: true })
    consumerContractAddress = await readTempJsFile("consumerContract")

    //  Step 2:  hardhat functions-sub-create --network network_name_here --amount LINK_funding_amount_here --contract 0x_deployed_client_contract_address_here`
    await run("functions-sub-create", {
      network: network.name,
      contract: consumerContractAddress,
      amount: taskArgs.amount ?? "3",
    })

    // Step 3 npx hardhat functions-request --network network_name_here --contract 0xDeployed_client_contract_address_here --subid subscription_id_number_here
    // TODO @zeuslawyer once the listener issue is fixed check script as currently it hangs on this step
    subid = (await readTempJsFile("subId")).toString()
    await run("functions-request", {
      network: network.name,
      simulate: taskArgs.simulate,
      contract: consumerContractAddress,
      subid: subid,
    })

    // `npx hardhat functions-read --contract 0xConsumer_contract_address --network  your_network_name`
    await run("functions-read", {
      network: network.name,
      contract: consumerContractAddress,
    })
  })

async function readTempJsFile(prop) {
  let value

  try {
    const data = await fs.promises.readFile(path.join(__dirname, "../temp.json"), { encoding: "utf8" })
    const fileData = JSON.parse(data)

    if (!fileData[prop]) {
      throw new Error(`Property ${prop} not found in temp.json`)
    }
    value = fileData[prop]
  } catch (err) {
    throw Error(`Error reading temp.json file: ${err}`)
  }

  return value
}
