const fs = require("fs")

const createTempFile = () => {
  fs.writeFileSync("temp.json", {})
}

UpdateTempFile = (obj) => {
  const currentData = JSON.parse(fs.readFileSync("temp.json"))
  fs.writeFileSync("temp.json", JSON.stringify({ ...temp, ...obj }))
}
