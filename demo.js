const ethers = await import("npm:ethers")

const addressToCheck = args[0]
const nftAddress = args[1]

const abi = ["function balanceOf(address owner) view returns (uint256)"]

class MyProvider extends ethers.JsonRpcProvider {
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

const provider = new MyProvider(secrets.RPC_URL)

const wallet = new ethers.Wallet(secrets.PRIVATE_KEY, provider)

// Send 1 ETH to the address
// const result = wallet.sendTransaction({
//   to: "0x0eb3B031927E6833231159c9ED0fE47EFD29842b",
//   value: ethers.parseEther("1.0")
// })

const nftContract = new ethers.Contract(nftAddress, abi, provider)

const balance = await nftContract.balanceOf(addressToCheck)

return Functions.encodeUint256(balance)
