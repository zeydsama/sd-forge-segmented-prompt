import modules.scripts as scripts
import gradio as gr
import re

class SegmentedPromptScript(scripts.Script):
    def __init__(self):
        self.txt2img_prompt_tb = None
        self.img2img_prompt_tb = None

    def title(self):
        return "Segmented Prompt"

    def show(self, is_img2img):
        return scripts.AlwaysVisible

    def after_component(self, component, **kwargs):
        elem_id = kwargs.get("elem_id") or getattr(component, "elem_id", None)
        if elem_id == "txt2img_prompt":
            self.txt2img_prompt_tb = component
        elif elem_id == "img2img_prompt":
            self.img2img_prompt_tb = component

    def ui(self, is_img2img):
        MAX_SEGMENTS = 10
        prefix = "img2img" if is_img2img else "txt2img"

        with gr.Accordion("Segmented Prompt (Builder)", open=False, elem_id=f"segmented_prompt_accordion_{prefix}"):
            with gr.Row():
                is_enabled = gr.Checkbox(label="Enable Segmented Prompt", value=False, elem_id=f"seg_enable_{prefix}")
                sync_btn = gr.Button("🔄 Sync from Main Prompt", elem_id=f"seg_sync_btn_{prefix}")
                reverse_sync_btn = gr.Button("⬆️ Push to Main Prompt", elem_id=f"seg_reverse_sync_btn_{prefix}")

            with gr.Row(elem_classes=["seg-toolbar-row"]):
                collapse_all_btn = gr.Button("📁 Collapse All", size="sm", elem_classes=["seg-mini-tool-btn"], elem_id=f"seg_collapse_all_{prefix}")
                expand_all_btn = gr.Button("📂 Expand All", size="sm", elem_classes=["seg-mini-tool-btn"], elem_id=f"seg_expand_all_{prefix}")

            segment_rows = []
            segment_inputs = []

            del_btns = []

            # Use a hidden Number instead of State so it persists in ui-config.json
            visible_count = gr.Number(value=3, visible=False, elem_id=f"seg_visible_count_{prefix}")


            drag_src = gr.Number(visible=False, elem_id=f"seg_drag_src_{prefix}")
            drag_tgt = gr.Number(visible=False, elem_id=f"seg_drag_tgt_{prefix}")
            drag_btn = gr.Button(visible=False, elem_id=f"seg_drag_btn_{prefix}")

            with gr.Column(elem_id=f"seg_sortable_wrapper_{prefix}"):
                for i in range(MAX_SEGMENTS):

                    with gr.Row(visible=(i < 3), variant="panel", elem_classes=["seg-row-panel"]) as row:
                        with gr.Column(scale=1, min_width=36, elem_classes=["seg-order-btns"]):
                            controls_html = gr.HTML(f'<div class="seg-controls-box"><span class="seg-drag-handle" title="Drag to reorder">☰</span><button type="button" class="seg-collapse-btn" data-seg-idx="{i}" data-prefix="{prefix}" title="Toggle Collapse/Expand">▼</button></div>')
                            del_btn = gr.Button("🗑️", size="sm", elem_classes=["seg-del-btn"])
                        summary_html = gr.HTML('<div class="seg-collapsed-summary"></div>')
                        with gr.Column(scale=2, min_width=120, elem_classes=["seg-body-controls", "seg-weight-col"]):
                            with gr.Row():
                                active_cb = gr.Checkbox(label="Active", value=True, elem_id=f"seg_active_{prefix}_{i}")
                                locked_cb = gr.Checkbox(label="🔒 Lock", value=False, elem_id=f"seg_lock_{prefix}_{i}")
                            weight_sl = gr.Slider(minimum=0.1, maximum=3.0, step=0.05, value=1.0, label="Weight", elem_id=f"seg_weight_{prefix}_{i}")
                        with gr.Column(scale=10, elem_classes=["seg-body-controls"]):
                            text_tb = gr.Textbox(label=f"Segment {i+1}", lines=2, placeholder="e.g. 1girl, highly detailed...", elem_classes=["segmented-prompt-textarea"], elem_id=f"seg_text_{prefix}_{i}")

                    segment_rows.append(row)
                    segment_inputs.extend([active_cb, locked_cb, weight_sl, text_tb])
                    del_btns.append(del_btn)

            with gr.Row():
                add_btn = gr.Button("➕ Add Segment")
                remove_btn = gr.Button("➖ Remove Segment")



            def apply_drag_drop(*args):
                c = int(args[0])
                src = int(args[1])
                tgt = int(args[2])
                out = list(args[3:])

                if src != tgt and src < c and tgt < c:
                    rows = [out[i*4 : i*4+4] for i in range(MAX_SEGMENTS)]
                    is_src_locked = rows[src][1]

                    if not is_src_locked:
                        intended_order = list(range(c))
                        intended_order.pop(src)
                        intended_order.insert(tgt, src)

                        unlocked_items = []
                        for idx in intended_order:
                            if not rows[idx][1]:
                                unlocked_items.append(rows[idx])

                        new_rows = []
                        unlocked_ptr = 0
                        for i in range(c):
                            if rows[i][1]:
                                new_rows.append(rows[i])
                            else:
                                new_rows.append(unlocked_items[unlocked_ptr])
                                unlocked_ptr += 1

                        for i in range(c):
                            out[i*4 : i*4+4] = new_rows[i]

                updates = [c]
                for j in range(MAX_SEGMENTS):
                    updates.append(gr.update(visible=(j < c)))
                for val in out:
                    updates.append(gr.update(value=val))
                return updates

            def make_delete(idx):
                def delete(count, *args):
                    c = int(count)
                    out = list(args)

                    b = idx * 4
                    is_locked = out[b+1]

                    if not is_locked and idx < c:
                        # Shift everything above idx down by 1
                        for j in range(idx, c - 1):
                            n = (j + 1) * 4
                            curr = j * 4
                            out[curr:curr+4] = out[n:n+4]

                        # Clear the last active segment
                        last = (c - 1) * 4
                        out[last:last+4] = [True, False, 1.0, ""]

                        if c > 1:
                            c -= 1
                        else:
                            # if it's the last remaining segment, just clear it, keep visible_count = 1
                            pass

                    updates = [c]
                    for j in range(MAX_SEGMENTS):
                        updates.append(gr.update(visible=(j < c)))
                    for val in out:
                        updates.append(gr.update(value=val))
                    return updates
                return delete

            drag_btn.click(fn=apply_drag_drop, inputs=[visible_count, drag_src, drag_tgt] + segment_inputs, outputs=[visible_count] + segment_rows + segment_inputs)

            for i in range(MAX_SEGMENTS):
                del_btns[i].click(fn=make_delete(i), inputs=[visible_count] + segment_inputs, outputs=[visible_count] + segment_rows + segment_inputs)

            def add_segment(count):
                c = int(count)
                new_count = min(c + 1, MAX_SEGMENTS)
                updates = [new_count]
                for i in range(MAX_SEGMENTS):
                    updates.append(gr.update(visible=(i < new_count)))
                return updates

            def remove_segment(count, *states):
                c = int(count)
                if c > 1:
                    b = (c - 1) * 4
                    is_locked = states[b+1]
                    if not is_locked:
                        c -= 1
                updates = [c]
                for i in range(MAX_SEGMENTS):
                    updates.append(gr.update(visible=(i < c)))
                return updates

            def sync_from_prompt(prompt_text, *current_states):
                if not prompt_text:
                    prompt_text = ""

                pattern = r'\s*;\s*|(?:\r?\n\s*){2,},?|(?:\r?\n\s*)+,\s*|,\s*(?:\r?\n\s*){2,}'
                raw_segments = re.split(pattern, prompt_text.strip())

                parsed_unlocked = []
                for seg in raw_segments:
                    seg = seg.strip()
                    seg = re.sub(r'^[,\s]+|[,\s]+$', '', seg)
                    if not seg:
                        continue

                    match = re.match(r'^\((.*):\s*([\d\.]+)\)$', seg, re.DOTALL)
                    if match:
                        text_val = match.group(1).strip()
                        text_val = re.sub(r'^[,\s]+|[,\s]+$', '', text_val)
                        try:
                            weight_val = float(match.group(2))
                        except:
                            weight_val = 1.0
                        if text_val:
                            parsed_unlocked.append((True, weight_val, text_val))
                    else:
                        parsed_unlocked.append((True, 1.0, seg))

                out_states = list(current_states)

                for i in range(MAX_SEGMENTS):
                    b = i * 4
                    is_locked = out_states[b+1]

                    if not is_locked:
                        if parsed_unlocked:
                            active, weight, text = parsed_unlocked.pop(0)
                            out_states[b] = active
                            out_states[b+2] = weight
                            out_states[b+3] = text
                        else:
                            out_states[b] = True
                            out_states[b+2] = 1.0
                            out_states[b+3] = ""

                last_idx = -1
                for i in range(MAX_SEGMENTS):
                    b = i * 4
                    txt = out_states[b+3]
                    if txt and isinstance(txt, str) and txt.strip():
                        last_idx = i

                new_count = max(1, last_idx + 1)
                updates = [new_count]
                for i in range(MAX_SEGMENTS):
                    updates.append(gr.update(visible=(i < new_count)))

                for v in out_states:
                    updates.append(gr.update(value=v))

                return updates

            def reverse_sync_to_prompt(*states):
                valid_segments = []
                for i in range(0, len(states), 4):
                    active = states[i]
                    weight = states[i+2]
                    text = states[i+3]
                    if active and text and text.strip():
                        clean_text = text.strip()
                        if abs(weight - 1.0) < 0.001:
                            valid_segments.append(clean_text)
                        else:
                            valid_segments.append(f"({clean_text}:{weight})")

                combined = "\n\n,".join(valid_segments)
                return gr.update(value=combined)

            # Initialize initial visibility smoothly
            def init_visibility(count):
                c = int(count)
                updates = []
                for i in range(MAX_SEGMENTS):
                    updates.append(gr.update(visible=(i < c)))
                return updates

            # Trigger setup on load
            visible_count.change(fn=init_visibility, inputs=[visible_count], outputs=segment_rows)

            add_btn.click(fn=add_segment, inputs=[visible_count], outputs=[visible_count] + segment_rows)
            remove_btn.click(fn=remove_segment, inputs=[visible_count] + segment_inputs, outputs=[visible_count] + segment_rows)

            prompt_tb = self.img2img_prompt_tb if is_img2img else self.txt2img_prompt_tb
            if prompt_tb is not None:
                sync_btn.click(
                    fn=sync_from_prompt,
                    inputs=[prompt_tb] + segment_inputs,
                    outputs=[visible_count] + segment_rows + segment_inputs
                )
                reverse_sync_btn.click(
                    fn=reverse_sync_to_prompt,
                    inputs=segment_inputs,
                    outputs=[prompt_tb]
                )

        # Return is_enabled + segment_inputs (is_enabled counts as 1 component, segment_inputs is 40)
        return [is_enabled] + segment_inputs

    def process(self, p, is_enabled, *args):
        if not is_enabled:
            return

        p.prompt = ""
        if type(p.all_prompts) is list:
            p.all_prompts = [""] * len(p.all_prompts)

        valid_segments = []
        for i in range(0, len(args), 4):
            active = args[i]
            # locked = args[i+1] # We dont need it during processing
            weight = args[i+2]
            text = args[i+3]

            if active and text and text.strip():
                clean_text = text.strip()
                if abs(weight - 1.0) < 0.001:
                    valid_segments.append(clean_text)
                else:
                    valid_segments.append(f"({clean_text}:{weight})")

        if valid_segments:
            new_prompt = "\n\n,".join(valid_segments)
            p.prompt = new_prompt
            if type(p.all_prompts) is list:
                p.all_prompts = [new_prompt] * len(p.all_prompts)
