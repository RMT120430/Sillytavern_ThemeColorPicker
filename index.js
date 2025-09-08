console.log('Theme Color Picker Extension: Starting initialization');

jQuery(async () => {
    'use strict';
    
    console.log('Theme Color Picker Extension: DOM ready');
    
    // Check EyeDropper API support
    if (!window.EyeDropper) {
        console.warn('EyeDropper API not supported in this browser');
        if (typeof toastr !== 'undefined') {
            toastr.warning('EyeDropper API not supported. Please use Chrome or Edge browser.');
        }
        return;
    }
    
    let isPickingColor = false;
    let activeButton = null;
    
    // Color format conversion utilities
    const ColorUtils = {
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        
        rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        },
        
        parseRgbString(rgbString) {
            const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return match ? {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            } : null;
        },
        
        toHex(color) {
            if (color.startsWith('#')) return color;
            if (color.startsWith('rgb')) {
                const rgb = this.parseRgbString(color);
                return rgb ? this.rgbToHex(rgb.r, rgb.g, rgb.b) : color;
            }
            return color;
        }
    };
    
    // Color name to CSS variable mapping
    const colorMappings = {
        'Main Text': '--SmartThemeMainTextColor',
        'Italics Text': '--SmartThemeItalicsColor',
        'Underlined Text': '--SmartThemeUnderlinedColor',
        'Quote Text': '--SmartThemeQuoteColor',
        'Text Shadow': '--SmartThemeTextShadowColor',
        'Chat Background': '--SmartThemeChatBackgroundColor',
        'UI Background': '--SmartThemeUIBackgroundColor',
        'UI Border': '--SmartThemeUIBorderColor',
        'User Message': '--SmartThemeUserMessageColor',
        'AI Message': '--SmartThemeBotMessageColor'
    };
    
    // Setting key mapping for SillyTavern power_user.themes
    const settingKeyMapping = {
        'Main Text': 'main_text_color',
        'Italics Text': 'italics_text_color', 
        'Underlined Text': 'underlined_text_color',
        'Quote Text': 'quote_text_color',
        'Text Shadow': 'text_shadow_color',
        'Chat Background': 'chat_bg_color',
        'UI Background': 'ui_bg_color',
        'UI Border': 'ui_border_color',
        'User Message': 'user_msg_color',
        'AI Message': 'ai_msg_color'
    };
    
    // Update theme color and apply changes
    function updateThemeColor(colorName, newColor) {
        console.log('Updating theme color:', colorName, 'to:', newColor);
        
        // Update CSS variable directly
        const cssVar = colorMappings[colorName];
        if (cssVar) {
            document.documentElement.style.setProperty(cssVar, newColor);
            console.log(`Updated CSS variable ${cssVar} to ${newColor}`);
        }
        
        // Update SillyTavern theme settings
        const settingKey = settingKeyMapping[colorName];
        if (settingKey && typeof power_user !== 'undefined' && power_user.themes) {
            const currentTheme = power_user.theme || 'default';
            if (!power_user.themes[currentTheme]) {
                power_user.themes[currentTheme] = {};
            }
            power_user.themes[currentTheme][settingKey] = newColor;
            
            console.log(`Updated theme setting ${settingKey} to ${newColor}`);
        }
        
        // Update the visual color display element
        updateColorDisplay(colorName, newColor);
        
        // Trigger SillyTavern settings save
        setTimeout(() => {
            if (typeof saveSettingsDebounced === 'function') {
                saveSettingsDebounced();
            } else if (typeof saveSettings === 'function') {
                saveSettings();
            }
            
            // Force theme reapplication
            if (typeof applyTheme === 'function') {
                applyTheme();
            }
            
            // Trigger custom event
            $(document).trigger('themeColorChanged', [colorName, newColor]);
        }, 100);
    }
    
    // Update color display element
    function updateColorDisplay(colorName, newColor) {
        const colorElements = findColorElementsByName(colorName);
        colorElements.forEach(element => {
            element.style.backgroundColor = newColor;
        });
    }
    
    // Find color display elements by color name
    function findColorElementsByName(colorName) {
        const elements = [];
        
        // Look for color picker blocks
        const colorSections = document.querySelectorAll('.color-picker-block, .inline-drawer');
        
        colorSections.forEach(section => {
            // Find the text label
            const labels = section.querySelectorAll('*');
            for (let label of labels) {
                if (label.textContent && label.textContent.trim() === colorName) {
                    // Find associated color display element
                    const colorElement = label.parentElement?.querySelector('[style*="background-color"]') ||
                                       label.nextElementSibling?.querySelector('[style*="background-color"]') ||
                                       label.querySelector('[style*="background-color"]');
                    if (colorElement) {
                        elements.push(colorElement);
                    }
                    break;
                }
            }
        });
        
        return elements;
    }
    
    // Get color name from element context
    function getColorNameFromElement(element) {
        const container = element.closest('.color-picker-block, .inline-drawer, .user-settings-block');
        if (!container) return null;
        
        // Look for text labels in the container
        const textNodes = container.querySelectorAll('*');
        for (let node of textNodes) {
            const text = node.textContent?.trim();
            if (text && colorMappings[text]) {
                return text;
            }
        }
        
        // Fallback: try to determine from DOM structure
        const allColorElements = container.querySelectorAll('[style*="background-color"]');
        const index = Array.from(allColorElements).indexOf(element);
        const colorNames = Object.keys(colorMappings);
        
        return colorNames[index] || null;
    }
    
    // Create eyedropper button
    function createEyedropperButton(targetElement, colorName) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'eyedropper-btn';
        button.innerHTML = '🎨';
        button.title = `Use eyedropper to pick color for ${colorName || 'this element'}`;
        
        // Button styles
        button.style.cssText = `
            position: absolute !important;
            top: 2px !important;
            right: 2px !important;
            width: 20px !important;
            height: 20px !important;
            background: rgba(0, 123, 255, 0.8) !important;
            color: white !important;
            border: 1px solid rgba(0, 123, 255, 1) !important;
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
        
        // Hover effects
        button.addEventListener('mouseenter', () => {
            if (!isPickingColor) {
                button.style.opacity = '1';
                button.style.transform = 'scale(1.1)';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            if (!isPickingColor) {
                button.style.opacity = '0.7';
                button.style.transform = 'scale(1)';
            }
        });
        
        // Click event
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isPickingColor) return;
            
            const finalColorName = colorName || getColorNameFromElement(targetElement);
            if (!finalColorName) {
                if (typeof toastr !== 'undefined') {
                    toastr.error('Could not determine color type for this element');
                }
                return;
            }
            
            await startColorPicking(button, finalColorName);
        });
        
        return button;
    }
    
    // Start color picking process
    async function startColorPicking(button, colorName) {
        if (isPickingColor) return;
        
        try {
            isPickingColor = true;
            activeButton = button;
            
            // Update button state
            button.style.background = '#ff4444';
            button.style.borderColor = '#ff2222';
            button.innerHTML = '⏳';
            button.title = 'Click screen to pick color... (ESC to cancel)';
            button.style.opacity = '1';
            
            if (typeof toastr !== 'undefined') {
                toastr.info(`Click anywhere on screen to pick color for ${colorName}`, 'Eyedropper Active');
            }
            
            console.log('Starting eyedropper for:', colorName);
            
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            
            if (result && result.sRGBHex) {
                const selectedColor = result.sRGBHex.toLowerCase();
                console.log('Color selected:', selectedColor, 'for:', colorName);
                
                updateThemeColor(colorName, selectedColor);
                
                if (typeof toastr !== 'undefined') {
                    toastr.success(`${colorName} color set to ${selectedColor.toUpperCase()}`);
                }
                
                // Success state
                button.style.background = '#28a745';
                button.innerHTML = '✓';
                
                setTimeout(() => {
                    if (button && !isPickingColor) {
                        resetButton(button);
                    }
                }, 1000);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Color picking cancelled');
                if (typeof toastr !== 'undefined') {
                    toastr.info('Color picking cancelled');
                }
            } else {
                console.error('Color picking failed:', error);
                if (typeof toastr !== 'undefined') {
                    toastr.error('Color picking failed: ' + error.message);
                }
            }
        } finally {
            isPickingColor = false;
            activeButton = null;
            
            if (button) {
                setTimeout(() => resetButton(button), 500);
            }
        }
    }
    
    // Reset button state
    function resetButton(button) {
        if (button && button.parentNode) {
            button.style.background = 'rgba(0, 123, 255, 0.8)';
            button.style.borderColor = 'rgba(0, 123, 255, 1)';
            button.innerHTML = '🎨';
            button.title = button.title.replace('Click screen to pick color... (ESC to cancel)', 'Use eyedropper to pick color');
            button.style.opacity = '0.7';
            button.style.transform = 'scale(1)';
        }
    }
    
    // Add eyedropper buttons to color elements
    function addEyedropperButtons() {
        console.log('Scanning for SillyTavern color elements...');
        
        let buttonsAdded = 0;
        
        // Find theme color sections
        const themeColorSections = [
            ...document.querySelectorAll('.color-picker-block'),
            ...document.querySelectorAll('[class*="color-picker"]'),
            ...document.querySelectorAll('.inline-drawer'),
            ...document.querySelectorAll('.user-settings-block')
        ];
        
        themeColorSections.forEach(section => {
            // Look for each known color type
            Object.keys(colorMappings).forEach(colorName => {
                // Find text label
                const labels = section.querySelectorAll('*');
                for (let label of labels) {
                    if (label.textContent && label.textContent.trim() === colorName) {
                        // Find associated color display element
                        const colorElement = label.parentElement?.querySelector('[style*="background-color"]:not(.eyedropper-btn)') ||
                                           label.nextElementSibling?.querySelector('[style*="background-color"]:not(.eyedropper-btn)') ||
                                           section.querySelector(`[style*="background-color"]:not(.eyedropper-btn):nth-of-type(${Object.keys(colorMappings).indexOf(colorName) + 1})`);
                        
                        if (colorElement && !colorElement.querySelector('.eyedropper-btn')) {
                            const computedStyle = window.getComputedStyle(colorElement);
                            const bgColor = computedStyle.backgroundColor;
                            
                            // Skip transparent or invalid background colors
                            if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
                                const rect = colorElement.getBoundingClientRect();
                                // Only process sufficiently large color display elements
                                if (rect.width >= 20 && rect.height >= 15) {
                                    // Ensure element has relative positioning
                                    if (computedStyle.position === 'static') {
                                        colorElement.style.position = 'relative';
                                    }
                                    
                                    const button = createEyedropperButton(colorElement, colorName);
                                    colorElement.appendChild(button);
                                    buttonsAdded++;
                                    
                                    console.log(`Added eyedropper button for ${colorName}`);
                                }
                            }
                        }
                        break;
                    }
                }
            });
        });
        
        if (buttonsAdded > 0) {
            console.log(`Added ${buttonsAdded} eyedropper buttons`);
        }
        
        return buttonsAdded;
    }
    
    // Initialize the extension
    function initialize() {
        console.log('Initializing SillyTavern Theme Color Picker...');
        
        // Delayed execution to ensure DOM is fully loaded
        setTimeout(() => {
            addEyedropperButtons();
        }, 2000);
        
        // DOM change observer
        const observer = new MutationObserver((mutations) => {
            let shouldRescan = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.matches && (
                                node.matches('.color-picker-block') ||
                                node.matches('.inline-drawer') ||
                                node.matches('[style*="background-color"]') ||
                                node.matches('.user-settings-block')
                            )) {
                                shouldRescan = true;
                            }
                            
                            if (node.querySelector && (
                                node.querySelector('.color-picker-block') ||
                                node.querySelector('[style*="background-color"]')
                            )) {
                                shouldRescan = true;
                            }
                        }
                    });
                }
                
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'style' && 
                    mutation.target.style.backgroundColor) {
                    shouldRescan = true;
                }
            });
            
            if (shouldRescan) {
                setTimeout(addEyedropperButtons, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
        
        // Listen for SillyTavern events
        $(document).on('click', '.drawer-toggle, .inline_ctrls', function() {
            setTimeout(addEyedropperButtons, 300);
        });
        
        // Periodic check
        setInterval(addEyedropperButtons, 10000);
        
        console.log('SillyTavern Theme Color Picker initialized');
    }
    
    // ESC key to cancel
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPickingColor && activeButton) {
            console.log('Color picking cancelled by ESC');
            isPickingColor = false;
            resetButton(activeButton);
            activeButton = null;
        }
    });
    
    // Start initialization
    initialize();
});
