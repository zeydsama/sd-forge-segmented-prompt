# sd-forge-segmented-prompt

An extension for [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) that breaks complex prompts into manageable, reorderable, weighted segments with individual active/lock controls and collapse/expand UI.

## Features

- 🧩 **Segmented Prompt Builder**: Build complex prompts across up to 10 distinct segments.
- 🎚️ **Per-Segment Weight & Toggle**: Enable/disable individual segments and adjust weights with sliders.
- 🔒 **Segment Locking**: Lock specific segments to protect them during syncs and reordering.
- 🔄 **Bidirectional Sync**:
  - **Sync from Main Prompt**: Parses raw prompt strings (split by `;` or multiple newlines/commas) into segment blocks with weights.
  - **Push to Main Prompt**: Compiles active segments and their weights back into standard WebUI prompt syntax.
- ☰ **Drag & Drop Reordering**: Reorder prompt segments with smooth drag-and-drop powered by SortableJS.
- 📁 **Collapsible Segment Cards**: Compact view with summary pills showing active status, weights, and text snippets.
- 💾 **Local State Persistence**: Retains builder states, values, and collapse modes in `localStorage`.
- 🏷️ **Tag Autocomplete Integration**: Works seamlessly with tag autocomplete extensions.
- 🎨 **Lora Card Hijack**: Directly appends clicked LoRA cards to active segments.

## Installation

1. Open Stable Diffusion WebUI Forge.
2. Go to the **Extensions** tab -> **Install from URL**.
3. Paste `https://github.com/zeydsama/sd-forge-segmented-prompt.git` into **URL for extension's git repository**.
4. Click **Install** and restart/reload the WebUI.

## License

MIT
