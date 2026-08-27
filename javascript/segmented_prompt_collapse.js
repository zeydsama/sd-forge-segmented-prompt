// segmented_prompt_collapse.js

// Dynamic Auto-Adapt Textarea Height (Strictly multiline, NO running/single-line scrolling)
function autoResizeTextarea(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    const newHeight = Math.max(42, Math.min(280, ta.scrollHeight));
    ta.style.height = newHeight + 'px';
}

function autoResizeAllTextareas(prefix) {
    const prefixes = prefix ? [prefix] : ['txt2img', 'img2img'];
    prefixes.forEach(p => {
        const textareas = document.querySelectorAll(`#seg_sortable_wrapper_${p} .segmented-prompt-textarea textarea`);
        textareas.forEach(ta => autoResizeTextarea(ta));
    });
}

// Client-Side Google Translate (Free API, auto language detection -> English)
async function translateSegmentText(prefix, idx, btn) {
    const textEl = document.querySelector(`#seg_text_${prefix}_${idx} textarea`);
    if (!textEl) return;

    const rawText = textEl.value ? textEl.value.trim() : '';
    if (!rawText) return;

    const originalBtnContent = btn ? btn.textContent : '🌐';

    if (btn) {
        btn.textContent = '⏳';
        btn.classList.add('seg-btn-loading');
        btn.disabled = true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=en&dt=t&q=${encodeURIComponent(rawText)}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Translation API HTTP ${response.status}`);
        }

        const data = await response.json();
        let translatedText = '';

        if (Array.isArray(data) && Array.isArray(data[0])) {
            translatedText = data[0].map(chunk => (chunk && chunk[0] ? chunk[0] : '')).join('');
        }

        if (translatedText && translatedText.trim()) {
            textEl.value = translatedText.trim();

            // Dispatch bubbling events so Gradio state and persistence scripts capture the change
            textEl.dispatchEvent(new Event('input', { bubbles: true }));
            textEl.dispatchEvent(new Event('change', { bubbles: true }));

            // Auto adapt the textarea height immediately after translation
            autoResizeTextarea(textEl);

            const row = textEl.closest('.seg-row-panel');
            if (row) {
                updateSegmentSummary(row, prefix, idx);
            }

            if (btn) {
                btn.classList.remove('seg-btn-loading');
                btn.textContent = '✅';
                setTimeout(() => {
                    btn.textContent = originalBtnContent;
                }, 1200);
            }
            return;
        }

        throw new Error('Empty or invalid translation payload');
    } catch (err) {
        console.error('[Segmented Prompt] Translation error:', err);
        if (btn) {
            btn.classList.remove('seg-btn-loading');
            btn.textContent = '❌';
            setTimeout(() => {
                btn.textContent = originalBtnContent;
            }, 1500);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
        }
    }
}

function updateSegmentSummary(row, prefix, idx) {
    if (!row) return;

    let summaryEl = row.querySelector('.seg-collapsed-summary');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.className = 'seg-collapsed-summary';
        row.appendChild(summaryEl);
    }

    const textEl = document.querySelector(`#seg_text_${prefix}_${idx} textarea`);
    const weightEl = document.querySelector(`#seg_weight_${prefix}_${idx} input[type="range"]`) || document.querySelector(`#seg_weight_${prefix}_${idx} input[type="number"]`);
    const activeEl = document.querySelector(`#seg_active_${prefix}_${idx} input[type="checkbox"]`);
    const lockEl = document.querySelector(`#seg_lock_${prefix}_${idx} input[type="checkbox"]`);

    const textVal = textEl ? textEl.value.trim() : '';
    const weightVal = weightEl ? parseFloat(weightEl.value).toFixed(2).replace(/\.?0+$/, '') : '1';
    const isActive = activeEl ? activeEl.checked : true;
    const isLocked = lockEl ? lockEl.checked : false;

    let badgeText = `Seg ${parseInt(idx) + 1}`;
    if (isLocked) badgeText += ' 🔒';
    if (!isActive) badgeText += ' (Off)';

    const displaySnippet = textVal.length > 0 ? textVal : '<empty>';

    summaryEl.innerHTML = `
        <span class="seg-summary-badge" style="${!isActive ? 'background: #6b7280;' : ''}">${badgeText}</span>
        <span class="seg-summary-weight">${weightVal}x</span>
        <span class="seg-summary-text" title="${escapeHtml(textVal)}">${escapeHtml(displaySnippet)}</span>
    `;
}

function refreshAllSummaries(prefix) {
    const prefixes = prefix ? [prefix] : ['txt2img', 'img2img'];
    prefixes.forEach(p => {
        const wrapper = document.querySelector(`#seg_sortable_wrapper_${p}`);
        if (!wrapper) return;
        const rows = wrapper.querySelectorAll('.seg-row-panel');
        rows.forEach((row, i) => {
            updateSegmentSummary(row, p, i);
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isRowVisible(row) {
    if (!row) return false;
    return row.style.display !== 'none' && !row.classList.contains('hidden') && !row.hasAttribute('hidden');
}

function setSegmentCollapsed(row, collapseBtn, isCollapsed, prefix, idx) {
    if (!row) return;

    if (isCollapsed) {
        row.classList.add('seg-collapsed');
        if (collapseBtn) {
            collapseBtn.textContent = '▶';
            collapseBtn.title = 'Expand Segment';
        }
        updateSegmentSummary(row, prefix, idx);
    } else {
        row.classList.remove('seg-collapsed');
        if (collapseBtn) {
            collapseBtn.textContent = '▼';
            collapseBtn.title = 'Collapse Segment';
        }
        // Auto-adapt textarea height when expanding
        const textEl = document.querySelector(`#seg_text_${prefix}_${idx} textarea`);
        if (textEl) {
            setTimeout(() => autoResizeTextarea(textEl), 20);
        }
    }
}

function bindRowEvents(wrapper, prefix) {
    if (!wrapper) return;
    const rows = wrapper.querySelectorAll('.seg-row-panel');
    rows.forEach((row, i) => {
        // 1. Collapse toggle button
        const collapseBtn = row.querySelector('.seg-collapse-btn');
        if (collapseBtn && !collapseBtn._collapseBound) {
            collapseBtn._collapseBound = true;
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const isCurrentlyCollapsed = row.classList.contains('seg-collapsed');
                setSegmentCollapsed(row, collapseBtn, !isCurrentlyCollapsed, prefix, i);
                document.dispatchEvent(new CustomEvent('seg-state-changed'));
            });
        }

        // 2. Translate button
        const translateBtn = row.querySelector('.seg-translate-btn');
        if (translateBtn && !translateBtn._translateBound) {
            translateBtn._translateBound = true;
            translateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                translateSegmentText(prefix, i, translateBtn);
            });
        }

        // 3. Click on summary strip expands segment
        const summaryStrip = row.querySelector('.seg-collapsed-summary');
        if (summaryStrip && !summaryStrip._expandBound) {
            summaryStrip._expandBound = true;
            summaryStrip.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                setSegmentCollapsed(row, collapseBtn, false, prefix, i);
                document.dispatchEvent(new CustomEvent('seg-state-changed'));
            });
        }

        // 4. Delete button: refresh summaries and auto-resize
        const delBtn = row.querySelector('.seg-del-btn');
        if (delBtn && !delBtn._delBound) {
            delBtn._delBound = true;
            delBtn.addEventListener('click', () => {
                setTimeout(() => {
                    refreshAllSummaries(prefix);
                    autoResizeAllTextareas(prefix);
                }, 150);
                setTimeout(() => {
                    refreshAllSummaries(prefix);
                    autoResizeAllTextareas(prefix);
                }, 400);
            });
        }

        // 5. Update summary & auto-adapt height on input
        const textEl = document.querySelector(`#seg_text_${prefix}_${i} textarea`);
        if (textEl && !textEl._summaryBound) {
            textEl._summaryBound = true;
            textEl.addEventListener('input', () => {
                autoResizeTextarea(textEl);
                updateSegmentSummary(row, prefix, i);
            });
            textEl.addEventListener('change', () => {
                autoResizeTextarea(textEl);
                updateSegmentSummary(row, prefix, i);
            });
            // Initial resize
            autoResizeTextarea(textEl);
        }

        const weightEl = document.querySelector(`#seg_weight_${prefix}_${i} input`);
        if (weightEl && !weightEl._summaryBound) {
            weightEl._summaryBound = true;
            weightEl.addEventListener('input', () => updateSegmentSummary(row, prefix, i));
            weightEl.addEventListener('change', () => updateSegmentSummary(row, prefix, i));
        }

        const activeEl = document.querySelector(`#seg_active_${prefix}_${i} input`);
        if (activeEl && !activeEl._summaryBound) {
            activeEl._summaryBound = true;
            activeEl.addEventListener('change', () => updateSegmentSummary(row, prefix, i));
        }

        const lockEl = document.querySelector(`#seg_lock_${prefix}_${i} input`);
        if (lockEl && !lockEl._summaryBound) {
            lockEl._summaryBound = true;
            lockEl.addEventListener('change', () => updateSegmentSummary(row, prefix, i));
        }
    });
}

