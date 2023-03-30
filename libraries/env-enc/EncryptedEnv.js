"use strict"
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, "__esModule", { value: true })
const fs_1 = __importDefault(require("fs"))
const path_1 = __importDefault(require("path"))
const os_1 = __importDefault(require("os"))
const crypto_1 = __importDefault(require("crypto"))
const promises_1 = __importDefault(require("readline/promises"))
class EncryptedEnv {
  constructor(options) {
    this.envVars = {}
    this.setVar = (name, value) => {
      console.clear()
      if (!this.password) {
        console.log(
          "Please set the ENV_ENC_PASSWORD environment variable to a password of your choosing.\nOn Mac and Linux terminals, or Windows command prompt, run the command: set ENV_ENC_PASSWORD=YourPasswordHere\nFor Windows PowerShell, run the command: $env:ENV_ENC_PASSWORD=YourPasswordHere"
        )
        return
      }
      if (!this.isValidEnvVarName(name)) {
        console.log(
          `${name} is an invalid name for an environment variable.  It must start with an underscore or upper-case character may only contain upper-case characters, underscores, and numbers.`
        )
        return
      }
      this.envVars[name] = value
      process.env[name] = value
      this.writeEnvEncFile()
      console.log(`Successfully saved environment variable ${name}`)
    }
    this.removeVar = (name) => {
      if (!this.envVars[name]) {
        console.log(`No saved environment variable with the name ${name} was found`)
        return
      }
      delete this.envVars[name]
      delete process.env[name]
      this.writeEnvEncFile()
    }
    this.removeAll = () => {
      for (const name in this.envVars) {
        delete this.envVars[name]
        delete process.env[name]
      }
      if (fs_1.default.existsSync(this.envPath)) {
        fs_1.default.unlinkSync(this.envPath)
      }
    }
    this.viewVars = () =>
      __awaiter(this, void 0, void 0, function* () {
        if (Object.keys(this.envVars).length === 0) {
          console.log(`There are currently no environment variables stored in the file ${this.envPath}`)
          return
        }
        console.log(`The following environment variables are encrypted and stored in the file ${this.envPath}`)
        for (const name in this.envVars) {
          console.log(`\t${name} = ${this.envVars[name]}`)
        }
        const prompt = promises_1.default.createInterface({
          input: process.stdin,
          output: process.stdout,
        })
        yield prompt.question("\nPress ENTER to continue")
        console.clear()
      })
    this.load = () => {
      for (const name in this.envVars) {
        process.env[name] = this.envVars[name]
      }
    }
    this.resolveHome = (envPath) => {
      return envPath[0] === "~" ? path_1.default.join(os_1.default.homedir(), envPath.slice(1)) : envPath
    }
    this.isFileEmpty = (path) => {
      return fs_1.default.readFileSync(path).toString().replace(/\s+/g, "").length === 0
    }
    this.readEnvEncFile = () => {
      const envVars = {}
      try {
        const lines = fs_1.default.readFileSync(this.envPath).toString().split("\n")
        for (const line of lines) {
          const sanitizedLine = line.replace(/[ \t]+/g, "")
          if (sanitizedLine.length > 3) {
            const [name, value] = sanitizedLine.split(":")
            if (typeof name !== "string" || typeof value !== "string") {
              console.log("Invalid encrypted environment file format")
              return {}
            }
            envVars[name] = this.decrypt(value.slice(10))
          }
        }
      } catch (e) {
        console.log(
          `Error loading encrypted environment variables from file ${this.envPath}.\nIf you do not know your password, delete the file ${this.envPath} and set a new password. (Note: This will cause you to lose all encrypted environment variables.)\n${e}`
        )
        return {}
      }
      return envVars
    }
    this.writeEnvEncFile = () => {
      const lines = []
      for (const name in this.envVars) {
        lines.push(`${name}: ENCRYPTED|${this.encrypt(this.envVars[name])}`)
      }
      fs_1.default.writeFileSync(this.envPath, lines.join("\n"))
    }
    this.encrypt = (plaintext) => {
      // Generate a random salt and initialization vector (IV)
      const salt = crypto_1.default.randomBytes(16)
      const iv = crypto_1.default.randomBytes(16)
      // Derive a cryptographic key from the password using the salt
      const key = crypto_1.default.scryptSync(this.password, salt, 32)
      // Encrypt the plaintext using the key and IV
      const cipher = crypto_1.default.createCipheriv("aes-256-gcm", key, iv)
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
      const tag = cipher.getAuthTag()
      // Combine the encrypted data, IV, salt, and tag
      const encryptedData = Buffer.concat([salt, iv, tag, encrypted]).toString("base64")
      return encryptedData
    }
    this.decrypt = (encrypted) => {
      // Decode the encrypted data and extract the salt, IV, tag, and encrypted text
      const dataBuffer = Buffer.from(encrypted, "base64")
      const salt = dataBuffer.slice(0, 16)
      const iv = dataBuffer.slice(16, 32)
      const tag = dataBuffer.slice(32, 48)
      const encryptedText = dataBuffer.slice(48)
      // Derive the same cryptographic key using the password and salt
      const key = crypto_1.default.scryptSync(this.password, salt, 32)
      // Decrypt the encrypted text using the key, IV, and tag
      const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, iv)
      decipher.setAuthTag(tag)
      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])
      return decrypted.toString("utf8")
    }
    this.isValidEnvVarName = (name) => {
      const regex = /^[A-Z_][A-Z0-9_]*$/
      return regex.test(name)
    }
    this.password = process.env["ENV_ENC_PASSWORD"]
    // Resolve file path if provided, else default to ".env.enc" in current working directory
    if (options === null || options === void 0 ? void 0 : options.pathToEncryptedEnv) {
      this.envPath = this.resolveHome(options.pathToEncryptedEnv)
    } else {
      this.envPath = path_1.default.resolve(process.cwd(), ".env.enc")
    }
    if (!fs_1.default.existsSync(this.envPath) || this.isFileEmpty(this.envPath)) {
      return
    }
    if (!this.password) {
      console.log(
        `Please set the ENV_ENC_PASSWORD environment variable.\nOn Mac and Linux terminals, or Windows command prompt, run the command: set ENV_ENC_PASSWORD=YourPasswordHere\nFor Windows PowerShell, run the command: $env:ENV_ENC_PASSWORD=YourPasswordHere\nIf you do not know your password, delete the file ${this.envPath} and set a new password. (Note: This will cause you to lose all encrypted environment variables.)`
      )
      return
    }
    this.envVars = this.readEnvEncFile()
  }
}
exports.default = EncryptedEnv
