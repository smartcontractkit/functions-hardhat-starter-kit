const path = require("node:path")
const fs = require("node:fs/promises")

const currentVersion = "0"

// export interface RequestData {
//  // location of source code (only Inline is currently supported)
//   codeLocation: Location.Inline,
//  // location of secrets (Inline or Remote)
//   secretsLocation: Location.Inline,
//  // code language (only JavaScript is currently supported)
//   codeLanguage: CodeLanguage.JavaScript,
//  // string containing the source code to be executed
//   source: fs.readFileSync("./calculation-example.js").toString(),
//  // secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey). The secrets object can only contain string values.
//   secrets: { apiKey: process.env.COINMARKETCAP_API_KEY ?? "" },
//  // Redundant URLs which point to encrypted off-chain secrets
//   secretsURLs: [],
//  // args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
//   args: ["1", "bitcoin", "btc-bitcoin", "btc", "1000000", "450"],
//  // expected type of the returned value
//   expectedReturnType: ReturnType.uint256,
//  // Default offchain secrets object used by the `functions-build-offchain-secrets` command
//   globalOffchainSecrets: {},
//  // Per-node offchain secrets objects used by the `functions-build-offchain-secrets` command
//   perNodeOffchainSecrets: [],
// }

// export interface RequestArtifact extends RequestData {
//   createdAt: number;
//   lastUpdatedAt: number;
//   artifactVersion: string;
//   status: 'pending' | 'complete' | 'failed' | 'timed_out'
// }

// export interface RequestArtifactUpdateable {
//   lastUpdatedAt: number;
//   status: 'pending' | 'complete' | 'failed' | 'timed_out'
//   result: string
// }

const DEFAULT_DIRECTORY = ".chainlink_functions"
const DEFAULT_SUBDIRECTORY = "requests"

class RequestStore {
  chainId // number;
  path // string;

  constructor(chainId /*: number */, directory = DEFAULT_DIRECTORY, subdirectory = DEFAULT_SUBDIRECTORY) {
    this.chainId = chainId
    this.path = path.join(directory, subdirectory, String(chainId))

    // Set up folders along the path if they don't already exist
    fs.mkdir(this.path, { recursive: true }, (err) => {
      if (err) throw err
    })
  }

  async create(data /*: RequestData*/) /*: Promise<void> */ {
    validateDataVersion0(data)
    if (await this.exists(data.requestId)) {
      throw new Error(`Request ${data.requestId} already exists on chain ${this.chainId}`)
    }
    const contents = toRequestArtifact(data)
    await this.writeFile(data.requestId, contents)
  }

  async read(requestId /*: string*/) /*: Promise<RequestArtifact>*/ {
    try {
      const data = JSON.parse(await this.readFile(requestId))
      return validateRequestArtifactVersion(data)
    } catch (e) {
      console.error(`Could not find artifact with the request ID of ${requestId}`)
      throw e
    }
  }

  async update(requestId /*: string*/, data) /*: Promise<void> */ {
    if (!(await this.exists(requestId))) {
      throw new Error(`Request ${requestId} not found on chain ${this.chainId}`)
    }
    const previousData = await this.read(requestId)
    // NOTE: This is a shallow merge
    const mergedData = { ...previousData, ...data, lastUpdatedAt: Date.now() }
    await this.writeFile(requestId, mergedData)
  }

  async delete(requestId /*: string*/) /*: Promise<void> */ {
    if (!(await this.exists(requestId))) {
      throw new Error(`Request ${requestId} not found on chain ${this.chainId}`)
    }
    await this.deleteFile(requestId)
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
    if (this.file === this.fallbackFile) {
      return await fs.readFile(this.file, "utf8")
    } else {
      const fallbackExists = await this.exists(this.fallbackFile)
      const fileExists = await this.exists(this.file)

      if (fileExists && fallbackExists) {
        throw new UpgradesError(
          `Network files with different names ${this.fallbackFile} and ${this.file} were found for the same network.`,
          () =>
            `More than one network file was found for chain ID ${this.chainId}. Determine which file is the most up to date version, then take a backup of and delete the other file.`
        )
      } else if (fallbackExists) {
        return await fs.readFile(this.fallbackFile, "utf8")
      } else {
        return await fs.readFile(this.file, "utf8")
      }
    }
  }
}

function toRequestArtifact(data /*: RequestData*/) /*: RequestArtifact*/ {
  return {
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
    artifactVersion: currentVersion,
    status: "pending",
    ...data,
  }
}

function validateDataVersion0(data /*: RequestData*/) /*: void*/ {
  if (typeof data !== "object") throw new Error("Request data must be an object")
  if (!data.requestId) throw new Error("Request data must include a requestId")
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
