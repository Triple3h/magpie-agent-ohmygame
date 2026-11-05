import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { planVisibility, planRestore } from "./visibility.mjs"

const dataDir = join(homedir(), "Library", "Application Support", "OhMyGame")
const visibilityPath = join(dataDir, "data", "model-visibility.json")
const modelsPath = join(dataDir, "pi-agent", "models.json")
const backupPath = join(dataDir, "data", ".magpie-ohmygame-visibility.json")

function read(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeIfChanged(path, value) {
  if (JSON.stringify(read(path)) === JSON.stringify(value)) return
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n")
}

function magpieProvider() {
  try {
    return read(modelsPath)?.providers?.magpie ?? null
  } catch {
    return null
  }
}

function backup() {
  if (existsSync(backupPath)) return
  const d = read(visibilityPath)
  writeFileSync(backupPath, JSON.stringify({
    provider: d.customProviders?.magpie ?? null,
    defaultImageModel: d.defaultImageModel ?? null,
  }), { mode: 0o600 })
}

function liveOptions() {
  try {
    const list = read(join(homedir(), ".config", "magpie", "plugins.json")).plugins || []
    const own = list.find((entry) => Array.isArray(entry?.options?.imageModels))
    return own?.options ?? null
  } catch {
    return null
  }
}

function sync(options) {
  const provider = magpieProvider()
  if (!provider) {
    if (existsSync(backupPath)) {
      writeIfChanged(visibilityPath, planRestore(read(visibilityPath), read(backupPath)))
      unlinkSync(backupPath)
    }
    return
  }
  backup()
  const languageModels = Array.isArray(provider.models) ? provider.models : []
  writeIfChanged(visibilityPath, planVisibility(read(visibilityPath), options, languageModels))
}

const KEY = Symbol.for("magpie.ohmygame.images.v1")
const EXIT = Symbol.for("magpie.ohmygame.images.exit")

export default async function OhMyGameImages(_input, options) {
  const previous = globalThis[KEY]
  if (previous) clearInterval(previous)
  const run = () => {
    try { sync(liveOptions() ?? options) } catch { /* OhMyGame may be mid-write. */ }
  }
  globalThis[KEY] = setInterval(run, 2000)
  if (!globalThis[EXIT]) {
    globalThis[EXIT] = true
    process.once("exit", run)
  }
  run()
  return {}
}
