const crypto = require('crypto')
const querystring = require('querystring')

// Replace , character with newline character
const privateKey = secrets.key.replace(/\\n/g,'\n')

const jwtHeader = '{"alg":"RS256","typ":"JWT"}'

const jwtBase64Headers = Buffer.from(jwtHeader).toString('base64')

const currentTimeInSeconds = Math.round(Date.now() / 1000)

const jwtClaimSetObj = {
  "iss": secrets.iss,
  "scope": "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics",
  "aud": "https://oauth2.googleapis.com/token",
  "exp": currentTimeInSeconds + 3500,
  "iat": currentTimeInSeconds
}

const jwtClaimSetString = JSON.stringify(jwtClaimSetObj)

const jwtBase64ClaimSet = Buffer.from(jwtClaimSetString).toString('base64')

const stringToSign = `${jwtBase64Headers}.${jwtBase64ClaimSet}`

const jwtBase64Signature = crypto.sign('RSA-SHA256', stringToSign, privateKey).toString('base64')

const assertion = `${jwtBase64Headers}.${jwtBase64ClaimSet}.${jwtBase64Signature}`

const jwtRequest = {
  grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
  assertion
}

const jwtRequestString = querystring.stringify(jwtRequest)

const tokenResponse = await Functions.makeHttpRequest({
  url: 'https://oauth2.googleapis.com/token',
  method: 'post',
  data: jwtRequestString
})

const accessToken = tokenResponse.data.access_token

const googleAnalyticsResponse = await Functions.makeHttpRequest({
  url: 'https://analyticsdata.googleapis.com/v1beta/properties/353119413:runRealtimeReport',
  method: 'post',
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Accept": 'application/json',
    "Content-Type": 'application/json'
  },
  data: {
    "metrics": [{"name":"activeUsers"}],
    //"metrics": [{ "name": "rt:pageviews" }],
    //"metricAggregations": ["TOTAL"],
    //"dimensions": [{"name": "deviceCategory"}],
    "minuteRanges":[{"startMinutesAgo":29,"endMinutesAgo":0}]
  }
})

console.log(googleAnalyticsResponse.data.rows[0])
console.log(googleAnalyticsResponse.response.data)

let usersInLast15Min
try {
  usersInLast15Min = parseInt(googleAnalyticsResponse.data.rows[0].metricValues[0].value)
} catch {
  usersInLast15Min = 0
}

return Functions.encodeUint256(usersInLast15Min)