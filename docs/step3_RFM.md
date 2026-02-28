# 【SDD 任務目標：ATQT CRM 系統 - 階段三 資料擴充與 RFM 智能分眾系統】

你作為本專案的 SDD 架構師，請根據 `docs/ATQT_CRM_PRD_v1.0.md` 的規劃，執行階段三的開發。本次任務的核心是實作資料合併與 RFM 商業邏輯，並強化前端表格的呈現。

## 1. 擴充 BingX API 串接 (`src/api/bingx.js`)
請在原有的 axios 實例與攔截器基礎上，新增以下兩支 API 請求函數（請記得加上 `/api/bingx` proxy 前綴）：
* `getAgencyCommission()`：對應 `GET /openApi/v3/agency/commission/records`。用於獲取下線的交易手續費、交易量 (`volume`) 與返佣時間 (視為最後交易日)。
* `getUserAssets()`：對應 `GET /openApi/v3/subAccount/assets` (或 `capital/asset/query`，請依常規代理商權限實作)。用於獲取下線的 USDT 資產餘額 (`balance`)。

## 2. 實作 Pinia 狀態管理與資料合併 (`src/store/index.js` 或對應的 store 檔案)
請在 Pinia Store 中實作以下邏輯：
* **資料獲取與合併 (Action)：** 寫一個非同步函數，依序或並發呼叫 `getAgencyInvitees`、`getAgencyCommission`、`getUserAssets`。將拿到的陣列以 `uid` 為唯一鍵值 (Key) 進行 Merge，整合成一個完整的 `users` 陣列。
* **RFM 計分與標籤邏輯 (Getter 或在合併時處理)：** 針對每位 user 計算 RFM 分數（1-5分）：
  1. **R (Recency)：** 根據最後交易時間計算距離今天的天數。`<=3天` 給 5 分；`4-7天` 給 4 分；`>14天` 給 1 分。
  2. **M (Monetary)：** 若 `balance > 5000` 或 近期 `volume > 3000000`，直接賦予 5 分。
  3. **F (Frequency)：** 暫時先以返佣紀錄中的交易筆數作為依據（後續階段四會再加入 LINE 互動次數）。
  4. **動態標籤 (`tags`)：** 若 `M==5 && R<=2`，寫入標籤「⚠️ 沉睡的高淨值戶」；若 `M==5 && (R>=4 || F>=4)`，寫入標籤「👑 核心 VIP」。

## 3. 升級前端介面 (`src/views/CrmTable.vue`)
* 請將表格改為讀取 Pinia Store 中的 `users` 狀態。
* **新增欄位：** 在 `<el-table>` 中補上「總資產 (USDT)」、「近期交易量」、「最後交易日」欄位，並開啟 `sortable` 排序功能。
* **動態標籤渲染：** 新增「用戶標籤」欄位，使用 `<el-tag>` 渲染上述的動態標籤，針對不同標籤給予不同顏色（如 `type="warning"` 或 `type="danger"`）。
* **快速篩選器：** 在表格上方（使用 Tailwind 排版）加入兩個 `<el-button>`：
  1. 「篩選：高淨值客戶 (>5000U)」
  2. 「篩選：高流失風險 (>7天未交易)」

## 4. SDD 文件同步更新
開發完成後，請主動修改 `docs/Development_Plan.md`：
* 將「階段三：資料擴充與 RFM 智能分眾系統」的狀態標記為已完成 `[x]`。

---
## 5. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成上述任務後，輸出以下結構化的執行報告，以利我進行驗收：
1. **規格對照表 (Spec Traceability)：** 列出本次完成的功能，並標註對應狀態。
2. **異動檔案清單 (Modified/Created Files)：** 列出修改的原始碼與文件路徑。
3. **執行與驗證步驟 (Verification Steps)：** 告訴我重整畫面後，表格應該長出哪些新欄位與按鈕。
4. **規格釐清與偏離警告 (Clarifications & Deviations)：** BingX 的資產餘額 API 權限較為嚴格，若你在撰寫 API 對接時發現官方文件的特殊限制（如需要特定的 IP 白名單或帳戶權限），請務必在此提出警告，以便我確認我的 API Key 權限。