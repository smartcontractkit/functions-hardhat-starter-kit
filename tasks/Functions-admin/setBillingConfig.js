const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-set-billing-config", "Sets the BillingRegistry config using values from a given JSON file")
  .addParam("configfile", "JSON config file with 'BillingRegistryConfig' field")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local development chain.  Specify a valid network.")
    }

    console.log("Setting registry configuration")
    const registryFactory = await ethers.getContractFactory(
      "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
    )
    const registry = registryFactory.attach(networkConfig[network.name]["functionsBillingRegistryProxy"])
    const billingConfig = require("../../" + taskArgs.configfile)["BillingRegistryConfig"]

    const setConfigTx = await registry.setConfig(
      billingConfig.MaxGasLimit,
      billingConfig.StalenessSeconds,
      billingConfig.GasAfterPaymentCalculation,
      billingConfig.FallbackWeiPerUnitLink,
      billingConfig.GasOverhead,
      billingConfig.RequestTimeoutSeconds
    )

    console.log(
      `Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${setConfigTx.hash} to be confirmed...`
    )
    await setConfigTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log("Registry configuration set")
  })
