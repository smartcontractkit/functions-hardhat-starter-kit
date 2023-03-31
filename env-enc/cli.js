#! /usr/bin/env node
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
const yargs_1 = __importDefault(require("yargs"))
const helpers_1 = require("yargs/helpers")
const EncryptedEnv_1 = __importDefault(require("./EncryptedEnv"))
let encryptedEnv
const init = (options) => {
  encryptedEnv = new EncryptedEnv_1.default(options)
  encryptedEnv.load()
}
;(0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
  .option("path", {
    alias: "p",
    type: "string",
    description: "Path to encrypted env file",
  })
  .command(
    "view",
    "Shows all currently saved environment variables in the encrypted environment variable file",
    (yargs) => yargs,
    (args) =>
      __awaiter(void 0, void 0, void 0, function* () {
        init(args.path ? { pathToEncryptedEnv: args.path } : undefined)
        yield encryptedEnv.viewVars()
        process.exit(0)
      })
  )
  .command(
    "set <name> <value>",
    "Saves a new variable to the encrypted environment variable file",
    (yargs) =>
      yargs
        .positional("name", {
          type: "string",
          describe: "Name of environment variable",
        })
        .positional("value", {
          type: "string",
          describe: "Value of environment variable",
        }),
    (args) => {
      init(args.path ? { pathToEncryptedEnv: args.path } : undefined)
      encryptedEnv.setVar(args.name, args.value)
    }
  )
  .command(
    "remove <name>",
    "Removes a variable from the encrypted environment variable file",
    (yargs) =>
      yargs.positional("name", {
        type: "string",
        describe: "Name of the environment variable to remove",
      }),
    (args) => {
      if (!args.name || args.name.length === 0) {
        throw Error('Invalid command format. Expected "set <name> <value>"')
      }
      init(args.path ? { pathToEncryptedEnv: args.path } : undefined)
      encryptedEnv.removeVar(args.name)
    }
  )
  .command(
    "remove-all",
    "Deletes the encrypted environment variable file",
    () => {},
    (args) => {
      init(args.path ? { pathToEncryptedEnv: args.path } : undefined)
      encryptedEnv.removeAll()
    }
  )
  .demandCommand(1, "You must provide a valid command.")
  .help()
  .alias("h", "help")
  .strict().argv
