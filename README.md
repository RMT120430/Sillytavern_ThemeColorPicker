# Sillytavern_ThemeColorPicker Extension

為 SillyTavern 的 Theme Colors 設定添加滴管工具，可直接從螢幕上吸取顏色。

## 功能特色

- 在所有主題色彩設定旁添加滴管按鈕
- 支援直接從螢幕任何位置選取顏色
- 自動更新顏色值並觸發 SillyTavern 的色彩變更
- 支援所有主題色彩項目：
  - Main Text
  - Italics Text  
  - Underlined Text
  - Quote Text
  - Text Shadow
  - Chat Background
  - UI Background
  - UI Border
  - User Message
  - AI Message

## 系統需求

- Chrome 95+ 或 Microsoft Edge 95+
- 支援 EyeDropper API 的現代瀏覽器
- SillyTavern 1.0.0+

## 安裝方法

### 從 GitHub 安裝（推薦）

1. 開啟 SillyTavern
2. 點擊右上角的擴展圖示（堆疊方塊）
3. 點擊「Download Extensions & Assets」
4. 在「Install Extension」區域輸入：
   ```
   https://github.com/RMT120430/Sillytavern_ThemeColorPicker
   ```
5. 點擊「Download」
6. 重新整理頁面或重啟 SillyTavern

### 手動安裝

1. 下載本擴展的所有文件
2. 在 SillyTavern 資料夾中找到：
   - `data/default-user/extensions/third-party/` （所有用戶安裝）
   - 或 `data/<your-user>/extensions/` （單一用戶安裝）
3. 建立資料夾 `theme-color-picker`
4. 將所有文件放入該資料夾
5. 重新整理頁面

## 使用說明

1. 進入 SillyTavern 的 User Settings
2. 選擇「UI Customization」標籤
3. 在「Theme Colors」區域，你會看到每個顏色輸入框旁邊都有滴管圖示
4. 點擊滴管按鈕開始選取顏色
5. 游標會變成十字線，點擊螢幕上任何位置選取該處的顏色
6. 顏色會自動套用到對應的主題設定

## 注意事項

- 此功能需要現代瀏覽器支援
- Firefox 瀏覽器目前不支援 EyeDropper API
- 選取顏色時需要用戶權限確認
- 顏色變更會立即生效並保存到當前主題

## 故障排除

**滴管按鈕沒有出現**
- 確認擴展已正確安裝並啟用
- 重新整理頁面或重啟 SillyTavern

**點擊滴管按鈕沒有反應**
- 檢查瀏覽器是否支援 EyeDropper API
- 嘗試使用 Chrome 或 Edge 瀏覽器

**顏色選取後沒有套用**
- 確認已點擊螢幕選取顏色
- 檢查 SillyTavern 主題設定是否正常

## 授權條款

AGPLv3 License

## 版本歷史


- v1.0.0 - 初始版本，支援所有主題色彩滴管功能
