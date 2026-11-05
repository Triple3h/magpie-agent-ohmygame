import test from "node:test"
import assert from "node:assert/strict"
import { agent, connect } from "./ohmygame.agent.js"
import { imageModels, planVisibility, planRestore } from "./visibility.mjs"

const gateway = { url: "http://127.0.0.1:3425", v1: "http://127.0.0.1:3425/v1", key: "magpie-ohmygame" }
const models = [
  { id: "group/deepseek-flash", name: "deepseek-flash", context: 1_000_000, output: 128_000, images: true, efforts: ["low", "high"] },
  { id: "glm", name: "GLM", context: 0, output: 0, images: false, efforts: [] },
]
const wired = () => connect({ gateway, models })["providers.magpie"]

test("uses the agent gateway key so requests are attributed to OhMyGame", () => {
  assert.equal(wired().apiKey, "magpie-ohmygame")
  assert.equal(wired().baseUrl, gateway.v1)
  assert.equal(wired().api, "openai-completions")
  assert.deepEqual(agent.ua, [])
})

test("asks Pi for a session header", () => {
  assert.equal(wired().compat.sendSessionAffinityHeaders, true)
})

test("starts OhMyGame on the same provider connect writes", () => {
  assert.equal(agent.startup.keys.defaultProvider, "magpie")
  assert.equal(agent.startup.model, "defaultModel")
})

test("maps models without writing zero token limits", () => {
  const [a, b] = wired().models
  assert.equal(a.id, "group/deepseek-flash")
  assert.equal(a.contextWindow, 1_000_000)
  assert.equal(a.maxTokens, 128_000)
  assert.deepEqual(a.input, ["text", "image"])
  assert.equal(a.thinkingLevelMap.high, "high")
  assert.equal(a.thinkingLevelMap.off, null)
  assert.equal(b.contextWindow, undefined)
  assert.equal(b.maxTokens, undefined)
  assert.equal(b.thinkingLevelMap, undefined)
})

const visibility = {
  version: 1,
  customProviders: { "custom-old": { authentication: "api_key", models: [] } },
  defaultImageModel: { provider: "custom-old", id: "gpt-image-2.5-flare" },
}

test("only whitelisted image models are written, with openai-images usage", () => {
  const next = planVisibility(visibility, { imageModels: ["workbuddy-ai/hy-image-3.5", "not/a-model"] })
  const provider = next.customProviders.magpie
  assert.equal(provider.models.length, 1)
  assert.equal(provider.models[0].id, "workbuddy-ai/hy-image-3.5")
  assert.equal(provider.models[0].usages.image.protocol, "openai-images")
  assert.equal(provider.modelConfigurationVersion, 2)
  assert.deepEqual(next.customProviders["custom-old"], visibility.customProviders["custom-old"])
  assert.equal(visibility.customProviders.magpie, undefined)
})

test("unchecking removes only the injected provider", () => {
  const withImages = planVisibility(visibility, { imageModels: ["workbuddy/hunyuan-image-alpha"] })
  const next = planVisibility(withImages, { imageModels: [] })
  assert.equal(next.customProviders.magpie, undefined)
  assert.ok(next.customProviders["custom-old"])
  assert.deepEqual(next.defaultImageModel, visibility.defaultImageModel)
})

test("restore puts back the previous provider and default image model", () => {
  const backup = { provider: null, defaultImageModel: visibility.defaultImageModel }
  const changed = planVisibility(visibility, { imageModels: ["workbuddy/hunyuan-image-alpha"] })
  changed.defaultImageModel = { provider: "magpie", id: "workbuddy/hunyuan-image-alpha" }
  const next = planRestore(changed, backup)
  assert.equal(next.customProviders.magpie, undefined)
  assert.deepEqual(next.defaultImageModel, visibility.defaultImageModel)
})

test("language models from models.json stay visible beside the image model", () => {
  const language = [
    { id: "group/deepseek-flash", name: "deepseek-flash", contextWindow: 1_000_000, maxTokens: 128_000, reasoning: true, input: ["text", "image"] },
  ]
  const next = planVisibility(visibility, { imageModels: ["workbuddy-ai/hy-image-3.5"] }, language)
  const models = next.customProviders.magpie.models
  assert.deepEqual(models.map((m) => m.id), ["group/deepseek-flash", "workbuddy-ai/hy-image-3.5"])
  assert.deepEqual(models[0].usages, { language: true })
  assert.equal(models[0].supportsImages, true)
  assert.equal(models[0].contextWindow, 1_000_000)
  assert.equal(models[1].usages.image.protocol, "openai-images")
  assert.equal(language[0].usages, undefined)
})

test("non-array options select nothing", () => {
  assert.deepEqual(imageModels({ imageModels: "workbuddy-ai/hy-image-3.5" }), [])
})
