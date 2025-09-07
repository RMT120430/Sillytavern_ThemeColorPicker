// Theme Color Picker Extension for SillyTavern
console.log('Theme Color Picker Extension: Starting initialization - index.js:2');

// Extension initialization
jQuery(async () => {
    'use strict';
    
    console.log('Theme Color Picker Extension: DOM ready - index.js:8');
    
    // Check if EyeDropper API is supported
    if (!window.EyeDropper) {
        console.warn('EyeDropper API not supported - index.js:12');
        return;
    }
    
    let isPickingColor = false;
    
    // Function to add color picker buttons
    function addColorPickerButtons() {
        console.log('Theme Color Picker: Adding buttons - index.js:20');
        
        // Find all color inputs
        const colorInputs = document.querySelectorAll('input[type="color"]');
        let buttonsAdded = 0;
        
        colorInputs.forEach(input => {
            // Skip if button already exists
            if (input.nextElementSibling && input.nextElementSibling.classList.contains('color-picker-btn')) {
                return;
            }
            
            // Create picker button
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'menu_button color-picker-btn';
            button.innerHTML = '🎨';
            button.title = '使用滴管工具選取螢幕顏色';
            button.style.cssText = `
                margin-left: 8px;
                padding: 4px 8px;
                background: #444;
                color: white;
                border: 1px solid #666;
                border-radius: 3px;
                cursor: pointer;
                font-size: 16px;
            `;
            
            // Add click handler
            button.onclick = async () => {
                if (isPickingColor) return;
                
                try {
                    isPickingColor = true;
                    button.style.opacity = '0.5';
                    
                    const eyeDropper = new EyeDropper();
                    const result = await eyeDropper.open();
                    
                    if (result.sRGBHex) {
                        input.value = result.sRGBHex;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        if (typeof toastr !== 'undefined') {
                            toastr.success(`顏色設定為 ${result.sRGBHex}`);
                        }
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Color picking failed: - index.js:71', error);
                        if (typeof toastr !== 'undefined') {
                            toastr.error('取色失敗');
                        }
                    }
                } finally {
                    isPickingColor = false;
                    button.style.opacity = '1';
                }
            };
            
            // Insert button after input
            input.parentNode.insertBefore(button, input.nextSibling);
            buttonsAdded++;
        });
        
        console.log(`Theme Color Picker: Added ${buttonsAdded} buttons - index.js:87`);
        return buttonsAdded;
    }
    
    // Initial button addition
    addColorPickerButtons();
    
    // Re-add buttons when settings are opened
    const observer = new MutationObserver(() => {
        setTimeout(addColorPickerButtons, 100);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Periodic check
    setInterval(addColorPickerButtons, 2000);
    
    console.log('Theme Color Picker Extension: Initialization complete - index.js:107');
});
