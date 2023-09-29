const readline = require("readline")
const chalk = require("chalk")

function ask(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

async function prompt(query) {
  if (!process.env.SKIP_PROMPTS) {
    if (query) console.log(`${query}\n`)
    const reply = await ask(`${chalk.green("Continue?")} Enter (y) Yes / (n) No\n`)
    if (reply.toLowerCase() !== "y" && reply.toLowerCase() !== "yes") {
      console.log("Aborted.")
      process.exit(1)
    }
  }
}

module.exports = {
  ask,
  prompt,
}
