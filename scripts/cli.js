const { program } = require("commander")
const { getRequestConfigPath } = require("../FunctionsRequestCommon")
const { build } = require("./buildFunctionsRequest")
const { simulate } = require("./simulateFunctionsRequest")

program.name("function-request").description("cli for Chainlink Functions")

program
  .command("build")
  .option("-p, --path <requestConfigPath>", "request config path")
  .action(async (options) => {
    const requestConfigPath = getRequestConfigPath(options.path)
    await build(requestConfigPath)
  })

program
  .command("simulate")
  .option("-p, --path <requestConfigPath>", "request config path")
  .action(async (options) => {
    const requestConfigPath = getRequestConfigPath(options.path)
    await simulate(requestConfigPath)
  })

program.parse()
