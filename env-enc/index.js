"use strict"
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, "__esModule", { value: true })
exports.config = exports.encryptedEnv = void 0
const EncryptedEnv_1 = __importDefault(require("./EncryptedEnv"))
const config = (options) => {
  exports.encryptedEnv = new EncryptedEnv_1.default(options)
  exports.encryptedEnv.load()
}
exports.config = config
