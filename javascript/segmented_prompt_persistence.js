onUiLoaded(function() {
    let saveTimeout = null;
    let hasRestored = false;
    const STATE_KEY = 'sd_forge_segmented_prompt_state';

    // 1. Save current state to localStorage
    function saveState() {
        try {
            let state = { txt2img: {}, img2img: {} };
            ['txt2img', 'img2img'].forEach(mode => {
                // Save Main Enable Checkbox
                let enable = document.querySelector(`#seg_enable_${mode} input[type="checkbox"]`);
                if(enable) state[mode].enable = enable.checked;

                const wrapper = document.querySelector(`#seg_sortable_wrapper_${mode}`);
                const rows = wrapper ? wrapper.querySelectorAll('.seg-row-panel') : [];

                // Save individual rows
                state[mode].segments = [];
                for(let i=0; i<10; i++) {
                    let seg = {};
                    let active = document.querySelector(`#seg_active_${mode}_${i} input[type="checkbox"]`);
                    let lock = document.querySelector(`#seg_lock_${mode}_${i} input[type="checkbox"]`);
                    let weightSlide = document.querySelector(`#seg_weight_${mode}_${i} input[type="range"]`);
                    let text = document.querySelector(`#seg_text_${mode}_${i} textarea`);

                    let row = rows[i];
                    let isCollapsed = row ? row.classList.contains('seg-collapsed') : false;

                    seg.active = active ? active.checked : true;
                    seg.lock = lock ? lock.checked : false;
                    seg.weight = weightSlide ? weightSlide.value : '1.0';
                    seg.text = text ? text.value : '';
                    seg.collapsed = isCollapsed;

                    state[mode].segments.push(seg);
                }
            });
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch(e) { console.error("[Segmented Prompt] Save Error: ", e); }
    }

    // 2. Restore state from localStorage
    function restoreState() {
        let saved = localStorage.getItem(STATE_KEY);
        if(!saved) return;

        try {
            let state = JSON.parse(saved);

            ['txt2img', 'img2img'].forEach(mode => {
                if(!state[mode]) return;

                // Restore Main Enable
                let enable = document.querySelector(`#seg_enable_${mode} input[type="checkbox"]`);
                if(enable && typeof state[mode].enable !== 'undefined' && enable.checked !== state[mode].enable) {
                    enable.checked = state[mode].enable;
                    enable.dispatchEvent(new Event('change', {bubbles: true}));
                }

                // Restore Segments values
                if(state[mode].segments) {
                    const wrapper = document.querySelector(`#seg_sortable_wrapper_${mode}`);
                    const rows = wrapper ? wrapper.querySelectorAll('.seg-row-panel') : [];

                    for(let i=0; i<10; i++) {
                        let seg = state[mode].segments[i];
                        if(!seg) continue;

                        let active = document.querySelector(`#seg_active_${mode}_${i} input[type="checkbox"]`);
                        if(active && typeof seg.active !== 'undefined' && active.checked !== seg.active) {
                            active.checked = seg.active;
                            active.dispatchEvent(new Event('change', {bubbles: true}));
                        }

                        let lock = document.querySelector(`#seg_lock_${mode}_${i} input[type="checkbox"]`);
                        if(lock && typeof seg.lock !== 'undefined' && lock.checked !== seg.lock) {
                            lock.checked = seg.lock;
                            lock.dispatchEvent(new Event('change', {bubbles: true}));
                        }

                        let weightRange = document.querySelector(`#seg_weight_${mode}_${i} input[type="range"]`);
                        let weightNum = document.querySelector(`#seg_weight_${mode}_${i} input[type="number"]`);
                        if(weightRange && typeof seg.weight !== 'undefined' && weightRange.value != seg.weight) {
                            weightRange.value = seg.weight;
                            weightRange.dispatchEvent(new Event('input', {bubbles: true}));
                            if(weightNum) {
                                weightNum.value = seg.weight;
                                weightNum.dispatchEvent(new Event('input', {bubbles: true}));
                            }
                        }

                        let text = document.querySelector(`#seg_text_${mode}_${i} textarea`);
                        if(text && typeof seg.text !== 'undefined' && text.value !== seg.text) {
                            text.value = seg.text;
                            text.dispatchEvent(new Event('input', {bubbles: true}));
                            if (typeof window.autoResizeTextarea === 'function') {
                                window.autoResizeTextarea(text);
                            }
                        }

                        // Restore collapse state
                        if(typeof seg.collapsed !== 'undefined' && rows[i]) {
                            let btn = rows[i].querySelector('.seg-collapse-btn');
                            if(typeof window.setSegmentCollapsed === 'function') {
                                window.setSegmentCollapsed(rows[i], btn, !!seg.collapsed, mode, i);
                            }
                        }
                    }
                }
            });

            hasRestored = true;
            if (typeof window.autoResizeAllTextareas === 'function') {
                window.autoResizeAllTextareas();
            }
        } catch(e) { console.error("[Segmented Prompt] Restore Error: ", e); }
    }

    // 3. Bind Listeners
    document.addEventListener('input', (e) => {
        if(e.target.closest('[id^="seg_"]')) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveState, 500);
        }
    });

    document.addEventListener('change', (e) => {
        if(e.target.closest('[id^="seg_"]')) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveState, 500);
        }
    });

    document.addEventListener('seg-state-changed', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveState, 300);
    });

    document.addEventListener('click', (e) => {
        if(e.target.closest('button') && (
            e.target.closest('[id^="seg_"]') ||
            e.target.textContent.includes('Add Segment') ||
            e.target.textContent.includes('Remove Segment') ||
            e.target.textContent.includes('🗑️') ||
            e.target.textContent.includes('Sync') ||
            e.target.textContent.includes('⬆️') ||
            e.target.classList.contains('seg-collapse-btn') ||
            e.target.classList.contains('seg-translate-btn') ||
            e.target.classList.contains('seg-mini-tool-btn')
        )) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveState, 800);
        }
    });

    // Fire restore on UI loaded once
    setTimeout(restoreState, 500);
});
