// Theme Color Picker Extension for SillyTavern
console.log('Theme Color Picker Extension: Starting initialization');

// Extension initialization
jQuery(async () => {
    'use strict';
    
    console.log('Theme Color Picker Extension: DOM ready');
    
    // Check if EyeDropper API is supported
    if (!window.EyeDropper) {
        console.warn('EyeDropper API not supported in this browser');
        if (typeof toastr !== 'undefined') {
            toastr.warning('此瀏覽器不支援滴管工具 API，請使用 Chrome 或 Edge');
        }
        return;
    }
    
    let isPickingColor = false;
    
    // Function to add color picker buttons
    function addColorPickerButtons() {
        console.log('Theme Color Picker: Scanning for color inputs');
        
        // More specific selectors for SillyTavern's theme color inputs
        const colorInputs = document.querySelectorAll([
            '#themes input[type="color"]',
            '.theme-colors input[type="color"]',
            '#ui-customization input[type="color"]',
            '.inline-drawer input[type="color"]',
            'input[type="color"]'
        ].join(', '));
        
        let buttonsAdded = 0;
        
        colorInputs.forEach(input => {
            // Skip if button already exists
            if (input.parentNode.querySelector('.color-picker-btn')) {
                return;
            }
            
            // Skip if input is not visible or in theme colors section
            const rect = input.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                return;
            }
            
            // Create picker button
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'menu_button color-picker-btn';
            button.innerHTML = '🎨';
            button.title = '使用滴管工具選取螢幕顏色';
            
            // Enhanced styling to match SillyTavern's theme
            button.style.cssText = `
                margin-left: 6px;
                padding: 6px 8px;
                background: var(--SmartThemeUIBackgroundColor, #444);
                color: var(--SmartThemeMainTextColor, white);
                border: 1px solid var(--SmartThemeUIBorderColor, #666);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                height: 32px;
                min-width: 32px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                vertical-align: top;
                transition: all 0.2s ease;
            `;
            
            // Add hover effects
            button.addEventListener('mouseenter', () => {
                button.style.background = 'var(--SmartThemeUIBorderColor, #666)';
                button.style.transform = 'scale(1.05)';
            });
            
            button.addEventListener('mouseleave', () => {
                if (!isPickingColor) {
                    button.style.background = 'var(--SmartThemeUIBackgroundColor, #444)';
                    button.style.transform = 'scale(1)';
                }
            });
            
            // Add click handler
            button.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (isPickingColor) return;
                
                try {
                    isPickingColor = true;
                    button.style.opacity = '0.6';
                    button.style.background = '#007bff';
                    button.innerHTML = '⏳';
                    button.title = '點擊螢幕選取顏色...';
                    
                    console.log('Starting color picker...');
                    const eyeDropper = new EyeDropper();
                    const result = await eyeDropper.open();
                    
                    console.log('Color picked:', result.sRGBHex);
                    
                    if (result.sRGBHex) {
                        // Update the input value
                        input.value = result.sRGBHex;
                        
                        // Trigger all necessary events for SillyTavern
                        const events = ['input', 'change', 'blur'];
                        events.forEach(eventType => {
                            const event = new Event(eventType, { 
                                bubbles: true, 
                                cancelable: true 
                            });
                            input.dispatchEvent(event);
                        });
                        
                        // Force SillyTavern theme update
                        setTimeout(() => {
                            if (typeof window.power_user !== 'undefined' && window.power_user.theme) {
                                console.log('Forcing theme update...');
                                // Trigger theme save and apply
                                const saveEvent = new CustomEvent('theme-color-changed', {
                                    detail: { color: result.sRGBHex, input: input }
                                });
                                document.dispatchEvent(saveEvent);
                            }
                        }, 100);
                        
                        if (typeof toastr !== 'undefined') {
                            toastr.success(`顏色設定為 ${result.sRGBHex}`);
                        }
                        
                        console.log('Color applied successfully');
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Color picking failed:', error);
                        if (typeof toastr !== 'undefined') {
                            toastr.error('取色失敗: ' + error.message);
                        }
                    } else {
                        console.log('Color picking cancelled by user');
                    }
                } finally {
                    isPickingColor = false;
                    button.style.opacity = '1';
                    button.style.background = 'var(--SmartThemeUIBackgroundColor, #444)';
                    button.innerHTML = '🎨';
                    button.title = '使用滴管工具選取螢幕顏色';
                }
            };
            
            // Insert button based on determined method
            try {
                if (insertMethod === 'after') {
                    if (insertTarget.nextSibling) {
                        insertTarget.parentNode.insertBefore(button, insertTarget.nextSibling);
                    } else {
                        insertTarget.parentNode.appendChild(button);
                    }
                } else {
                    insertTarget.appendChild(button);
                }
                
                buttonsAdded++;
                console.log(`Successfully added button for input ${index}`);
            } catch (error) {
                console.error(`Failed to insert button for input ${index}:`, error);
                
                // Fallback: try to insert directly after input
                try {
                    if (input.nextSibling) {
                        input.parentNode.insertBefore(button, input.nextSibling);
                    } else {
                        input.parentNode.appendChild(button);
                    }
                    buttonsAdded++;
                    console.log(`Fallback insertion successful for input ${index}`);
                } catch (fallbackError) {
                    console.error(`Fallback insertion failed for input ${index}:`, fallbackError);
                }
            }
        });
        
        if (buttonsAdded > 0) {
            console.log(`Theme Color Picker: Added ${buttonsAdded} buttons`);
        }
        return buttonsAdded;
    }
    
    // Initial button addition with longer delay and forced trigger
    setTimeout(() => {
        console.log('Initial scan starting...');
        addColorPickerButtons();
    }, 1500);
    
    // Force trigger when theme colors are expanded
    $(document).on('click', 'h4:contains("Theme Colors"), .theme_colors_toggle, [data-setting*="theme"]', function() {
        console.log('Theme colors section clicked, adding buttons...');
        setTimeout(addColorPickerButtons, 300);
    });
    
    // Listen for any settings changes that might reveal color inputs
    $(document).on('click change', '.setting_block, .inline-drawer, [class*="theme"]', function() {
        setTimeout(addColorPickerButtons, 200);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Periodic check every 3 seconds for robustness
    setInterval(addColorPickerButtons, 3000);
    
    // Listen for SillyTavern specific events
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addColorPickerButtons, 1000);
    });
    
    // Listen for settings panel events
    $(document).on('click', '[data-toggle="modal"], .settings_button', function() {
        setTimeout(addColorPickerButtons, 500);
    });
    
    console.log('Theme Color Picker Extension: Initialization complete');
});
