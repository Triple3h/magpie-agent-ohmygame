const IMAGE_MODELS = [
  { id: "workbuddy-ai/hy-image-3.5", name: "Hy Image 3.5" },
  { id: "workbuddy/hunyuan-image-alpha", name: "Hunyuan Image Alpha" },
]

const clone = (value) => JSON.parse(JSON.stringify(value))

export function imageModels(options) {
  const picked = Array.isArray(options?.imageModels) ? options.imageModels : []
  return IMAGE_MODELS.filter((model) => picked.includes(model.id))
}

function imageEntry(model) {
  return {
    id: model.id,
    name: model.name,
    api: "openai-completions",
    contextWindow: 128000,
    maxTokens: 16384,
    reasoning: false,
    supportsImages: true,
    usages: {
      image: {
        protocol: "openai-images",
        resolutions: ["1K"],
        aspectRatios: ["1:1", "3:2", "2:3"],
        maxReferenceImages: 3,
        maxOutputs: 1,
      },
    },
  }
}

function languageEntry(model) {
  const entry = clone(model)
  entry.supportsImages = Array.isArray(model.input) && model.input.includes("image")
  entry.usages = { language: true }
  return entry
}

export function planVisibility(current, options, languageModels = []) {
  const next = clone(current)
  const picked = imageModels(options)
  const providers = next.customProviders || (next.customProviders = {})
  if (picked.length) {
    providers.magpie = {
      authentication: "api_key",
      modelConfigurationVersion: 2,
      models: [...languageModels.map(languageEntry), ...picked.map(imageEntry)],
    }
  } else {
    delete providers.magpie
  }
  return next
}

export function planRestore(current, backup) {
  const next = clone(current)
  const providers = next.customProviders || (next.customProviders = {})
  if (backup.provider === null) delete providers.magpie
  else providers.magpie = backup.provider
  if (backup.defaultImageModel === null) delete next.defaultImageModel
  else next.defaultImageModel = backup.defaultImageModel
  return next
}
