const response = await Functions.makeHttpRequest({
  url: "https://dummyjson.com/products",
})
const one = response.data.products[0].id
await new Promise((r) => setTimeout(r, 5000))
return Functions.encodeUint256(parseInt(secrets.test) + one) // Expected response is 2
