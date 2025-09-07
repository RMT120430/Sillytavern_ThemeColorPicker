// Theme Color Picker Extension for SillyTavern
(() => {
    'use strict';
    
    let isPickingColor = false;
    let currentColorInput = null;
    let observer = null;
    
    // 更新的主題顏色輸入選擇器
    const COLOR_INPUTS = [
        'input[id*="main-text-color"]',
        'input[id*="italics-color"]', 
        'input[id*="underline-color"]',
        'input[id*="quote-color"]',
        'input[id*="shadow-color"]',
        'input[id*="chat-bg-color"]',
        'input[id*="ui-bg-color"]',
        'input[id*="ui-border-color"]',
        'input[id*="user-mes-blur-tint"]',
        'input[id*="bot-mes-blur-tint"]',
        // 更通用的選擇器
        '.themes_settings input[type="color"]',
        '#themes input[type="color"]',
        '.theme-colors input[type="color"]'
    ];
    
    function initExtension() {
        console.log('Theme Color Picker Extension loaded - v1.0.1');
        
        // 檢查 API 支援
        if (!checkApiSupport()) {
            return;
        }
        
        // 多重初始化策略
        setupEventListeners();
        
        // 立即嘗試添加
        setTimeout(() => addColorPickers(), 100);
        setTimeout(() => addColorPickers(), 500);
        setTimeout(() => addColorPickers(), 1000);
        
        // 設置 DOM 變化監聽器
        setupDOMObserver();
    }
    
    function setupEventListeners() {
        try {
            const { eventSource, event_types } = SillyTavern.getContext();
            
            if (eventSource && event_types) {
                eventSource.on(event_types.APP_READY, () => {
                    console.log('APP_READY event fired');
                    setTimeout(() => addColorPickers(), 200);
                });
                
                eventSource.on(event_types.SETTINGS_UPDATED, () => {
                    console.log('SETTINGS_UPDATED event fired');
                    setTimeout(() => addColorPickers(), 200);
                });
            }
        } catch (error) {
            console.log('SillyTavern context not available yet, using fallback');
        }
        
        // 備用事件監聽器
        document.addEventListener('click', (e) => {
            if (e.target.closest('.themes_settings') || e.target.closest('#themes')) {
                setTimeout(() => addColorPickers(), 100);
            }
        });
    }
    
    function setupDOMObserver() {
        // 清理舊的觀察器
        if (observer) {
            observer.disconnect();
        }
        
        observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // ELEMENT_NODE
                            if (node.matches && (
                                node.matches('input[type="color"]') ||
                                node.querySelector && node.querySelector('input[type="color"]') ||
                                node.matches('.themes_settings') ||
                                node.matches('#themes')
                            )) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldUpdate) {
                setTimeout(() => addColorPickers(), 50);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    function addColorPickers() {
        let addedCount = 0;
        
        // 使用更廣泛的選擇器搜索
        const allColorInputs = document.querySelectorAll('input[type="color"]');
        
        allColorInputs.forEach(colorInput => {
            if (colorInput && !colorInput.nextElementSibling?.classList.contains('color-picker-btn')) {
                // 檢查是否在主題設定區域
                const themesContainer = colorInput.closest('.themes_settings, #themes, .theme-colors');
                if (themesContainer || COLOR_INPUTS.some(selector => colorInput.matches(selector.replace(/input\[id\*="([^"]+)"\]/, '#$1')))) {
                    addPickerButton(colorInput);
                    addedCount++;
                }
            }
        });
        
        // 也嘗試特定選擇器
        COLOR_INPUTS.forEach(selector => {
            try {
                const colorInputs = document.querySelectorAll(selector);
                colorInputs.forEach(colorInput => {
                    if (colorInput && !colorInput.nextElementSibling?.classList.contains('color-picker-btn')) {
                        addPickerButton(colorInput);
                        addedCount++;
                    }
                });
            } catch (error) {
                // 忽略選擇器錯誤
            }
        });
        
        if (addedCount > 0) {
            console.log(`Added ${addedCount} color picker buttons`);
        }
    }
    
    function addPickerButton(colorInput) {
        const pickerBtn = document.createElement('button');
        pickerBtn.className = 'color-picker-btn fa-solid fa-eye-dropper menu_button';
        pickerBtn.title = '使用滴管工具選取螢幕顏色';
        pickerBtn.type = 'button';
        pickerBtn.setAttribute('data-i18n', '[title]Use eyedropper to pick screen color');
        
        // 設置樣式確保可見性
        pickerBtn.style.cssText = `
            margin-left: 5px !important;
            padding: 5px 8px !important;
            min-width: 32px;
            height: 32px;
            border: 1px solid #666;
            background-color: #444;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            vertical-align: middle;
            font-size: 14px;
        `;
        
        pickerBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            startColorPicking(colorInput);
        };
        
        // 嘗試不同的插入方式
        if (colorInput.parentNode) {
            // 方法 1: 插入到父節點
            colorInput.parentNode.insertBefore(pickerBtn, colorInput.nextSibling);
        } else if (colorInput.parentElement) {
            // 方法 2: 插入到父元素
            colorInput.parentElement.appendChild(pickerBtn);
        }
        
        console.log('Added picker button for:', colorInput.id || colorInput.className);
    }
    
    async function startColorPicking(colorInput) {
        if (!window.EyeDropper) {
            showMessage('您的瀏覽器不支援滴管工具', 'error');
            return;
        }
        
        if (isPickingColor) {
            return;
        }
        
        currentColorInput = colorInput;
        isPickingColor = true;
        
        // 更新按鈕狀態
        const pickerBtn = colorInput.nextElementSibling;
        if (pickerBtn && pickerBtn.classList.contains('color-picker-btn')) {
            pickerBtn.classList.add('picking');
        }
        
        try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            
            if (result.sRGBHex) {
                // 設置顏色到輸入框
                colorInput.value = result.sRGBHex;
                
                // 觸發多個事件確保 SillyTavern 更新
                ['input', 'change', 'blur'].forEach(eventType => {
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
            
            // 恢復按鈕狀態
            const pickerBtn = colorInput.nextElementSibling;
            if (pickerBtn && pickerBtn.classList.contains('color-picker-btn')) {
                pickerBtn.classList.remove('picking');
            }
        }
    }
    
    function showMessage(message, type = 'info') {
        // 嘗試使用 SillyTavern 的通知系統
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            // 備用通知方法
            console.log(`[Theme Color Picker] ${message}`);
            alert(message);
        }
    }
    
    function checkApiSupport() {
        if (!window.EyeDropper) {
            console.warn('EyeDropper API not supported in this browser');
            showMessage('您的瀏覽器不支援滴管工具。請使用 Chrome 95+ 或 Edge 95+', 'warning');
            return false;
        }
        return true;
    }
    
    // 多重初始化策略
    function safeInit() {
        try {
            initExtension();
        } catch (error) {
            console.error('Extension initialization error:', error);
            setTimeout(safeInit, 1000); // 重試
        }
    }
    
    // 根據不同的載入狀態初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInit);
    } else {
        safeInit();
    }
    
    // 額外的初始化嘗試
    setTimeout(safeInit, 100);
    setTimeout(safeInit, 500);
    setTimeout(safeInit, 2000);
    
    // 當視窗獲得焦點時重新檢查
    window.addEventListener('focus', () => {
        setTimeout(() => addColorPickers(), 200);
    });
    
})();
