const crypto = require('crypto')
const querystring = require('querystring')

// Replace \n character with actual newline character
const privateKey = secrets.key.replace(/\\n/g,'\n')

const jwtBase64Headers = Buffer.from('{"alg":"RS256","typ":"JWT"}').toString('base64')

const currentTimeInSeconds = Math.round(Date.now() / 1000)

const jwtClaimSetObj = {
  "iss": secrets.iss,
  "scope": "https://www.googleapis.com/auth/cloud-platform.read-only",
  "aud": "https://oauth2.googleapis.com/token",
  "exp": currentTimeInSeconds + 3500,
  "iat": currentTimeInSeconds
}

const jwtBase64ClaimSet = Buffer.from(JSON.stringify(jwtClaimSetObj)).toString('base64')

const stringToSign = `${jwtBase64Headers}.${jwtBase64ClaimSet}`

const jwtBase64Signature = crypto.sign('RSA-SHA256', stringToSign, privateKey).toString('base64')

const jwtRequest = {
  grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
  assertion: `${jwtBase64Headers}.${jwtBase64ClaimSet}.${jwtBase64Signature}`
}

const jwtRequestString = querystring.stringify(jwtRequest)

const tokenResponse = await Functions.makeHttpRequest({
  url: 'https://oauth2.googleapis.com/token',
  method: 'post',
  data: jwtRequestString
})

const accessToken = tokenResponse.data.access_token

const requestConfig = {
  method: 'post',
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Accept": 'application/json',
    "Content-Type": 'application/json'
  },
  data: {
    "query": "SELECT COUNT(DISTINCT user_pseudo_id) AS votes FROM `functions-demo-377319.analytics_353119413.events_intraday_20230223`, UNNEST(event_params) AS params WHERE params.value.string_value = 'https://www.fluancer.com/' OR params.value.string_value = 'https://www.fluancer.com/influencers'",
    "useLegacySql": false
  }
}

requestConfig.url = `https://bigquery.googleapis.com/bigquery/v2/projects/functions-demo-377319/queries`
const request1 = Functions.makeHttpRequest(requestConfig)

// requestConfig.url = `https://analyticsdata.googleapis.com/v1beta/properties/${secrets.property2}:runRealtimeReport`
// const request2 = Functions.makeHttpRequest(requestConfig)

const responses = await Promise.all([ request1 ])//, request2 ])

// console.log(responses[0])
// console.log(responses[1])

let item1Votes
try {
  item1Votes = parseInt(responses[0].data.rows[0].f[0].v)
} catch {
  item1Votes = 0
}

// let item2Votes
// try {
//   item2Votes = parseInt(responses[1].data.rows[0].metricValues[0].value)
// } catch {
//   item2Votes = 0
// }

console.log(`Item 1 votes: ${item1Votes}`)//\nItem 2 votes: ${item2Votes}`)

return Functions.encodeUint256(item1Votes)

return Buffer.concat([ Functions.encodeUint256(item1Votes), Functions.encodeUint256(item2Votes) ])