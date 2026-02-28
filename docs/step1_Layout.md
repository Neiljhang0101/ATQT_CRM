# 任務目標：ATQT CRM 系統 - 階段一專案初始化與基礎 Layout 開發

你現在是一位資深前端架構師。請根據以下指示，在我的本機端環境初始化一個全新的 Vue 3 單頁式應用（SPA），作為 ATQT 社群 CRM 系統的基礎骨架。
# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是在「規格驅動開發 (SDD)」框架下工作的 AI 架構師。請嚴格遵守以下四點原則：
1. **規格即真理 (Spec is Truth)：** 在撰寫任何程式碼前，必須仔細閱讀並對齊我提供的 PRD 或階段目標。所有實作必須 100% 貼合規格定義。
2. **禁止擅自加戲 (No Hallucination/Over-engineering)：** 若 PRD 中未提及特定的 UI 元件、欄位、或錯誤處理邏輯，**絕對不要自己發明或預設**。若遇到規格定義模糊或技術衝突，請立即暫停並向我提出「釐清問題 (Clarification Questions)」。
3. **雙向追蹤 (Traceability)：** 在關鍵程式碼的註解中，請標明該段邏輯是對應到 PRD 的哪一個章節（例如：`// Ref: PRD 3.2 RFM 運算邏輯`）。
4. **驗收驅動 (Test-Driven by Spec)：** 開發結束前，必須拿著 PRD 的驗收標準，逐條檢查自己的程式碼是否完全達成。
---
## 1. 專案初始化與套件安裝
請使用 Vite 建立 Vue 3 專案，並安裝以下核心依賴：
* 核心框架：`vue`, `vue-router`, `pinia`
* UI 與樣式：`element-plus`, `tailwindcss` (請配置為 Tailwind CSS v4), `@element-plus/icons-vue`
* API 與圖表：`axios`, `echarts`, `vue-echarts`

## 2. 目錄結構與架構設置
請建立以下標準化目錄結構，並完成基礎配置：
* `src/router/index.js`：配置四個主要頁面的空路由 (`/dashboard`, `/crm`, `/radar`, `/campaigns`)。
* `src/store/index.js`：初始化 Pinia，並建立一個名為 `useCrmStore` 的空 Store。
* `src/api/bingx.js`：建立 axios 實例，預留準備對接 BingX API 的架構（先不寫具體邏輯，只需建立 axios 基礎 interceptor 即可）。
* `src/views/`：建立四個對應的空 Vue 元件 (`Dashboard.vue`, `CrmTable.vue`, `Radar.vue`, `Campaigns.vue`)。

## 3. 實作 RWD 響應式後台 Layout (核心任務)
請在 `src/App.vue` 或建立 `src/layout/MainLayout.vue`，使用 Element Plus 與 Tailwind CSS 實作現代化管理介面：
* **側邊欄 (Sidebar)：**
  * 包含四個導覽節點：戰情大盤 (Dashboard)、客戶總表 (CRM)、痛點雷達 (Radar)、活動追蹤 (Campaigns)。
  * RWD 需求：桌機版保持展開；手機版 (< 768px) 預設隱藏，可透過頂部漢堡選單 (Hamburger Icon) 展開。
* **頂部導覽 (Header)：**
  * 左側放置收折按鈕與系統名稱「ATQT 社群 CRM」。需固定在頂部 (Sticky)。
* **主內容區 (Main Content)：**
  * 放置 `<router-view />`。背景設為淺灰色 (`bg-gray-50`)。

## 4. 執行與測試配置
請配置 `vite.config.js` 與 `tailwind.config.js` (若為 v4 則設定相應配置)，確保本機能順利啟動。

---
## 5. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成任務後，輸出以下結構化的執行報告，以利我進行 SDD 規格驗收：
1. **規格對照表 (Spec Traceability)：** 列出本次完成的功能，並明確標註對應到 PRD 的哪個章節。（格式：`[PRD X.X] 功能名稱 - 狀態: 完成`）
2. **異動檔案清單 (Modified/Created Files)：** 列出建立或修改的檔案路徑。
3. **安裝套件清單 (Dependencies)：** 若有新增安裝套件，請列出名稱與版本。
4. **執行與驗證步驟 (Verification Steps)：** 告訴我輸入什麼啟動指令，以及我應該在畫面上看到什麼結果。
5. **規格釐清與偏離警告 (Clarifications & Deviations)：** - 若你在實作中發現 PRD 有遺漏（例如 BingX API 回傳格式與預期不同），請在此列出需要我決策的問題。
   - 若因技術限制必須偏離原定規格，請詳述原因與你的替代方案。