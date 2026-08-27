// segmented_prompt_dragdrop.js

function loadSortableAndInit() {
    if (typeof Sortable !== 'undefined') {
        initDragAndDrop();
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
    script.onload = () => {
        initDragAndDrop();
    };
    script.onerror = () => {
        console.warn("[Segmented Prompt] Could not load SortableJS from CDN.");
    };
    document.head.appendChild(script);
}

function initDragAndDrop() {
    ['txt2img', 'img2img'].forEach(prefix => {
        const wrapper = document.querySelector(`#seg_sortable_wrapper_${prefix}`);
        if (!wrapper) return;

        Sortable.create(wrapper, {
            handle: '.seg-drag-handle',
            draggable: '.panel',
            filter: function(evt, target) {
                const panel = target.closest('.panel');
                if (panel) {
                    const lockedCb = panel.querySelector('input[type="checkbox"][id*="seg_lock_"]');
                    if (lockedCb && lockedCb.checked) {
                        return true;
                    }
                }
                return false;
            },

            animation: 150,
            onChoose: function (evt) {
                evt.item.dataset.oldNextSiblingId = evt.item.nextElementSibling ? evt.item.nextElementSibling.id : "";
                evt.item.dataset.isLastChild = evt.item.nextElementSibling ? "false" : "true";
            },
            onEnd: function (evt) {
                if (evt.oldIndex === evt.newIndex) return;

                const parent = evt.from;
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;

                // Immediately revert DOM so Svelte/Gradio doesn't crash on its next reconcile
                if (evt.item.dataset.isLastChild === "true") {
                    parent.appendChild(evt.item);
                } else {
                    if (oldIndex > newIndex) {
                        parent.insertBefore(evt.item, parent.children[oldIndex + 1]);
                    } else {
                        parent.insertBefore(evt.item, parent.children[oldIndex]);
                    }
                }

                // Fire the python inputs
                const srcInput = document.querySelector(`#seg_drag_src_${prefix} input`);
                const tgtInput = document.querySelector(`#seg_drag_tgt_${prefix} input`);
                const btn = document.querySelector(`#seg_drag_btn_${prefix}`);

                if (srcInput && tgtInput && btn) {
                    srcInput.value = oldIndex;
                    srcInput.dispatchEvent(new Event('input', { bubbles: true }));

                    tgtInput.value = newIndex;
                    tgtInput.dispatchEvent(new Event('input', { bubbles: true }));

                    setTimeout(() => {
                        btn.click();
                        const saveEvent = new Event('change', { bubbles: true });
                        btn.dispatchEvent(saveEvent);

                        // Update summaries of affected segments
                        setTimeout(() => {
                            if (typeof window.refreshAllSummaries === 'function') {
                                window.refreshAllSummaries(prefix);
                            }
                        }, 200);
                    }, 50);
                }
            }
        });
    });
}

onUiLoaded(function () {
    setTimeout(loadSortableAndInit, 1500);
});
