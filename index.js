// Theme Color Picker Extension for SillyTavern
(() => {
    'use strict';
    
    let isPickingColor = false;
    let currentColorInput = null;
    
    // Theme color input selectors
    const COLOR_INPUTS = [
        '#main-text-color',
        '#italics-color', 
        '#underline-color',
        '#quote-color',
        '#shadow-color',
        '#chat-bg-color',
        '#ui-bg-color',
        '#ui-border-color',
        '#user-mes-blur-tint',
        '#bot-mes-blur-tint'
    ];
    
    function initExtension() {
        console.log('Theme Color Picker Extension loaded - index.js:23');
        
        // Wait for UI to be ready
        const { eventSource, event_types } = SillyTavern.getContext();
        
        eventSource.on(event_types.APP_READY, () => {
            addColorPickers();
        });
        
        // Re-add pickers when settings are updated (theme changes)
        eventSource.on(event_types.SETTINGS_UPDATED, () => {
            setTimeout(() => {
                addColorPickers();
            }, 100);
        });
    }
    
    function addColorPickers() {
        COLOR_INPUTS.forEach(selector => {
            const colorInput = document.querySelector(selector);
            if (colorInput && !colorInput.nextElementSibling?.classList.contains('color-picker-btn')) {
                addPickerButton(colorInput);
            }
        });
    }
    
    function addPickerButton(colorInput) {
        const pickerBtn = document.createElement('button');
        pickerBtn.className = 'color-picker-btn fa-solid fa-eye-dropper menu_button';
        pickerBtn.title = '使用滴管工具選取螢幕顏色';
        pickerBtn.type = 'button';
        
        pickerBtn.onclick = () => {
            startColorPicking(colorInput);
        };
        
        // Insert button after the color input
        colorInput.parentNode.insertBefore(pickerBtn, colorInput.nextSibling);
    }
    
    async function startColorPicking(colorInput) {
        if (!window.EyeDropper) {
            toastr.error('您的瀏覽器不支援滴管工具');
            return;
        }
        
        if (isPickingColor) {
            return;
        }
        
        currentColorInput = colorInput;
        isPickingColor = true;
        
        try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            
            if (result.sRGBHex) {
                // Set the color to the input
                colorInput.value = result.sRGBHex;
                
                // Trigger change event to update SillyTavern
                const event = new Event('change', { bubbles: true });
                colorInput.dispatchEvent(event);
                
                toastr.success(`顏色已設定為 ${result.sRGBHex}`);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Color picking failed: - index.js:92', error);
                toastr.error('取色失敗');
            }
        } finally {
            isPickingColor = false;
            currentColorInput = null;
        }
    }
    
    // Check for EyeDropper API availability
    function checkApiSupport() {
        if (!window.EyeDropper) {
            console.warn('EyeDropper API not supported in this browser - index.js:104');
            toastr.warning('您的瀏覽器不支援滴管工具。請使用 Chrome 95+ 或 Edge 95+');
            return false;
        }
        return true;
    }
    
    // Initialize extension when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExtension);
    } else {
        initExtension();
    }
    
    // Also try to initialize immediately in case we're already loaded
    setTimeout(initExtension, 100);
    
})();