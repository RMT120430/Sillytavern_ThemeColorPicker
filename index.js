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
    
    // Function to convert hex to RGB for setting CSS variables
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // Function to update SillyTavern theme color
    function updateThemeColor(colorDiv, newColor) {
        // Update the visual color display
        colorDiv.style.backgroundColor = newColor;
        
        // Find and update associated input if it exists
        const input = colorDiv.closest('.setting_block')?.querySelector('input[type="color"]') ||
                     colorDiv.querySelector('input[type="color"]') ||
                     document.querySelector(`input[type="color"][value="${colorDiv.style.backgroundColor}"]`);
        
        if (input) {
            input.value = newColor;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Try to identify which theme color this is and update CSS variables
        const settingBlock = colorDiv.closest('.setting_block');
        if (settingBlock) {
            const label = settingBlock.querySelector('label, .setting_label')?.textContent?.trim();
            updateCSSVariable(label, newColor);
        }
        
        // Force theme update
        setTimeout(() => {
            if (typeof saveSettingsDebounced === 'function') {
                saveSettingsDebounced();
            }
        }, 100);
    }
    
    // Function to update CSS variables based on color type
    function updateCSSVariable(labelText, color) {
        const root = document.documentElement;
        const rgb = hexToRgb(color);
        
        if (!rgb) return;
        
        const colorMapping = {
            'Main Text': 'SmartThemeMainTextColor',
            'Italics Text': 'SmartThemeItalicsColor',
            'Underlined Text': 'SmartThemeUnderlinedColor',
            'Quote Text': 'SmartThemeQuoteColor',
            'Text Shadow': 'SmartThemeTextShadowColor',
            'Chat Background': 'SmartThemeChatBackgroundColor',
            'UI Background': 'SmartThemeUIBackgroundColor',
            'UI Border': 'SmartThemeUIBorderColor',
            'User Message': 'SmartThemeUserMessageColor',
            'AI Message': 'SmartThemeBotMessageColor'
        };
        
        const cssVar = colorMapping[labelText];
        if (cssVar) {
            root.style.setProperty(`--${cssVar}`, color);
            console.log(`Updated CSS variable --${cssVar} to ${color}`);
        }
    }
    
    // Function to add color picker buttons
    function addColorPickerButtons() {
        console.log('Theme Color Picker: Scanning for color elements');
        
        // Find color display elements in the Theme Colors section
        const colorDisplays = document.querySelectorAll([
            // Look for elements that display colors visually
            '[style*="background-color"]:not(.color-picker-btn)',
            '[style*="background:"]:not(.color-picker-btn)',
            '.color-swatch',
            '.theme-color-display',
            // Also check for inputs in theme settings
            '.themes_settings input[type="color"]',
            '#themes input[type="color"]'
        ].join(', '));
        
        console.log(`Found ${colorDisplays.length} potential color elements`);
        
        let buttonsAdded = 0;
        
        colorDisplays.forEach((element, index) => {
            // Skip if this is already a picker button or has one
            if (element.classList.contains('color-picker-btn') || 
                element.parentNode.querySelector('.color-picker-btn')) {
                return;
            }
            
            // Check if element has a background color set
            const style = window.getComputedStyle(element);
            const bgColor = style.backgroundColor;
            
            // Skip if no background color or transparent
            if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
                return;
            }
            
            // Skip if element is too small (likely not a color display)
            const rect = element.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) {
                return;
            }
            
            // Check if this is in the Theme Colors section
            const themeSection = element.closest('.setting_block, .themes_settings, #themes');
            if (!themeSection) {
                return;
            }
            
            console.log(`Processing color element ${index}:`, {
                tag: element.tagName,
                class: element.className,
                bgColor: bgColor,
                size: `${rect.width}x${rect.height}`
            });
            
            // Create picker button
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'color-picker-btn';
            button.innerHTML = '🎨';
            button.title = '使用滴管工具選取螢幕顏色';
            
            // Style the button
            button.style.cssText = `
                position: absolute !important;
                top: 2px !important;
                right: 2px !important;
                width: 20px !important;
                height: 20px !important;
                background: rgba(0,0,0,0.7) !important;
                color: white !important;
                border: 1px solid white !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                font-size: 10px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 1000 !important;
                transition: all 0.2s ease !important;
                opacity: 0.7 !important;
            `;
            
            // Add hover effects
            button.addEventListener('mouseenter', () => {
                button.style.opacity = '1';
                button.style.transform = 'scale(1.1)';
            });
            
            button.addEventListener('mouseleave', () => {
                if (!isPickingColor) {
                    button.style.opacity = '0.7';
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
                    button.style.opacity = '1';
                    button.style.background = '#007bff';
                    button.innerHTML = '⏳';
                    button.title = '點擊螢幕選取顏色...';
                    
                    console.log('Starting color picker...');
                    const eyeDropper = new EyeDropper();
                    const result = await eyeDropper.open();
                    
                    console.log('Color picked:', result.sRGBHex);
                    
                    if (result.sRGBHex) {
                        updateThemeColor(element, result.sRGBHex);
                        
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
                    button.style.opacity = '0.7';
                    button.style.background = 'rgba(0,0,0,0.7)';
                    button.innerHTML = '🎨';
                    button.title = '使用滴管工具選取螢幕顏色';
                }
            };
            
            // Make the parent element positioned relative if needed
            if (style.position === 'static') {
                element.style.position = 'relative';
            }
            
            // Insert button as child of the color element
            element.appendChild(button);
            buttonsAdded++;
            
            console.log(`Successfully added button for color element ${index}`);
        });
        
        if (buttonsAdded > 0) {
            console.log(`Theme Color Picker: Added ${buttonsAdded} buttons`);
        }
        return buttonsAdded;
    }
    
    // Initial scan with delay
    setTimeout(() => {
        console.log('Initial color element scan starting...');
        addColorPickerButtons();
    }, 2000);
    
    // Watch for DOM changes
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches('[style*="background"], .setting_block, .themes_settings')) {
                            shouldCheck = true;
                        }
                        if (node.querySelector && node.querySelector('[style*="background"]')) {
                            shouldCheck = true;
                        }
                    }
                });
            }
            
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (mutation.target.style.backgroundColor) {
                    shouldCheck = true;
                }
            }
        });
        
        if (shouldCheck) {
            setTimeout(addColorPickerButtons, 500);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });
    
    // Listen for settings changes
    $(document).on('click', '.setting_block, [data-setting], .themes_settings', function() {
        setTimeout(addColorPickerButtons, 300);
    });
    
    // Periodic check
    setInterval(addColorPickerButtons, 5000);
    
    console.log('Theme Color Picker Extension: Initialization complete');
});
