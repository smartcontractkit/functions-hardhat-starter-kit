const ethCrypto = require("eth-crypto")

const { publicKey, privateKey } = ethCrypto.createIdentity()
console.log(`\nNewly generated Keys\nPublic Key: ${publicKey}\nPrivate Key: ${privateKey}`)
