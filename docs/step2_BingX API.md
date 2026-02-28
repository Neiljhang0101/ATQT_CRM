# 任務目標：ATQT CRM 系統 - 階段二 真實 BingX API 串接與客戶總表雛型

專案基礎架構已完成。現在我們要直接串接真實的 BingX API，請嚴格按照以下步驟執行，處理跨網域與 API 簽名問題：
# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是在「規格驅動開發 (SDD)」框架下工作的 AI 架構師。請嚴格遵守以下四點原則：
1. **規格即真理 (Spec is Truth)：** 在撰寫任何程式碼前，必須仔細閱讀並對齊我提供的 PRD 或階段目標。所有實作必須 100% 貼合規格定義。
2. **禁止擅自加戲 (No Hallucination/Over-engineering)：** 若 PRD 中未提及特定的 UI 元件、欄位、或錯誤處理邏輯，**絕對不要自己發明或預設**。若遇到規格定義模糊或技術衝突，請立即暫停並向我提出「釐清問題 (Clarification Questions)」。
3. **雙向追蹤 (Traceability)：** 在關鍵程式碼的註解中，請標明該段邏輯是對應到 PRD 的哪一個章節（例如：`// Ref: PRD 3.2 RFM 運算邏輯`）。
4. **驗收驅動 (Test-Driven by Spec)：** 開發結束前，必須拿著 PRD 的驗收標準，逐條檢查自己的程式碼是否完全達成。
---
## 1. 環境變數與加密依賴安裝
* 請安裝 `crypto-js` 套件，用於處理 BingX API 要求的 HMAC SHA256 加密簽名。
* 請在專案根目錄建立 `.env.local` 檔案模板（請確保將 `.env.local` 加入 `.gitignore` 中），並預留以下變數，值先留空讓我後續手動填寫：
  `VITE_BINGX_API_KEY=`
  `VITE_BINGX_SECRET_KEY=`
  `VITE_BINGX_BASE_URL=https://open-api.bingx.com`

## 2. 解決 CORS 跨網域：配置 Vite Proxy
* 請修改 `vite.config.js`，設定 `server.proxy`。
* 將所有以 `/api/bingx` 開頭的請求，代理轉發至 `https://open-api.bingx.com`，並設定 `changeOrigin: true`。記得要配置 `rewrite` 路徑，確保實際發出的 API URL 是正確的。

## 3. 實作 API 攔截器與簽名邏輯 (核心任務)
請修改 `src/api/bingx.js` 中的 Axios 實例：
* **Request Interceptor (請求攔截器)：** 1. 獲取當前時間戳 `timestamp`。
  2. 將請求參數 (Query/Body) 按照 BingX 官方文件要求與 `timestamp` 進行字串拼接。
  3. 使用 `crypto-js` 的 `HmacSHA256` 搭配 `import.meta.env.VITE_BINGX_SECRET_KEY` 進行簽名，生成 `signature`。
  4. 將 API Key 放入 Request Header 的 `X-BX-APIKEY` 中。
* **封裝第一支 API 函數：** 建立 `getAgencyInvitees()` 函數，對應 GET `/openApi/v3/agency/invitees` (注意要透過 proxy 發送，路徑應包含 `/api/bingx`)，用來獲取代理商下線名單。

## 4. 畫面渲染：CrmTable.vue
* 請在 `src/views/CrmTable.vue` 中引入 `getAgencyInvitees` API。
* 在組件 `onMounted` 階段發送請求，並將回傳的真實資料存入 Vue 的 `ref` 變數中。
* 使用 Element Plus 的 `<el-table>` 與 `<el-table-column>`，將拿到的真實資料（至少包含 `uid` 與 `registerTime`）渲染在畫面上。
* 請加入錯誤處理機制 (Try-Catch)：若發生 API 錯誤（例如簽名失敗或 401 未授權），請使用 `ElMessage.error` 在畫面上提示錯誤訊息。

---
## 5. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成任務後，輸出以下結構化的執行報告，以利我進行 SDD 規格驗收：
1. **規格對照表 (Spec Traceability)：** 列出本次完成的功能，並明確標註對應到 PRD 的哪個章節。（格式：`[PRD X.X] 功能名稱 - 狀態: 完成`）
2. **異動檔案清單 (Modified/Created Files)：** 列出建立或修改的檔案路徑。
3. **安裝套件清單 (Dependencies)：** 若有新增安裝套件，請列出名稱與版本。
4. **執行與驗證步驟 (Verification Steps)：** 告訴我輸入什麼啟動指令，以及我應該在畫面上看到什麼結果。
5. **規格釐清與偏離警告 (Clarifications & Deviations)：** - 若你在實作中發現 PRD 有遺漏（例如 BingX API 回傳格式與預期不同），請在此列出需要我決策的問題。
   - 若因技術限制必須偏離原定規格，請詳述原因與你的替代方案。