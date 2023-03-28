const path = require("node:path")
const fs = require("node:fs/promises")

const currentVersion = "0"

// export interface RequestData {
//   type: 'consumer' | 'automatedConsumer'
//   id: string;
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
const DEFAULT_SUBDIRECTORY = "requests"

class RequestStore {
  chainId // number;
  chainName // string;
  path // string;

  constructor(
    chainId /*: number */,
    chainName /*: string */,
    directory = DEFAULT_DIRECTORY,
    subdirectory = DEFAULT_SUBDIRECTORY
  ) {
    this.chainId = chainId
    this.chainName = chainName
    const network = `${chainId}-${chainName}`
    this.path = path.join(directory, subdirectory, network)

    // Set up folders along the path if they don't already exist
    fs.mkdir(this.path, { recursive: true }, (err) => {
      if (err) throw err
    })
  }

  async create(data /*: RequestData*/) /*: Promise<void> */ {
    validateDataVersion0(data)
    if (await this.exists(data.id)) {
      throw new Error(`Request ${data.id} already exists on chain ${this.chainId}`)
    }
    const contents = toRequestArtifact(data)
    await this.writeFile(data.id, contents)
  }

  async read(id /*: string*/) /*: Promise<RequestArtifact>*/ {
    try {
      const data = JSON.parse(await this.readFile(id))
      return validateRequestArtifactVersion(data)
    } catch (e) {
      console.error(`Could not find artifact with the ID of ${id}`)
      throw e
    }
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
}

async function orderReccentFiles(directory /*: string*/) {
  return await fs
    .readdir(directory)
    .filter((f) => fs.lstat(f).isFile())
    .map((file) => ({ file, mtime: fs.lstat(file).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
}

function toRequestArtifact(data /*: RequestData*/) /*: RequestArtifact*/ {
  return {
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
    artifactVersion: currentVersion,
    status: "pending",
    result: null,
    error: null,
    ...data,
  }
}

function validateDataVersion0(data /*: RequestData*/) /*: void*/ {
  if (typeof data !== "object") throw new Error("Request data must be an object")
  if (!data.id) throw new Error("Request data must include the field: id")
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
