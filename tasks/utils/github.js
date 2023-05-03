const axios = require("axios")

const createGist = async (githubApiToken, encryptedOffchainSecrets) => {
  await checkTokenGistScope(githubApiToken)

  const content = JSON.stringify(encryptedOffchainSecrets)

  const headers = {
    Authorization: `token ${githubApiToken}`,
  }

  // construct the API endpoint for creating a Gist
  const url = "https://api.github.com/gists"
  const body = {
    public: false,
    files: {
      [`encrypted-functions-request-data-${Date.now()}.json`]: {
        content,
      },
    },
  }

  try {
    const response = await axios.post(url, body, { headers })
    const gistUrl = response.data.html_url
    return gistUrl
  } catch (error) {
    console.error("Failed to create Gist", error)
    throw new Error("Failed to create Gist")
  }
}

const checkTokenGistScope = async (githubApiToken) => {
  const headers = {
    Authorization: `Bearer ${githubApiToken}`,
  }

  const response = await axios.get("https://api.github.com/user", { headers })

  if (response.status !== 200) {
    throw new Error(`Failed to get user data: ${response.status} ${response.statusText}`)
  }
  // Github's newly-added fine-grained token do not currently allow for verifying that the token scope is restricted to Gists.
  // This verification feature only works with classic Github tokens and is otherwise ignored
  const scopes = response.headers["x-oauth-scopes"]?.split(", ")

  if (scopes && scopes?.[0] !== "gist") {
    throw Error("The provided Github API token does not have permissions to read and write Gists")
  }

  if (scopes && scopes.length > 1) {
    console.log("WARNING: The provided Github API token has additional permissions beyond reading and writing to Gists")
  }

  return true
}

const deleteGist = async (githubApiToken, gistURL) => {
  const headers = {
    Authorization: `Bearer ${githubApiToken}`,
  }

  const gistId = gistURL.match(/\/([a-fA-F0-9]+)$/)[1]

  try {
    const response = await axios.delete(`https://api.github.com/gists/${gistId}`, { headers })

    if (response.status !== 204) {
      throw new Error(`Failed to delete Gist: ${response.status} ${response.statusText}`)
    }

    console.log(`\nOff-chain secrets Gist ${gistURL} deleted successfully`)
    return true
  } catch (error) {
    console.error(`Error deleting Gist ${gistURL}`, error.response)
    return false
  }
}

module.exports = {
  createGist,
  deleteGist,
}
