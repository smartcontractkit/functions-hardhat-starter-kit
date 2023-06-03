const fs = require("fs")

task("functions-deploy-raw-code", "Deploys a functions script as a (non-functional) contract on chain")
  .addPositionalParam("file", "The file containing the script code that should be deployed")
  .setAction(async (taskArgs) => {
    console.log(`Deploying contract to ${network.name}`)

    /* yul code for below bytecode
    object "CustomCodeDeploy" {
      code {
          let size := sub(codesize(), datasize("CustomCodeDeploy"))
          datacopy(0, datasize("CustomCodeDeploy"), size)
          return(0, size)
      }
    }
    using paris evm version (shanghai not yet supported on all networks)
    */
    //const arbitraryDataInitBytecode = '0x600c380380600c5f39805ff3'
    const arbitraryDataInitBytecode = "0x60113803806001601103600039806000f3"

    const contractCode = arbitraryDataInitBytecode + Buffer.from(fs.readFileSync(taskArgs.file)).toString("hex")

    const signer = (await hre.ethers.getSigners())[0]

    const txn = await signer.sendTransaction({ data: contractCode })
    const receipt = await txn.wait()

    console.log(`\nraw contract deployed to ${receipt.contractAddress} on ${network.name}`)
  })
