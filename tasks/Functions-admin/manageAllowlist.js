const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")
const fs = require("fs")

const Action = {
  Add: 0,
  Remove: 1,
}

async function addOrRemove(action, taskArgs) {
  if (network.name === "hardhat") {
    throw Error("This command cannot be used on a local development chain.  Specify a valid network.")
  }

  const oracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
  const oracle = oracleFactory.attach(networkConfig[network.name]["functionsOracleProxy"])

  let addresses
  if (taskArgs.addresses) {
    addresses = taskArgs.addresses.split(",")
    addresses = addresses.filter((a) => {
      return ethers.utils.isAddress(a)
    })
    const invalidAddresses = addresses.filter((a) => {
      return !ethers.utils.isAddress(a)
    })
    console.log(`The following addresses are invalid and will be ignored: ${invalidAddresses}`)
  }

  let tx
  if (action == Action.Add) {
    if (!addresses) {
      console.log(
        `Adding addresses from allowlist.csv to oracle ${networkConfig[network.name]["functionsOracleProxy"]}`
      )
      await addFromAllowlist(taskArgs, oracle)
      console.log(`Allowlist updated for oracle ${oracle.address} on ${network.name}`)
      return
    }
    console.log(`Adding addresses ${addresses} to oracle ${networkConfig[network.name]["functionsOracleProxy"]}`)
    tx = await oracle.addAuthorizedSenders(addresses)
  } else {
    if (!addresses) {
      throw Error("No addresses provided")
    }
    console.log(`Removing addresses ${addresses} from oracle ${networkConfig[network.name]["functionsOracleProxy"]}`)
    tx = await oracle.removeAuthorizedSenders(addresses)
  }

  console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${tx.hash} to be confirmed...`)
  await tx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

  console.log(`Allowlist updated for oracle ${oracle.address} on ${network.name}`)
}

task(
  "functions-add-senders",
  "Add wallets to allowlist in the Oracle contract.  In order to add users from allowlist.csv, copy the CSV file into the root directory and do not set the addresses parameter."
)
  .addOptionalParam(
    "addresses",
    "Comma-separated list of addresses.  If this is not provided, addresses will be pulled from the allowlist CSV file"
  )
  .addOptionalParam("filename", "Name of the allowlist CSV file (defaults to allowlist.csv)")
  .addOptionalParam(
    "eventcodes",
    "Comma-separated list of valid event code that must be provided by the user to be added"
  )
  .setAction(async (taskArgs) => {
    await addOrRemove(Action.Add, taskArgs)
  })

task("functions-remove-senders", "Remove wallets from allowlist in the Oracle contract")
  .addParam("addresses", "Comma-separated list of addresses")
  .setAction(async (taskArgs) => {
    await addOrRemove(Action.Remove, taskArgs)
  })

const addFromAllowlist = async (taskArgs, oracle, overrides) => {
  const currentAllowlist = await oracle.getAuthorizedSenders()

  const allowlistData = getDataFromAllowlist(taskArgs.eventcodes, taskArgs.filename)

  const addressesToAdd = filterAddressesToAdd(currentAllowlist, allowlistData.validUsers)

  if (addressesToAdd.length === 0) {
    console.log("No new valid addresses to add")
  } else {
    console.log(`Adding ${addressesToAdd.length} new addresses`)

    const addressChunkSize = 25
    let tx
    for (let i = 0; i < addressesToAdd.length; i += addressChunkSize) {
      const addressChunk = addressesToAdd.slice(i, Math.min(i + addressChunkSize, addressesToAdd.length))

      console.log("Adding the following addresses:")
      console.log(addressChunk)

      tx = overrides
        ? await oracle.addAuthorizedSenders(addressChunk, overrides)
        : await oracle.addAuthorizedSenders(addressChunk)

      await tx.wait(1)
    }

    tx.wait(VERIFICATION_BLOCK_CONFIRMATIONS - 1)
  }

  const updatedAllowlist = await oracle.getAuthorizedSenders()

  generateUpdatedAllowlistCsv(updatedAllowlist, allowlistData)
}

const getDataFromAllowlist = (requiredEventCodes, allowlistFileName) => {
  const allowList = fs.readFileSync(allowlistFileName ?? "./allowlist.csv").toString()

  const allowListLines = allowList.split("\n")
  // Ignore the first line which contains column titles
  const titles = allowListLines[0]
  const lines = allowListLines.slice(1)

  // allUsers maintains the list of users in sorted order
  const allUsers = []
  const validUsers = []
  const invalidUsers = []

  // Split address from email and place into an object
  for (const line of lines) {
    const columns = line.split(",")

    // Remove extraneous spaces from user's typed entries
    const user = {
      approved: columns[0],
      walletAddress: columns[1].replace(/\s/g, ""),
      email: columns[2].replace(/\s/g, ""),
      agreedToTOS: columns[3],
      eventCode: columns[4].replace(/\s/g, ""),
<<<<<<< HEAD
      utm_medium: columns[5],
      utm_source: columns[6],
      utm_content: columns[7],
      utm_term: columns[8],
      utm_campaign: columns[9],
      submittedAt: columns[10],
      token: columns[11],
      notes: columns[12],
=======
      submittedAt: columns[5],
      token: columns[6],
      notes: columns[7],
>>>>>>> 9e7e712c (Add OpenZeppelin Upgradable (#73))
    }
    // Maintain a list of all users
    allUsers.push(user)
    // Check that user is valid
    if (!ethers.utils.isAddress(user.walletAddress)) {
      user.notes = "INVALID WALLET ADDRESS " + user.notes
      invalidUsers.push(user)
      continue
    }
    if (user.agreedToTOS.toLowerCase() !== "true") {
      user.notes = "DID NOT AGREE TO TOS" + user.notes
      invalidUsers.push(user)
      continue
    }
    if (
      requiredEventCodes &&
      (user.eventCode.toLowerCase() === "" ||
        !requiredEventCodes.toLowerCase().split(",").includes(user.eventCode.toLowerCase()))
    ) {
      user.notes = "INVALID EVENT CODE" + user.notes
      invalidUsers.push(user)
      continue
    }
    // If user is valid, add them to validUsers
    validUsers.push(user)
  }

  return {
    titles,
    allUsers,
    validUsers,
    invalidUsers,
  }
}

const filterAddressesToAdd = (currentAllowlist, validUsers) => {
  const currentAllowlistMap = {}

  currentAllowlist.forEach((address) => {
    currentAllowlistMap[address.toLowerCase()] = true
  })

  const addressesToAdd = []

  for (const user of validUsers) {
    if (!currentAllowlistMap[user.walletAddress.toLowerCase()]) {
      addressesToAdd.push(user.walletAddress)
    }
  }

  return addressesToAdd
}

const generateUpdatedAllowlistCsv = (updatedOnChainAllowlist, allowlistData) => {
  const onChainAllowlistMap = {}

  updatedOnChainAllowlist.forEach((address) => {
    onChainAllowlistMap[address.toLowerCase()] = true
  })

  const lines = [allowlistData.titles]

  for (let i = 0; i < allowlistData.allUsers.length; i++) {
    if (onChainAllowlistMap[allowlistData.allUsers[i].walletAddress.toLowerCase()]) {
      allowlistData.allUsers[i].approved = "Yes"
    } else {
      allowlistData.allUsers[i].approved = ""
    }

    lines.push(createEntryLine(allowlistData.allUsers[i]))
  }

  const updatedCsvText = lines.join("\n")
  fs.writeFileSync("./updatedAllowlist.csv", updatedCsvText)

  const invalidLines = [allowlistData.titles]

  for (const invalidUser of allowlistData.invalidUsers) {
    invalidLines.push(createEntryLine(invalidUser))
  }

  const invalidCsvText = invalidLines.join("\n")

  fs.writeFileSync("./invalidUsers.csv", invalidCsvText)
}

const createEntryLine = (user) => {
  const {
    approved,
    walletAddress,
    email,
    agreedToTOS,
    eventCode,
    utm_medium,
    utm_source,
    utm_content,
    utm_term,
    utm_campaign,
    submittedAt,
    token,
    notes,
  } = user

  return `${approved},${walletAddress},${email},${agreedToTOS},${eventCode},${utm_medium},${utm_source},${utm_content},${utm_term},${utm_campaign},${submittedAt},${token},${notes}`
}
