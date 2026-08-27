# sd-forge-segmented-prompt

Repository and extension guidelines for `sd-forge-segmented-prompt`.

## Behavioral Guidelines

- Follow surgical changes: touch only what's required.
- Do not refactor untouched files without request.
- Keep the extension UI lightweight and compatible with Gradio and Forge WebUI.

## Architecture

- `scripts/segmented_prompt.py`: Backend Gradio components, process hooks, sync logic, and drag-drop reordering handler.
- `javascript/`:
  - `segmented_prompt_sync.js`: Toolbar repositioning, autocomplete hooks, LoRA card interception, and main prompt synchronization.
  - `segmented_prompt_dragdrop.js`: Drag and drop reordering via SortableJS.
  - `segmented_prompt_collapse.js`: Collapsible segment cards and badge summaries.
  - `segmented_prompt_persistence.js`: Browser `localStorage` state saving and restoration.
- `style.css`: UI stylings for builder rows, badges, handles, and collapsible cards.

## Agent skills

### Issue tracker

GitHub Issues at `zeydsama/sd-forge-segmented-prompt`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context repository. See `docs/agents/domain.md`.
