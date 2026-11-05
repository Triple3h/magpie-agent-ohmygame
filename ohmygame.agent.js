// Pi's User-Agent says "pi"; the agent-specific gateway key names these requests OhMyGame.
export const agent = {
  id: "ohmygame",
  name: "OhMyGame",
  dir: "~/Library/Application Support/OhMyGame/pi-agent",
  config: "~/Library/Application Support/OhMyGame/pi-agent/models.json",
  format: "json",
  ua: [],
  startup: {
    config: "~/Library/Application Support/OhMyGame/pi-agent/settings.json",
    format: "json",
    model: "defaultModel",
    keys: { defaultProvider: "magpie" },
  },
  notice: "连接后请退出 OhMyGame（⌘Q）再打开，它只在启动时读取模型配置。Restart OhMyGame after connecting.",
}

const thinkingLevels = ["off", "minimal", "low", "medium", "high", "xhigh", "max"]

function modelEntry(model) {
  const efforts = model.efforts || []
  const entry = {
    id: model.id,
    name: model.name || model.id,
    input: model.images ? ["text", "image"] : ["text"],
    reasoning: efforts.length > 0,
  }
  if (model.context > 0) entry.contextWindow = model.context
  if (model.output > 0) entry.maxTokens = model.context > 0 ? Math.min(model.output, model.context) : model.output
  if (efforts.length > 0) {
    entry.thinkingLevelMap = {}
    for (const level of thinkingLevels) {
      const effort = level === "off" ? "none" : level
      entry.thinkingLevelMap[level] = efforts.includes(effort) ? effort : null
    }
  }
  return entry
}

export function connect({ gateway, models }) {
  return {
    "providers.magpie": {
      name: "magpie",
      baseUrl: gateway.v1,
      api: "openai-completions",
      apiKey: gateway.key,
      // Without this Pi sends no x-session-affinity and the gateway logs no session.
      compat: { sendSessionAffinityHeaders: true },
      models: models.map(modelEntry),
    },
  }
}
