// Returns total number of NFTs a user holds in a given NFT collection

// Uses latest version of Ethers (v6.9.0)
const ethers = await import("npm:ethers")

// Get the owner address to check and the address of the NFT contract from args
const addressToCheck = args[0]
const nftAddress = args[1]
// Contract method ABI to get number of NFTs held by an address
const abi = ["function balanceOf(address owner) view returns (uint256)"]
// Chainlink Functions compatible Ethers JSON RPC provider class
// (this is required for making Ethers RPC calls with Chainlink Functions)
class FunctionsJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(url) {
    super(url)
    this.url = url
  }
  async _send(payload: ethers.JsonRpcPayload | Array<ethers.JsonRpcPayload>): Promise<Array<ethers.JsonRpcResult>> {
    let resp = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return resp.json()
  }
}

const provider = new FunctionsJsonRpcProvider(secrets.RPC_URL)
const nftContract = new ethers.Contract(nftAddress, abi, provider)
const balance = await nftContract.balanceOf(addressToCheck)

return Functions.encodeUint256(balance)
