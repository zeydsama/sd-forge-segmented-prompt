// segmented_prompt_collapse.js

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

        // 2. Click on summary strip expands segment
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

        // 3. Delete button: refresh summaries
        const delBtn = row.querySelector('.seg-del-btn');
        if (delBtn && !delBtn._delBound) {
            delBtn._delBound = true;
            delBtn.addEventListener('click', () => {
                setTimeout(() => refreshAllSummaries(prefix), 150);
                setTimeout(() => refreshAllSummaries(prefix), 400);
            });
        }

        // 4. Update summary on input
        const textEl = document.querySelector(`#seg_text_${prefix}_${i} textarea`);
        if (textEl && !textEl._summaryBound) {
            textEl._summaryBound = true;
            textEl.addEventListener('input', () => updateSegmentSummary(row, prefix, i));
            textEl.addEventListener('change', () => updateSegmentSummary(row, prefix, i));
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
