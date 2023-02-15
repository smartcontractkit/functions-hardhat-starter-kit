// Detailed documentation on how to calculate signature for Authorization Header and make HTTP requests to AWS S3 (applies to AWS Data Exchange also) is available here (https://docs.aws.amazon.com/pdfs/AmazonS3/latest/API/s3-api.pdf#sig-v4-header-based-auth)
const crypto = require('crypto')

/**
 * Formats the date to ISO 8601 basic format.
 * @param {Date} date - Javascript Date object
 * @returns ISO 8601 formatted string (for example 20130524T000000Z)
 */
const formatToISODate = (date) => {
  return date.toISOString().replace(/\W|_/g, '').slice(0, 15) + 'Z'
}

/**
 * Formats the date to specific format YYYYMMDD
 * @param {string} date -ISO 8601 date string
 * @returns Human readable short date string (for example 20130524)
 */
const shortDate = (date) => {
  return date.slice(0, 8)
}

/**
 * Constructs a string of headers
 * @param {boolean} withToken - flag that indicates whether security token is present (for temporary credentials)
 * @returns string of signed headers that should be part of Authorization request headers
 */
const buildSignedHeaders = (withToken = false) => {
  return `host;x-amz-date${withToken ? ';x-amz-security-token' : ''}`
}

/**
 * To calculate a signature, you first need a string to sign. You then calculate a HMAC-SHA256 hash of the string to sign by using a signing key. This function takes all the input, constructs various components, like hashed string of request, params, body, then creates a signing key and signs the content with that key to generate signature for Authorization header
 * @param {string} method - request method
 * @param {string} url - absolute url of the request including query parameters
 * @param {string} host - host of the request url
 * @param {string} secretKey - secretKey of AWS account
 * @param {string} securityToken - optional security token when temporary credentials are used
 * @param {string} date - current date (ISO 8601)
 * @param {string} payload - request body for POST/PUT request, empty string for GET requests or if there is no BODY
 * @param {string} region - AWS region for the service (for example us-east-1)
 * @param {string} service - AWS service name (for example s3, dataexchange)
 * @returns signature string that should be used in the Authorization header
 */
