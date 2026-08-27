// segmented_prompt_sync.js

onUiLoaded(function() {
    // 1. Sync button trigger from Paste Action
    ["txt2img", "img2img"].forEach(tab => {
        const pasteBtn = document.getElementById(`${tab}_paste`);
        if (pasteBtn) {
            pasteBtn.addEventListener("click", function() {
                setTimeout(function() {
                    const syncBtn = document.getElementById(`seg_sync_btn_${tab}`);
                    if (syncBtn) {
                        syncBtn.click();
                    }
                }, 500);
            });
        }
    });

    // 2. Tag Autocomplete Hook
    const hookAutocomplete = function() {
        const textAreas = document.querySelectorAll(".segmented-prompt-textarea textarea");
        if (textAreas.length > 0 && typeof addAutocompleteToArea === "function") {
            textAreas.forEach(ta => {
                if (!ta.classList.contains("autocomplete-hooked")) {
                    try {
                        addAutocompleteToArea(ta);
                        ta.classList.add("autocomplete-hooked");
                    } catch(e) {}
                }
            });
        }
    };
    setTimeout(hookAutocomplete, 1500);
    setTimeout(hookAutocomplete, 5000);

    // 3. Hijack LoRA Card
    if (typeof window.originalCardClicked === "undefined" && typeof window.cardClicked === "function") {
        window.originalCardClicked = window.cardClicked;

        window.cardClicked = function(tabname, textToAdd, textToAddNegative, allowNegativePrompt) {
            const extLabel = Array.from(document.querySelectorAll("#segmented_prompt_accordion_" + tabname + " span")).find(el => el.textContent.includes("Enable Segmented Prompt"));
            let isEnabled = false;
            if (extLabel) {
                const cb = extLabel.closest("label").querySelector('input[type="checkbox"]');
                if (cb && cb.checked) {
                    isEnabled = true;
                }
            }

            if (isEnabled && (tabname === "txt2img" || tabname === "img2img")) {
                const seg1 = document.querySelector("#segmented_prompt_accordion_" + tabname + " .segmented-prompt-textarea textarea");
                if (seg1) {
                    let currentVal = seg1.value;
                    if (currentVal && !currentVal.endsWith('\n')) {
                        currentVal += '\n';
                    }
                    currentVal += textToAdd;
                    seg1.value = currentVal;
                    seg1.dispatchEvent(new Event('input', { bubbles: true }));

                    if (textToAddNegative && textToAddNegative.length > 0) {
                        const negPrompt = document.querySelector("#" + tabname + "_neg_prompt > label > textarea");
                        if (negPrompt) {
                            let navVal = negPrompt.value;
                            if (navVal && !navVal.endsWith(', ')) {
                                navVal += ', ';
                            }
                            navVal += textToAddNegative;
                            negPrompt.value = navVal;
                            negPrompt.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                    return;
                }
            }

            if (typeof window.originalCardClicked === "function") {
                window.originalCardClicked.apply(this, arguments);
            }
        };
    }

    // 4. Move the Accordion
    setTimeout(function() {
        try {
            const txt2imgAccordion = document.getElementById("segmented_prompt_accordion_txt2img");
            const txt2imgNegPrompt = document.getElementById("txt2img_neg_prompt");

            if (txt2imgAccordion && txt2imgNegPrompt && txt2imgNegPrompt.parentNode) {
                txt2imgNegPrompt.parentNode.insertBefore(txt2imgAccordion, txt2imgNegPrompt.nextSibling);
                txt2imgAccordion.style.marginTop = "10px";
            }

            const img2imgAccordion = document.getElementById("segmented_prompt_accordion_img2img");
            const img2imgNegPrompt = document.getElementById("img2img_neg_prompt");

            if (img2imgAccordion && img2imgNegPrompt && img2imgNegPrompt.parentNode) {
                img2imgNegPrompt.parentNode.insertBefore(img2imgAccordion, img2imgNegPrompt.nextSibling);
                img2imgAccordion.style.marginTop = "10px";
            }
        } catch (e) {
            console.error("[Segmented Prompt] Accordion reposition error:", e);
        }
    }, 1000);

    // 5. Wrap the Main Positive Prompt in a native HTML Accordion
    setTimeout(function() {
        try {
            const wrapPrompt = function(tabName) {
                const promptElem = document.getElementById(tabName + "_prompt");
                if (promptElem && promptElem.parentNode && !promptElem.closest('details.custom-prompt-accordion')) {
                    const details = document.createElement('details');
                    details.className = 'custom-prompt-accordion';
                    details.open = false;
                    details.style.marginBottom = "10px";

                    const summary = document.createElement('summary');
                    summary.innerHTML = "<b style='cursor:pointer; padding:5px;'>📝 Main Positive Prompt (Raw Text)</b>";
                    summary.style.userSelect = "none";
                    summary.style.marginBottom = "5px";

                    promptElem.parentNode.insertBefore(details, promptElem);
                    details.appendChild(summary);
                    details.appendChild(promptElem);

                    const extLabel = Array.from(document.querySelectorAll("#segmented_prompt_accordion_"+tabName+" span")).find(el => el.textContent.includes("Enable Segmented Prompt"));
                    if (extLabel) {
                        const cb = extLabel.closest("label").querySelector('input[type="checkbox"]');
                        if (cb) {
                            cb.addEventListener('change', (e) => {
                                if (e.target.checked) {
                                    details.open = false;
                                } else {
                                    details.open = true;
                                }
                            });
                        }
                    }
                }
            };
            wrapPrompt("txt2img");
            wrapPrompt("img2img");
        } catch (e) {
            console.error("[Segmented Prompt] Wrap prompt error:", e);
        }
    }, 1200);

    // 6. Move the Sync & Reverse Sync Buttons next to Clear Prompt with Click Feedback
    setTimeout(function() {
        try {
            ["txt2img", "img2img"].forEach(tab => {
                const syncBtn = document.getElementById(`seg_sync_btn_${tab}`);
                const reverseSyncBtn = document.getElementById(`seg_reverse_sync_btn_${tab}`);
                const clearBtn = document.getElementById(`${tab}_clear_prompt`);

                if (syncBtn && clearBtn && clearBtn.parentNode) {
                    clearBtn.parentNode.insertBefore(syncBtn, clearBtn.nextSibling);
                    syncBtn.classList.add("tool");
                    syncBtn.title = "Sync from Main Prompt (Raw Text -> Segments)";
                    syncBtn.textContent = "🔄 Sync";
                    syncBtn.style.minWidth = "auto";
                    syncBtn.style.boxShadow = "none";
                    syncBtn.style.transition = "all 0.2s ease";

                    syncBtn.addEventListener("click", function() {
                        if (syncBtn._feedbackTimer) clearTimeout(syncBtn._feedbackTimer);
                        if (syncBtn._revertTimer) clearTimeout(syncBtn._revertTimer);

                        syncBtn.textContent = "⏳ Syncing...";
                        syncBtn.style.opacity = "0.7";

                        syncBtn._feedbackTimer = setTimeout(() => {
                            syncBtn.textContent = "✅ Synced!";
                            syncBtn.style.opacity = "1";
                            syncBtn.style.color = "#22c55e";
                            syncBtn.style.borderColor = "#22c55e";
                            syncBtn.title = "Synced from Main Prompt!";

                            setTimeout(() => {
                                if (typeof window.refreshAllSummaries === 'function') {
                                    window.refreshAllSummaries(tab);
                                }
                            }, 200);

                            syncBtn._revertTimer = setTimeout(() => {
                                syncBtn.textContent = "🔄 Sync";
                                syncBtn.style.color = "";
                                syncBtn.style.borderColor = "";
                                syncBtn.title = "Sync from Main Prompt (Raw Text -> Segments)";
                            }, 1500);
                        }, 250);
                    });
                }

                if (reverseSyncBtn && syncBtn && syncBtn.parentNode) {
                    syncBtn.parentNode.insertBefore(reverseSyncBtn, syncBtn.nextSibling);
                    reverseSyncBtn.classList.add("tool");
                    reverseSyncBtn.title = "Push to Main Prompt (Segments -> Raw Text)";
                    reverseSyncBtn.textContent = "⬆️";
                    reverseSyncBtn.style.minWidth = "auto";
                    reverseSyncBtn.style.boxShadow = "none";
                    reverseSyncBtn.style.transition = "all 0.2s ease";

                    reverseSyncBtn.addEventListener("click", function() {
                        if (reverseSyncBtn._feedbackTimer) clearTimeout(reverseSyncBtn._feedbackTimer);
                        if (reverseSyncBtn._revertTimer) clearTimeout(reverseSyncBtn._revertTimer);

                        reverseSyncBtn.textContent = "⏳";
                        reverseSyncBtn.style.opacity = "0.7";

                        reverseSyncBtn._feedbackTimer = setTimeout(() => {
                            reverseSyncBtn.textContent = "✅";
                            reverseSyncBtn.style.opacity = "1";
                            reverseSyncBtn.style.color = "#22c55e";
                            reverseSyncBtn.style.borderColor = "#22c55e";
                            reverseSyncBtn.title = "Pushed to Main Prompt!";

                            reverseSyncBtn._revertTimer = setTimeout(() => {
                                reverseSyncBtn.textContent = "⬆️";
                                reverseSyncBtn.style.color = "";
                                reverseSyncBtn.style.borderColor = "";
                                reverseSyncBtn.title = "Push to Main Prompt (Segments -> Raw Text)";
                            }, 1500);
                        }, 250);
                    });
                }
            });
        } catch (e) {
            console.error("[Segmented Prompt] Toolbar move error:", e);
        }
    }, 1500);
});
