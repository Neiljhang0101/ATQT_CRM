# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是在「規格驅動開發 (SDD)」框架下工作的 AI 架構師。請嚴格遵守以下四點原則：
1. **規格即真理 (Spec is Truth)：** 在撰寫任何程式碼前，必須仔細閱讀並對齊我提供的 PRD 或階段目標。所有實作必須 100% 貼合規格定義。
2. **禁止擅自加戲 (No Hallucination/Over-engineering)：** 若 PRD 中未提及特定的 UI 元件或邏輯，絕對不要自己發明。遇到技術衝突，請立即向我提出釐清。
3. **雙向追蹤 (Traceability)：** 在關鍵程式碼的註解中，請標明該段邏輯是對應到 PRD 的哪一個章節。
4. **驗收驅動 (Test-Driven by Spec)：** 開發結束前，必須拿著 PRD 的驗收標準，逐條檢查程式碼是否完全達成。

---

# 任務目標：ATQT CRM 系統 - 階段四 UI Layout 視覺優化與樣式整合

我們目前的系統已經具備了基礎的資料串接能力，現在需要進行全面的「視覺翻新」。
我會在指令的最下方提供一份由 Stitch 產生的靜態 HTML 原始碼（包含儀表板與客戶資料頁的視覺風格）。請你吸取這份 HTML 的設計語彙，並用我們現有的 Vue 3 + Element Plus + Tailwind CSS v4 框架進行重構。

## 1. 視覺風格解析與全域配置 (Theme Extraction)
* 請仔細閱讀我提供的 HTML，提取其中的核心視覺元素（如：主色調、背景色 `bg-gray-*`、卡片陰影 `shadow-*`、圓角大小 `rounded-*`、間距與字體大小）。
* 若有需要，請在全局 CSS 或 Tailwind 配置中加入對應的自定義變數，確保全站風格統一。
* **【重要限制】：** 我們依然要保持使用 Element Plus 的核心組件（如 `<el-table>`, `<el-button>`, `<el-dialog>`），請利用 Tailwind 的 utility classes 或覆寫 Element Plus 的 CSS 變數，讓 Element Plus 組件的長相盡可能貼近 Stitch HTML 的高質感設計。

## 2. 儀表板視圖優化 (`src/views/Dashboard.vue`)
* 請參考 Stitch HTML 中儀表板的 Layout 結構（如頂部 KPI 數據卡片、圖表區塊的網格排列）。
* 使用 Tailwind Grid 或 Flex 重新排版 `Dashboard.vue`。目前若無真實圖表數據，請先保留排版框架與靜態假圖表/假數據，確保 RWD（手機版與桌機版）縮放時畫面不會跑版。

## 3. 客戶總表視圖優化 (`src/views/CrmTable.vue`)
* 請參考 Stitch HTML 中「客戶資料頁」的版面設計（如：頂部操作按鈕區、搜尋欄、標籤樣式）。
* 將這些優美的外觀設計套用到我們現有的 `<el-table>` 與周邊操作按鈕上。
* 特別注意 `<el-tag>` 的顏色與圓角，請盡量用 Tailwind 修飾成 HTML 範例中的精緻質感。

## 4. SDD 文件同步更新 (嚴格執行)
1. **修改 PRD：** 讀取 `docs/ATQT_CRM_PRD_v*.md`，在前端技術棧或介面設計章節中，註記已完成 UI 視覺升級。
2. **修改計畫表：** 讀取 `docs/Development_Plan.md`，將「UI Layout 視覺優化與 Stitch 樣式整合」列為階段四，後續原本的模組（如 LINE 情緒雷達、Firebase 等）依次順延。並將階段四標記為已完成 `[x]`。

---

## 5. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成任務後，輸出以下結構化的執行報告：
1. **規格對照表 (Spec Traceability)：** 列出本次完成的功能，並明確標註對應到 PRD 的章節。
2. **異動檔案清單 (Modified/Created Files)：** 列出修改的 View 元件與樣式設定檔。
3. **執行與驗證步驟 (Verification Steps)：** 告訴我重啟伺服器後，我應該去哪個路由查看翻新後的 Dashboard 與 CRM Table。
4. **規格釐清與偏離警告 (Clarifications & Deviations)：** 若 Stitch HTML 中有某些過於複雜的自定義特效，難以直接套用在 Element Plus 上，請明確告訴我你做了哪些妥協與替代方案（Trade-offs）。

---
### 👇 以下為提供參考的 Stitch HTML 原始碼 👇
[請在這裡貼上你的 HTML 原始碼]