const buildSignature  = (method, url, host, secretKey, securityToken, date, payload, region, service) => {
  /**
   * Builds encoded and sorted query string from request url
   * @param {string} url - absolute url of the request
   * @returns string of request queries where keys and values are sorted and encoded
   */
  const buildQueries = (url) => {
    const queriesString = url.split('?')[1];
    if (!queriesString) {
      return ''
    }
    return  queriesString.split('&').map(queryPair => {
      const [key, value] = queryPair.split('=');
      return encodeURIComponent(key) + '=' + encodeURIComponent(value)
    }).sort().join('&')
  }

  /**
   * To calculate a signature, a special string has to be signed. Canonical request is part of that string. This functions takes various request parts and returns special shaped string that will be hashed later on. Since queries are passed separately we need to remove them from url parameter (if there is any)
   * @param {string} method - request method
   * @param {string} url - absolute url of the request WITHOUT query parameters
   * @param {string} host - host of the request url
   * @param {string} securityToken - optional security token when temporary credentials are used
   * @param {string} queries - encoded and sorted query parameters
   * @param {string} date - current date (ISO 8601)
   * @param {string} payload - request body for POST/PUT request, empty string for GET requests
   * @returns canonical request string
   */
  const buildCanonicalRequest = (method, url, host, securityToken, queries, date, payload) => {
    url = url.split('?')[0]
    return method + '\n'
      + encodeURI(url) + '\n'
      + queries + '\n'
      + 'host:' + host + '\n'
      + 'x-amz-date:' + date + '\n'
      + (securityToken ? 'x-amz-security-token:' + securityToken + '\n' : '')
      + '\n'
      + buildSignedHeaders(securityToken) + '\n'
      + crypto.createHash('sha256').update(payload).digest('hex')
  }

  /**
   * This function creates a string that will be signed by signature key as a final step to get the signature value.
   * @param {string} algorithm - algorithm for hashing (AWS4-HMAC-SHA256)
   * @param {string} date - current date (ISO 8601)
   * @param {string} region - AWS region for the service (for example us-east-1)
   * @param {string} service - AWS service name (for example s3, dataexchange)
   * @param {string} requestHash - SHA256Hash of canonical request string
   * @returns string that will be signed to get the final signature
   */
  const buildStringToSign = (algorithm, date, region, service, requestHash) => {
    return algorithm + '\n'
      + date  + '\n'
      + `${shortDate(date)}/${region}/${service}/aws4_request` +  '\n'
      + requestHash
  }

  /**
   * To calculate the signature first secretKey is used to derive a signing key. The derived signing key is specific to the date, service, and Region. For each of those new signing key is created using the previously created signing key. The final signature is the HMAC-SHA256 hash of the string to sign (content), using the final signing key as the key.
   * @param {string} secretKey - algorithm for hashing (AWS4-HMAC-SHA256)
   * @param {string} date - current date (ISO 8601)
   * @param {string} region - AWS region for the service (for example us-east-1)
   * @param {string} service - AWS service name (for example s3, dataexchange)
   * @param {string} content - SHA256Hash of canonical request string
   * @returns signature string that should be used in Authorization header
   */
  const generateSignatureFromRequest = (secretKey, date, region, service, content) => {
    const dataKey = crypto.createHmac('sha256', "AWS4" + secretKey).update(date).digest();
    const dateRegionKey = crypto.createHmac('sha256', dataKey).update(region).digest();
    const dateRegionServiceKey = crypto.createHmac('sha256', dateRegionKey).update(service).digest();
    const signingKey = crypto.createHmac('sha256', dateRegionServiceKey).update("aws4_request").digest();

    return crypto.createHmac('sha256', signingKey).update(content).digest("hex");
  }

  // 1. Get encoded and sorted queries from request url
  const queries = buildQueries(`https://api-fulfill.dataexchange.${region}.amazonaws.com${url}`)
  // 2. Use those queries with other requests components to build canonical request string
  const canonicalRequest = buildCanonicalRequest(method, url, host, securityToken, queries, date, payload)
  console.log({canonicalRequest})
  // 3. create SHA256 hash of canonical request string
  const requestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  // 4. using that hash create another string that will be signed by signing key
  const stringToSign = buildStringToSign('AWS4-HMAC-SHA256', date, region, service, requestHash)
  // 5. generate signing key and sign stringToSign using that key to get the final signature
  return  generateSignatureFromRequest(secretKey, shortDate(date), region, service, stringToSign)
}

const method = args[0] || 'GET' // Request method for AWS Data Exchange API
const host =  args[1] // API host of AWS service. for example api-fulfill.dataexchange.us-east-1.amazonaws.com
const url = args[2] ||'/v1' // Provider API URL to get data. Should always start with '/v1'
const region = args[3] ||'us-east-1' // AWS Region that the service is located in

const date = formatToISODate(new Date()) // Current date time formatted to ISO 8601 basic format
const service = args[4] ||'dataexchange' // Service name
const payload =  args[5] || '' // Payload (body) for POST/PUT requests. Should be empty string for GET or if there is no BODY
const resultPath =  args[6] // One level result path to get from response

if (!secrets.secretKey || !secrets.accessKey ) {
  throw Error("AWS secretKey and accessKey are required")
}

const signature = buildSignature(method, url, host, secrets.secretKey, secrets.securityToken, date, payload, region, service)

const config = {
  url: `https://${host}${url}`,
  headers: {
    'x-amzn-dataexchange-data-set-id': secrets.dataSetID,
    'x-amzn-dataexchange-revision-id': secrets.revisionID,
    'x-amzn-dataexchange-asset-id': secrets.assetID,
    'X-Amz-Date': date,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${secrets.accessKey}/${shortDate(date)}/${region}/${service}/aws4_request, SignedHeaders=${buildSignedHeaders(secrets.securityToken)}, Signature=${signature}`
  }
}

if (secrets.securityToken) {
  config.headers['X-Amz-Security-Token'] = secrets.securityToken
}

const response = await Functions.makeHttpRequest(config)

console.log(response)
const price = Math.round(response.data[resultPath || ''] * 100)


return Functions.encodeUint256(price)
