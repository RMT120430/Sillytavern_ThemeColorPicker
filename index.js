console.log('SillyTavern Theme Color Picker: Starting initialization');

jQuery(async () => {
    'use strict';
    
    console.log('SillyTavern Theme Color Picker: DOM ready');
    
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
    
    // Color picker ID to CSS variable mapping
    const colorPickerMappings = {
        'main-text-color-picker': '--SmartThemeMainTextColor',
        'italics-color-picker': '--SmartThemeItalicsColor',
        'underline-color-picker': '--SmartThemeUnderlinedColor',
        'quote-color-picker': '--SmartThemeQuoteColor',
        'shadow-color-picker': '--SmartThemeTextShadowColor',
        'chat-tint-color-picker': '--SmartThemeChatBackgroundColor',
        'blur-tint-color-picker': '--SmartThemeUIBackgroundColor',
        'border-color-picker': '--SmartThemeUIBorderColor',
        'user-mes-blur-tint-color-picker': '--SmartThemeUserMessageColor',
        'bot-mes-blur-tint-color-picker': '--SmartThemeBotMessageColor'
    };
    
    // Setting key mapping for SillyTavern power_user.themes
    const settingKeyMapping = {
        'main-text-color-picker': 'main_text_color',
        'italics-color-picker': 'italics_text_color',
        'underline-color-picker': 'underlined_text_color',
        'quote-color-picker': 'quote_text_color',
        'shadow-color-picker': 'text_shadow_color',
        'chat-tint-color-picker': 'chat_bg_color',
        'blur-tint-color-picker': 'ui_bg_color',
        'border-color-picker': 'ui_border_color',
        'user-mes-blur-tint-color-picker': 'user_msg_color',
        'bot-mes-blur-tint-color-picker': 'ai_msg_color'
    };
    
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
            const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            return match ? {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            } : null;
        },
        
        hexToRgba(hex, alpha = 1) {
            const rgb = this.hexToRgb(hex);
            return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex;
        }
    };
    
    // Update theme color and apply changes
    function updateThemeColor(colorPickerId, newColor, originalAlpha = 1) {
        console.log('Updating theme color for picker:', colorPickerId, 'to:', newColor);
        
        // Convert hex to rgba with original alpha
        const rgbaColor = ColorUtils.hexToRgba(newColor, originalAlpha);
        
        // Find the toolcool-color-picker element
        const colorPicker = document.getElementById(colorPickerId);
        if (colorPicker) {
            // Update the color picker value directly
            colorPicker.setAttribute('color', rgbaColor);
            if (colorPicker.setColor && typeof colorPicker.setColor === 'function') {
                colorPicker.setColor(rgbaColor);
            } else {
                colorPicker.color = rgbaColor;
            }
            
            // Create and dispatch proper events with color data
            const eventData = {
                detail: {
                    rgba: rgbaColor,
                    hex: newColor,
                    color: rgbaColor
                },
                bubbles: true
            };
            
            const inputEvent = new CustomEvent('input', eventData);
            const changeEvent = new CustomEvent('change', eventData);
            
            colorPicker.dispatchEvent(inputEvent);
            colorPicker.dispatchEvent(changeEvent);
            
            console.log(`Updated color picker ${colorPickerId} to ${rgbaColor}`);
        }
        
        // Don't directly manipulate CSS variables or power_user settings
        // Let SillyTavern's built-in handlers manage this
        
        // Force a small delay to ensure the color picker processes the change
        setTimeout(() => {
            if (typeof saveSettingsDebounced === 'function') {
                saveSettingsDebounced();
            }
        }, 200);
    }
    
    // Extract alpha value from current color
    function getCurrentAlpha(colorPickerId) {
        const colorPicker = document.getElementById(colorPickerId);
        if (colorPicker && colorPicker.color) {
            const colorValue = String(colorPicker.color);
            const match = colorValue.match(/rgba?\([^,]+,[^,]+,[^,]+,?\s*([\d.]*)\)?/);
            return match && match[1] ? parseFloat(match[1]) : 1;
        }
        return 1;
    }
    
    // Create eyedropper button
    function createEyedropperButton(flexContainer) {
        const colorPicker = flexContainer.querySelector('toolcool-color-picker');
        if (!colorPicker || !colorPicker.id) return null;
        
        const colorPickerId = colorPicker.id;
        const colorName = flexContainer.querySelector('span[data-i18n]')?.textContent || colorPickerId;
        
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'eyedropper-btn';
        button.innerHTML = '🎨';
        button.title = `使用吸色器選擇 ${colorName} 的顏色`;
        button.setAttribute('data-color-picker-id', colorPickerId);
        
        // Button click event
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isPickingColor) return;
            
            await startColorPicking(button, colorPickerId, colorName);
        });
        
        return button;
    }
    
    // Start color picking process
    async function startColorPicking(button, colorPickerId, colorName) {
        if (isPickingColor) return;
        
        try {
            isPickingColor = true;
            activeButton = button;
            
            // Get current alpha value to preserve it
            const currentAlpha = getCurrentAlpha(colorPickerId);
            
            // Update button state
            button.classList.add('picking');
            button.innerHTML = '⏳';
            button.title = '點擊螢幕上的任意位置來選取顏色... (按 ESC 取消)';
            
            if (typeof toastr !== 'undefined') {
                toastr.info(`點擊螢幕上的任意位置來選取 ${colorName} 的顏色`, '吸色器已啟動');
            }
            
            console.log('Starting eyedropper for:', colorPickerId);
            
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            
            if (result && result.sRGBHex) {
                const selectedColor = result.sRGBHex.toLowerCase();
                console.log('Color selected:', selectedColor, 'for:', colorPickerId);
                
                updateThemeColor(colorPickerId, selectedColor, currentAlpha);
                
                if (typeof toastr !== 'undefined') {
                    toastr.success(`${colorName} 顏色已設定為 ${selectedColor.toUpperCase()}`);
                }
                
                // Success state
                button.classList.remove('picking');
                button.classList.add('success');
                button.innerHTML = '✓';
                
                setTimeout(() => {
                    resetButton(button);
                }, 1000);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Color picking cancelled');
                if (typeof toastr !== 'undefined') {
                    toastr.info('顏色選取已取消');
                }
            } else {
                console.error('Color picking failed:', error);
                if (typeof toastr !== 'undefined') {
                    toastr.error('顏色選取失敗: ' + error.message);
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
            button.classList.remove('picking', 'success');
            button.innerHTML = '🎨';
            const colorPickerId = button.getAttribute('data-color-picker-id');
            const flexContainer = button.nextElementSibling;
            const colorName = flexContainer?.querySelector('span[data-i18n]')?.textContent || colorPickerId;
            button.title = `使用吸色器選擇 ${colorName} 的顏色`;
        }
    }
    
    // Add eyedropper buttons to color picker containers
    function addEyedropperButtons() {
        console.log('Scanning for SillyTavern color picker containers...');
        
        let buttonsAdded = 0;
        
        // Find all flex-container elements within color-picker-block
        const colorPickerBlock = document.getElementById('color-picker-block');
        if (!colorPickerBlock) {
            console.log('Color picker block not found');
            return 0;
        }
        
        const flexContainers = colorPickerBlock.querySelectorAll('.flex-container');
        
        flexContainers.forEach(flexContainer => {
            // Check if this container has a toolcool-color-picker
            const colorPicker = flexContainer.querySelector('toolcool-color-picker');
            if (!colorPicker) return;
            
            // Check if eyedropper button already exists
            const existingButton = flexContainer.parentNode.querySelector('.eyedropper-btn[data-color-picker-id="' + colorPicker.id + '"]');
            if (existingButton) return;
            
            // Create and insert eyedropper button before the flex-container
            const button = createEyedropperButton(flexContainer);
            if (button) {
                flexContainer.parentNode.insertBefore(button, flexContainer);
                buttonsAdded++;
                console.log(`Added eyedropper button for ${colorPicker.id}`);
            }
        });
        
        if (buttonsAdded > 0) {
            console.log(`Added ${buttonsAdded} eyedropper buttons`);
        }
        
        return buttonsAdded;
    }
    
    // Initialize the extension
    function initialize() {
        console.log('Initializing SillyTavern Theme Color Picker...');
        
        // Multiple initialization attempts to handle dynamic loading
        setTimeout(() => addEyedropperButtons(), 1000);
        setTimeout(() => addEyedropperButtons(), 3000);
        setTimeout(() => addEyedropperButtons(), 5000);
        
        // DOM change observer
        const observer = new MutationObserver((mutations) => {
            let shouldRescan = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.matches && (
                                node.matches('#color-picker-block') ||
                                node.matches('.flex-container') ||
                                node.matches('toolcool-color-picker') ||
                                node.matches('.inline-drawer-content')
                            )) {
                                shouldRescan = true;
                            }
                            
                            if (node.querySelector && (
                                node.querySelector('#color-picker-block') ||
                                node.querySelector('toolcool-color-picker') ||
                                node.querySelector('.flex-container')
                            )) {
                                shouldRescan = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRescan) {
                setTimeout(addEyedropperButtons, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });
        
        // Listen for theme color section opening
        $(document).on('click', '.inline-drawer-toggle', function() {
            const header = $(this);
            if (header.find('span[data-i18n="Theme Colors"]').length > 0) {
                setTimeout(addEyedropperButtons, 300);
            }
        });
        
        // Listen for settings panel opening
        $(document).on('click', '.user_stats_button, [data-i18n*="theme"], [class*="theme"]', function() {
            setTimeout(addEyedropperButtons, 500);
        });
        
        // Regular periodic check
        setInterval(addEyedropperButtons, 30000);
        
        console.log('SillyTavern Theme Color Picker initialized');
    }
    
    // ESC key to cancel color picking
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPickingColor && activeButton) {
            console.log('Color picking cancelled by ESC key');
            isPickingColor = false;
            resetButton(activeButton);
            activeButton = null;
        }
    });
    
    // Start initialization
    initialize();
});
