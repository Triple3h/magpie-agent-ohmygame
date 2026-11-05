(() => {
  const MODELS = [
    { id: "workbuddy-ai/hy-image-3.5", name: "Hy Image 3.5" },
    { id: "workbuddy/hunyuan-image-alpha", name: "Hunyuan Image Alpha" },
  ]
  const $ = (id) => document.getElementById(id)
  let saved = {}
  let timer = null

  function selected() {
    return Array.isArray(saved.imageModels) ? saved.imageModels : []
  }

  function render(message) {
    const picked = selected()
    const box = $("models")
    box.replaceChildren()
    for (const model of MODELS) {
      const label = document.createElement("label")
      label.className = "row"
      const input = document.createElement("input")
      input.type = "checkbox"
      input.checked = picked.includes(model.id)
      input.onchange = () => save(input.checked, model.id)
      const name = document.createElement("span")
      name.textContent = model.name
      const id = document.createElement("small")
      id.textContent = model.id
      label.append(input, name, id)
      box.append(label)
    }
    $("status").textContent = message || (picked.length
      ? `已选 ${picked.length} 个 · 重启 OhMyGame 后生效`
      : "未勾选 · OhMyGame 看不到 Magpie 出图模型")
  }

  function save(checked, id) {
    const picked = selected().filter((value) => value !== id)
    if (checked) picked.push(id)
    clearTimeout(timer)
    $("status").textContent = "保存中…"
    timer = setTimeout(async () => {
      const next = { ...saved, imageModels: picked }
      try {
        await magpie.options.set(next)
        saved = next
        render("已保存 · 重启 OhMyGame 后生效")
      } catch (error) {
        render("保存失败：" + (error?.message || error))
      }
    }, 350)
  }

  magpie.ready.then(async () => {
    try {
      saved = (await magpie.options.get()) || {}
    } catch {
      saved = {}
    }
    render()
  })
})()
