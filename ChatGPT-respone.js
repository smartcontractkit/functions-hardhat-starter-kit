const prompt = args[0]

if (!secrets.openaiKey) {
  throw Error("Need to set Open AI variable")
}
const OpenAIRequest = Functions.makeHttpRequest({
  url: "https://api.openai.com/v1/completions",
  method: "POST",
  headers: {
    Authorization: `Bearer ${secrets.openaiKey}`, //fix this
  },
  data: { model: "text-davinci-003", prompt: prompt, temperature: 0, max_tokens: 1000 },
})
const openAiResponse = await OpenAIRequest

console.log("raw respone", openAiResponse)
//console.log("raw data respone", openAiResponse.data.choices[0])

//let result = openAiResponse.data.choices[0].text
//console.log("name: ", result)

return Functions.encodeString(result)
