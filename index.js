// Theme Color Picker Extension for SillyTavern
// Based on the working pattern from Alternate Fields extension

let isPickingColor = false;
let currentColorInput = null;

// Theme color input selectors - updated to match SillyTavern's actual structure
const COLOR_INPUT_SELECTORS = [
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

// Wait for element to appear in DOM
function waitForElement(selector, callback, timeout = 10000) {
    const startTime = Date.now();
    
    function check() {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else if (Date.now() - startTime < timeout) {
            setTimeout(check, 100);
        }
    }
    
    check();
}

// Create picker button
function createPickerButton(colorInput) {
    const pickerBtn = document.createElement('div');
    pickerBtn.className = 'menu_button menu_button_icon color-picker-btn';
    pickerBtn.title = '使用滴管工具選取螢幕顏色';
    
    // Use direct HTML instead of Font Awesome classes for reliability
    pickerBtn.innerHTML = '<span>🎨</span><span>Pick</span>';
    
    // Add inline styles for immediate visibility
    pickerBtn.style.cssText = `
        margin-left: 5px;
        padding: 5px 8px;
        min-width: 60px;
        height: 32px;
        border: 1px solid #666;
        background-color: #444;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        vertical-align: middle;
        font-size: 12px;
        transition: all 0.2s ease;
    `;
    
    pickerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startColorPicking(colorInput);
    });
    
    return pickerBtn;
}

// Add picker button next to color input
function addPickerButton(colorInput) {
    // Check if button already exists
    const existingBtn = colorInput.parentNode.querySelector('.color-picker-btn');
    if (existingBtn) {
        return;
    }
    
    const pickerBtn = createPickerButton(colorInput);
    
    // Insert button after the color input
    colorInput.parentNode.insertBefore(pickerBtn, colorInput.nextSibling);
    
    console.log('Added color picker button for:', colorInput.id);
}

// Start the color picking process
async function startColorPicking(colorInput) {
    if (!window.EyeDropper) {
        showMessage('您的瀏覽器不支援滴管工具。請使用 Chrome 95+ 或 Edge 95+', 'error');
        return;
    }
    
    if (isPickingColor) {
        return;
    }
    
    currentColorInput = colorInput;
    isPickingColor = true;
    
    // Update button state
    const pickerBtn = colorInput.nextElementSibling;
    if (pickerBtn && pickerBtn.classList.contains('color-picker-btn')) {
        pickerBtn.style.opacity = '0.7';
        pickerBtn.innerHTML = '<span>🎯</span><span>Picking...</span>';
    }
    
    try {
        const eyeDropper = new EyeDropper();
        const result = await eyeDropper.open();
        
        if (result.sRGBHex) {
            // Set the color value
            colorInput.value = result.sRGBHex;
            
            // Trigger change events to update SillyTavern
            const events = ['input', 'change', 'blur'];
            events.forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                colorInput.dispatchEvent(event);
            });
            
            showMessage(`顏色已設定為 ${result.sRGBHex}`, 'success');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Color picking failed:', error);
            showMessage('取色失敗', 'error');
        }
    } finally {
        isPickingColor = false;
        currentColorInput = null;
        
        // Restore button state
        if (pickerBtn && pickerBtn.classList.contains('color-picker-btn')) {
            pickerBtn.style.opacity = '';
            pickerBtn.innerHTML = '<span>🎨</span><span>Pick</span>';
        }
    }
}

// Show notification message
function showMessage(message, type = 'info') {
    // Try to use toastr if available
    if (typeof toastr !== 'undefined') {
        toastr[type](message);
    } else {
        // Fallback to console and alert
        console.log(`[Theme Color Picker] ${message}`);
        if (type === 'error') {
            alert(message);
        }
    }
}

// Add picker buttons to all color inputs
function addAllPickerButtons() {
    let buttonsAdded = 0;
    
    COLOR_INPUT_SELECTORS.forEach(selector => {
        const colorInput = document.querySelector(selector);
        if (colorInput && !colorInput.nextElementSibling?.classList?.contains('color-picker-btn')) {
            addPickerButton(colorInput);
            buttonsAdded++;
        }
    });
    
    // Also search for any color inputs in theme areas
    const themeAreas = document.querySelectorAll('.themes_settings, #themes, .theme-colors');
    themeAreas.forEach(area => {
        const colorInputs = area.querySelectorAll('input[type="color"]');
        colorInputs.forEach(colorInput => {
            if (!colorInput.nextElementSibling?.classList?.contains('color-picker-btn')) {
                addPickerButton(colorInput);
                buttonsAdded++;
            }
        });
    });
    
    if (buttonsAdded > 0) {
        console.log(`Theme Color Picker: Added ${buttonsAdded} picker buttons`);
    }
    
    return buttonsAdded;
}

// Check API support
function checkApiSupport() {
    if (!window.EyeDropper) {
        console.warn('EyeDropper API not supported in this browser');
        showMessage('您的瀏覽器不支援滴管工具。請使用 Chrome 95+ 或 Edge 95+', 'warning');
        return false;
    }
    return true;
}

// Setup DOM monitoring for dynamic content
function setupDOMMonitoring() {
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.matches && (
                            node.matches('input[type="color"]') ||
                            node.querySelector('input[type="color"]') ||
                            node.matches('.themes_settings') ||
                            node.matches('#themes')
                        )) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });
        
        if (shouldCheck) {
            setTimeout(() => {
                addAllPickerButtons();
            }, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    return observer;
}

// Initialize extension
function initExtension() {
    console.log('Theme Color Picker Extension loaded - v1.1.0');
    
    // Check API support
    if (!checkApiSupport()) {
        return;
    }
    
    // Initial attempt to add buttons
    addAllPickerButtons();
    
    // Setup monitoring for dynamic content
    setupDOMMonitoring();
    
    // Periodic checks to ensure buttons are present
    const intervals = [500, 1000, 2000, 5000];
    intervals.forEach(delay => {
        setTimeout(() => {
            addAllPickerButtons();
        }, delay);
    });
    
    // Listen for settings panel opening
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('[data-i18n="UI Theme"]') || 
            target.closest('.themes_settings') || 
            target.id === 'themes' ||
            target.textContent?.includes('Theme')) {
            setTimeout(() => {
                addAllPickerButtons();
            }, 200);
        }
    });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
}

// Also initialize immediately in case DOM is already ready
setTimeout(initExtension, 100);
