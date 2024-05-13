const fs = require("fs")

function createOrUpdateTempFile(obj) {
  let currentData
  try {
    currentData = JSON.parse(fs.readFileSync("temp.json"))
  } catch (e) {
    if (e.message.includes("no such file or directory")) {
      console.log("temp.json file not found. Creating a new one.\n")
      fs.writeFileSync("temp.json", JSON.stringify({}))
    } else {
      throw e
    }

    fs.writeFileSync("temp.json", JSON.stringify({}))
  }

  fs.writeFileSync("temp.json", JSON.stringify({ ...currentData, ...obj }))
  console.log("temp.json updated.\n")
}

module.exports = {
  createOrUpdateTempFile,
}