function initSegmentCollapse() {
    ['txt2img', 'img2img'].forEach(prefix => {
        const wrapper = document.querySelector(`#seg_sortable_wrapper_${prefix}`);
        if (!wrapper) return;

        bindRowEvents(wrapper, prefix);
        autoResizeAllTextareas(prefix);

        // Global Toolbar: Collapse All
        const collapseAllBtn = document.querySelector(`#seg_collapse_all_${prefix}`);
        if (collapseAllBtn && !collapseAllBtn._bound) {
            collapseAllBtn._bound = true;
            collapseAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const currentRows = wrapper.querySelectorAll('.seg-row-panel');
                currentRows.forEach((r, idx) => {
                    if (isRowVisible(r)) {
                        const btn = r.querySelector('.seg-collapse-btn');
                        setSegmentCollapsed(r, btn, true, prefix, idx);
                    }
                });
                document.dispatchEvent(new CustomEvent('seg-state-changed'));
            });
        }

        // Global Toolbar: Expand All
        const expandAllBtn = document.querySelector(`#seg_expand_all_${prefix}`);
        if (expandAllBtn && !expandAllBtn._bound) {
            expandAllBtn._bound = true;
            expandAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const currentRows = wrapper.querySelectorAll('.seg-row-panel');
                currentRows.forEach((r, idx) => {
                    if (isRowVisible(r)) {
                        const btn = r.querySelector('.seg-collapse-btn');
                        setSegmentCollapsed(r, btn, false, prefix, idx);
                    }
                });
                autoResizeAllTextareas(prefix);
                document.dispatchEvent(new CustomEvent('seg-state-changed'));
            });
        }
    });
}

onUiLoaded(function() {
    setTimeout(initSegmentCollapse, 1000);
    setTimeout(initSegmentCollapse, 2500);
});

window.setSegmentCollapsed = setSegmentCollapsed;
window.updateSegmentSummary = updateSegmentSummary;
window.refreshAllSummaries = refreshAllSummaries;
window.autoResizeTextarea = autoResizeTextarea;
window.autoResizeAllTextareas = autoResizeAllTextareas;
window.translateSegmentText = translateSegmentText;
