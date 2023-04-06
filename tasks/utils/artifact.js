const path = require("node:path")
const fs = require("node:fs/promises")

const currentVersion = "0"

// export interface RequestData {
//   type: 'consumer' | 'automatedConsumer'
//   automatedConsumerContractAddress?: string;
//   requestId?: string;
//   taskArgs: { };
//   codeLocation: number;
//   codeLanguage: number;
//   source: string;
//   secrets: { };
//   perNodeSecrets: [];
//   secretsURLs: [];
//   activeManagedSecretsURLs: boolean;
//   args: string[];
//   expectedReturnType: string;
//   DONPublicKey: string;
//   transactionReceipt: ethers.TransactionReceipt;
// }

// export interface RequestArtifact extends RequestData {
//   createdAt: number;
//   lastUpdatedAt: number;
//   artifactVersion: string;
//   status: 'pending' | 'complete' | 'failed' | 'timed_out' | 'pending_timed_out'
//   result: string
// }

// export interface RequestArtifactUpdateable {
//   status: 'pending' | 'complete' | 'failed' | 'timed_out'
//   result: string
//   error: string
// }

const DEFAULT_DIRECTORY = ".chainlink_functions"
const REQUEST_TYPE_TO_ID_KEY = {
  consumer: "requestId",
  automatedConsumer: "automatedConsumerContractAddress",
}

class RequestStore {
  chainId // number;
  chainName // string;
  requestType // string;
  idKey // string;
  path // string;

  constructor(
    chainId /*: number */,
    chainName /*: string */,
    requestType /*: string */,
    directory = DEFAULT_DIRECTORY
  ) {
    this.chainId = chainId
    this.chainName = chainName
    const network = `${chainId}-${chainName}`
    if (requestType !== "consumer" && requestType !== "automatedConsumer")
      throw new Error("Unsupported request type, must be one of: consumer, automatedConsumer")
    this.requestType = requestType
    this.idKey = REQUEST_TYPE_TO_ID_KEY[requestType]
    this.path = path.join(directory, network, requestType)
  }

  async create(data /*: RequestData*/) /*: Promise<void> */ {
    validateDataVersion0(data)
    if (await this.exists(data[this.idKey])) {
      throw new Error(`Request ${data[this.idKey]} already exists on chain ${this.chainId}`)
    }
    const contents = toRequestArtifact(data)
    await this.writeFile(data[this.idKey], contents)
  }

  async read(id /*: string*/) /*: Promise<RequestArtifact>*/ {
    const data = JSON.parse(await this.readFile(id))
    return validateRequestArtifactVersion(data)
  }

  async update(id /*: string*/, data /*: Fragment<RequestArtifactUpdateable>*/) /*: Promise<void> */ {
    if (!(await this.exists(id))) {
      throw new Error(`Request ${id} not found on chain ${this.chainId}`)
    }
    const previousData = await this.read(id)
    // NOTE: This is a shallow merge
    const mergedData = { ...previousData, ...data, lastUpdatedAt: Date.now() }
    await this.writeFile(id, mergedData)
  }

  async upsert(id /*: string*/, data /*: Fragment<RequestData>*/) /*: Promise<boolean> */ {
    let created = false
    let previousData = {}
    let newData = data
    try {
      previousData = await this.read(id)
    } catch {
      created = true
      newData = toRequestArtifact(data)
    }
    // NOTE: This is a shallow merge
    const mergedData = { ...previousData, ...newData, lastUpdatedAt: Date.now() }
    validateDataVersion0(mergedData)
    await this.writeFile(id, mergedData)
    return created
  }

  async delete(id /*: string*/) /*: Promise<void> */ {
    if (!(await this.exists(id))) {
      throw new Error(`Request ${id} not found on chain ${this.chainId}`)
    }
    await this.deleteFile(id)
  }

  /* private */ async exists(name, fileType = ".json") /*: Promise<boolean> */ {
    const location = path.join(this.path, `${name}${fileType}`)
    try {
      await fs.access(location)
      return true
    } catch (e) {
      return false
    }
  }

  /* private */ async readFile(name /*: string*/, fileType = ".json") /*: Promise<string>*/ {
    const location = path.join(this.path, `${name}${fileType}`)
    return await fs.readFile(location, "utf8")
  }

  /* private */ async writeFile(name, data, fileType = ".json") /*: Promise<void>*/ {
    await this.validatePath()
    const location = path.join(this.path, `${name}${fileType}`)
    const contents = JSON.stringify(data, null, 2) + "\n"
    await fs.writeFile(location, contents)
  }

  /* private */ async deleteFile(name, fileType = ".json") /*: Promise<void>*/ {
    const location = path.join(this.path, `${name}${fileType}`)
    await fs.unlink(location)
  }

  /* private */ async findLatestRequest() /*: Promise<string>*/ {
    const files = await orderReccentFiles(this.path)
    return files.length ? files[0] : undefined
  }

  /* private */ async validatePath() /*: Promise<void>*/ {
    // Set up folders along the path if they don't already exist
    await fs.mkdir(this.path, { recursive: true }, (err) => {
      if (err) throw err
    })
  }
}

async function orderReccentFiles(directory /*: string*/) {
  return await fs
    .readdir(directory)
    .filter((f) => fs.lstat(f).isFile())
    .map((file) => ({ file, mtime: fs.lstat(file).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
}

function toRequestArtifact(data /*: RequestData*/) /*: RequestArtifact*/ {
  const secrets = data.secrets ?? {}
  const secretsNoValues = Object.fromEntries(Object.entries(secrets).map(([key, value]) => [key, "[REDACTED]"]))
  return {
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
    artifactVersion: currentVersion,
    status: "pending",
    result: null,
    error: null,
    ...data,
    secrets: secretsNoValues,
  }
}

function validateDataVersion0(data /*: RequestData*/) /*: void*/ {
  if (typeof data !== "object") throw new Error("Request data must be an object")
  if (data.type !== "consumer" && data.type !== "automatedConsumer")
    throw new Error("Request data type must be one of: consumer, automatedConsumer")
  if (data.type == "consumer" && !data.requestId) throw new Error("Must include field: requestId")
  if (data.type == "automatedConsumer" && !data.automatedConsumerContractAddress)
    throw new Error("Must include field: automatedConsumerContractAddress")
}

function validateRequestArtifactVersion(data /*: RequestArtifact*/) {
  if (typeof data.artifactVersion !== "string") throw new Error("Required field 'artifactVersion' is missing")
  if (Number(data.artifactVersion) < Number(currentVersion)) return migrateRequestArtifactVersion(data)
  if (data.artifactVersion === currentVersion) return data
  throw new Error(`Unknown version number ${data.artifactVersion}. The latest version is ${currentVersion}`)
}

function migrateRequestArtifactVersion(data /*: RequestArtifact*/) {
  switch (data.artifactVersion) {
    case "0":
      break
    default:
      throw new Error(`Unknown version number ${data.artifactVersion}`)
  }
}

module.exports = { RequestStore }
