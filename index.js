// SillyTavern Theme Color Picker Extension
console.log('Theme Color Picker Extension: Starting initialization');

jQuery(async () => {
    'use strict';
    
    console.log('Theme Color Picker Extension: DOM ready');
    
    // 檢查 EyeDropper API 支援
    if (!window.EyeDropper) {
        console.warn('EyeDropper API not supported in this browser');
        if (typeof toastr !== 'undefined') {
            toastr.warning('此瀏覽器不支援滴管工具 API，請使用 Chrome 或 Edge');
        }
        return;
    }
    
    let isPickingColor = false;
    let activeButton = null;
    
    // 顏色格式轉換工具
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
    
    // 更新主題顏色
    function updateThemeColor(colorElement, newColor) {
        console.log('Updating theme color:', newColor, 'for element:', colorElement);
        
        // 直接更新顏色顯示元素
        if (colorElement.style) {
            colorElement.style.backgroundColor = newColor;
        }
        
        // 尋找關聯的隱藏 input 或設定值
        const colorName = getColorNameFromElement(colorElement);
        if (colorName) {
            updateThemeColorBySetting(colorName, newColor);
        }
        
        // 觸發 SillyTavern 設定保存
        setTimeout(() => {
            if (typeof saveSettingsDebounced === 'function') {
                saveSettingsDebounced();
            } else if (typeof saveSettings === 'function') {
                saveSettings();
            }
            
            // 強制重新應用主題
            if (typeof applyTheme === 'function') {
                applyTheme();
            }
            
            // 觸發自定義事件
            $(document).trigger('themeColorChanged', [colorName, newColor]);
        }, 100);
    }
    
    // 從元素獲取顏色名稱
    function getColorNameFromElement(element) {
        // 查找父級容器中的文字標籤
        const container = element.closest('.color-picker-block, .inline-drawer, .user-settings-block');
        if (!container) return null;
        
        // 尋找文字標籤
        const textNodes = container.querySelectorAll('*');
        for (let node of textNodes) {
            const text = node.textContent?.trim();
            if (text && colorNameMapping[text]) {
                return text;
            }
        }
        
        // 從 DOM 結構推斷
        const allColorElements = container.querySelectorAll('[style*="background-color"]');
        const index = Array.from(allColorElements).indexOf(element);
        const colorNames = [
            'Main Text', 'Italics Text', 'Underlined Text', 'Quote Text',
            'Text Shadow', 'Chat Background', 'UI Background', 'UI Border',
            'User Message', 'AI Message'
        ];
        
        return colorNames[index] || null;
    }
    
    // 顏色名稱對應設定
    const colorNameMapping = {
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
    
    // 根據設定名稱更新顏色
    function updateThemeColorBySetting(colorName, newColor) {
        const settingKey = colorNameMapping[colorName];
        if (!settingKey) return;
        
        // 更新全域設定（如果存在）
        if (typeof power_user !== 'undefined' && power_user.themes) {
            const currentTheme = power_user.themes[power_user.theme] || {};
            currentTheme[settingKey] = newColor;
            power_user.themes[power_user.theme] = currentTheme;
        }
        
        // 更新 CSS 變數
        const cssVarMap = {
            'main_text_color': '--SmartThemeMainTextColor',
            'italics_text_color': '--SmartThemeItalicsColor',
            'underlined_text_color': '--SmartThemeUnderlinedColor',
            'quote_text_color': '--SmartThemeQuoteColor',
            'text_shadow_color': '--SmartThemeTextShadowColor',
            'chat_bg_color': '--SmartThemeChatBackgroundColor',
            'ui_bg_color': '--SmartThemeUIBackgroundColor',
            'ui_border_color': '--SmartThemeUIBorderColor',
            'user_msg_color': '--SmartThemeUserMessageColor',
            'ai_msg_color': '--SmartThemeBotMessageColor'
        };
        
        const cssVar = cssVarMap[settingKey];
        if (cssVar) {
            document.documentElement.style.setProperty(cssVar, newColor);
            console.log(`Updated CSS variable ${cssVar} to ${newColor}`);
        }
    }
    
    // 創建滴管按鈕
    function createEyedropperButton(targetElement) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'eyedropper-btn';
        button.innerHTML = '🎨';
        button.title = '使用滴管工具選取螢幕顏色';
        
        // 按鈕樣式
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
        
        // 懸停效果
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
        
        // 點擊事件
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isPickingColor) return;
            
            await startColorPicking(button, targetElement);
        });
        
        return button;
    }
    
    // 開始顏色選取
    async function startColorPicking(button, targetElement) {
        if (isPickingColor) return;
        
        try {
            isPickingColor = true;
            activeButton = button;
            
            // 更新按鈕狀態
            button.style.background = '#ff4444';
            button.style.borderColor = '#ff2222';
            button.innerHTML = '⏳';
            button.title = '點擊螢幕選取顏色... (ESC 取消)';
            button.style.opacity = '1';
            
            if (typeof toastr !== 'undefined') {
                toastr.info('請點擊螢幕選取顏色', '滴管工具已啟動');
            }
            
            console.log('Starting eyedropper...');
            
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            
            if (result && result.sRGBHex) {
                const selectedColor = result.sRGBHex.toLowerCase();
                console.log('Color selected:', selectedColor);
                
                updateThemeColor(targetElement, selectedColor);
                
                if (typeof toastr !== 'undefined') {
                    toastr.success(`顏色已設定為 ${selectedColor.toUpperCase()}`);
                }
                
                // 成功狀態
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
                    toastr.info('顏色選取已取消');
                }
            } else {
                console.error('Color picking failed:', error);
                if (typeof toastr !== 'undefined') {
                    toastr.error('選色失敗: ' + error.message);
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
    
    // 重置按鈕狀態
    function resetButton(button) {
        if (button && button.parentNode) {
            button.style.background = 'rgba(0, 123, 255, 0.8)';
            button.style.borderColor = 'rgba(0, 123, 255, 1)';
            button.innerHTML = '🎨';
            button.title = '使用滴管工具選取螢幕顏色';
            button.style.opacity = '0.7';
            button.style.transform = 'scale(1)';
        }
    }
    
    // 添加滴管按鈕到顏色元素
    function addEyedropperButtons() {
        console.log('Scanning for SillyTavern color elements...');
        
        // 尋找主題顏色區塊
        const themeColorSections = [
            ...document.querySelectorAll('.color-picker-block'),
            ...document.querySelectorAll('[class*="color-picker"]'),
            ...document.querySelectorAll('.inline-drawer'),
            ...document.querySelectorAll('.user-settings-block')
        ];
        
        let buttonsAdded = 0;
        
        themeColorSections.forEach(section => {
            // 在每個區塊內尋找顏色顯示元素
            const colorElements = section.querySelectorAll('[style*="background-color"]:not(.eyedropper-btn)');
            
            colorElements.forEach(element => {
                // 跳過已經有按鈕的元素
                if (element.querySelector('.eyedropper-btn')) return;
                
                const computedStyle = window.getComputedStyle(element);
                const bgColor = computedStyle.backgroundColor;
                
                // 跳過透明或無效的背景色
                if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') return;
                
                const rect = element.getBoundingClientRect();
                // 只處理足夠大的顏色顯示元素
                if (rect.width >= 30 && rect.height >= 15) {
                    // 確保元素有相對定位
                    if (computedStyle.position === 'static') {
                        element.style.position = 'relative';
                    }
                    
                    const button = createEyedropperButton(element);
                    element.appendChild(button);
                    buttonsAdded++;
                    
                    console.log('Added eyedropper button to color element');
                }
            });
        });
        
        // 也檢查直接的顏色元素
        const directColorElements = document.querySelectorAll('.black.box, span[style*="background-color"]');
        directColorElements.forEach(element => {
            if (element.querySelector('.eyedropper-btn')) return;
            
            const rect = element.getBoundingClientRect();
            if (rect.width >= 20 && rect.height >= 15) {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.position === 'static') {
                    element.style.position = 'relative';
                }
                
                const button = createEyedropperButton(element);
                element.appendChild(button);
                buttonsAdded++;
            }
        });
        
        if (buttonsAdded > 0) {
            console.log(`Added ${buttonsAdded} eyedropper buttons`);
        }
        
        return buttonsAdded;
    }
    
    // 初始化
    function initialize() {
        console.log('Initializing SillyTavern Theme Color Picker...');
        
        // 延遲執行，確保 DOM 完全載入
        setTimeout(() => {
            addEyedropperButtons();
        }, 2000);
        
        // DOM 變化監聽
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
        
        // 監聽 SillyTavern 事件
        $(document).on('click', '.drawer-toggle, .inline_ctrls', function() {
            setTimeout(addEyedropperButtons, 300);
        });
        
        // 定期檢查
        setInterval(addEyedropperButtons, 10000);
        
        console.log('SillyTavern Theme Color Picker initialized');
    }
    
    // ESC 鍵取消
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPickingColor && activeButton) {
            console.log('Color picking cancelled by ESC');
            isPickingColor = false;
            resetButton(activeButton);
            activeButton = null;
        }
    });
    
    // 開始初始化
    initialize();
});
