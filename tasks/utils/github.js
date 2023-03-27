const axios = require("axios")

export const createGist = async (githubApiToken, encryptedOffchainSecrets) => {
  const content = JSON.stringify(encryptedOffchainSecrets)

  const headers = {
    Authorization: `token ${githubApiToken}`,
  }

  // construct the API endpoint for creating a Gist
  const url = "https://api.github.com/gists"
  const body = {
    public: true,
    files: {
      [`encrypted-functions-request-data-${new Date().now()}.json`]: {
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
  }
}

export const checkTokenGistScope = async (githubApiToken) => {
  const headers = {
    Authorization: `Bearer ${githubApiToken}`,
  }

  const response = await axios.get("https://api.github.com/user", { headers })

  if (response.status !== 200) {
    throw new Error(`Failed to get user data: ${response.status} ${response.statusText}`)
  }

  const scopes = response.headers["x-oauth-scopes"].split(", ")

  if (scopes?.[0] !== "gist") {
    throw Error("The provided Github API token does not have permissions to read and write Gists")
  }

  if (scopes.length > 1) {
    console.log("WARNING: The provided Github API token has additional permissions beyond reading and writing to Gists")
  }

  return true
}

export const deleteGist = async (gistURL, githubApiToken) => {
  const headers = {
    'Authorization': `Bearer ${githubApiToken}`
  };

  try {
    const response = await axios.delete(gistURL, { headers });

    if (response.status !== 204) {
      throw new Error(`Failed to delete Gist: ${response.status} ${response.statusText}`);
    }

    console.log(`Off-chain secrets Gist ${gistURL} deleted successfully`);
  } catch (error) {
    console.error('Error deleting Gist', error);
  }
}
