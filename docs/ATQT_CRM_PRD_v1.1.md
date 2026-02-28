# 【SDD 任務目標：ATQT CRM 系統 - 階段三 客戶資料建檔系統與 RFM 擴充】

你作為本專案的 SDD 架構師，請根據 `docs/ATQT_CRM_PRD_v1.0.md` 的規劃，並納入本次新增的「客戶資料建檔」需求，執行階段三開發。

## 1. 擴充 Pinia 資料庫結構 (State Schema)
請在 `src/store/` (如 `useCrmStore`) 中，將客戶資料的結構擴充為以下規格，以支援手動與自動建檔：
* `uid`: BingX UID (字串，唯一值)
* `email`: 官網註冊信箱 (字串)
* `line_id`: LINE ID (字串)
* `line_name`: LINE 暱稱 (字串)
* `contact_info`: 其他聯絡方式/手機 (字串)
* `balance`: 總資產 USDT (數字，來自 API)
* `volume_30d`: 近期交易量 (數字，來自 API)
* `last_trade_date`: 最後交易日 (字串，來自 API)
* `tags`: 標籤陣列 (字串陣列)

## 2. 實作「雙引擎」建檔邏輯 (Actions)
請在 Store 中實作以下兩種建立客戶資料的邏輯：
* **自動建檔 (API 驅動)：** 當呼叫 `getAgencyInvitees` API 獲取下線名單時，比對現有 Store 中的資料。若發現新的 UID 不在現有資料庫中，請自動建立一筆新客戶資料（UID 填入，其餘手動欄位預設為空字串）。
* **手動建檔 (UI 驅動)：** 實作一個 `addCustomer(customerData)` 的 Action，允許透過前端表單傳入完整的客戶物件，並推入 (push) 狀態陣列中。

## 3. 擴充 BingX API 串接與 RFM 邏輯 (`src/api/bingx.js` & Store)
* 新增 `getAgencyCommission()` 與 `getUserAssets()` API 函數 (請使用 `/api/bingx` proxy)。
* 在 Store 中撰寫資料合併邏輯：將 API 抓到的 `balance` 與 `volume` 更新到對應 UID 的客戶資料上。
* 實作 RFM 動態標籤運算：若 `balance > 5000` 加上「高淨值」標籤；若距最後交易日 > 7 天加上「流失風險」標籤等。

## 4. 升級前端介面 (`src/views/CrmTable.vue`)
* **手動新增表單：** 在表格頂部加入「+ 新增客戶資料」的 `<el-button>`。點擊後彈出 `<el-dialog>` 與 `<el-form>`。表單需包含：官網註冊信箱、LINE ID、LINE 暱稱、聯絡方式、BingX UID。填寫送出後呼叫 Store 的手動建檔 Action。
* **表格欄位擴充：** 將 `<el-table>` 的欄位擴充，除了顯示 UID，也要能顯示「LINE 暱稱」、「官網信箱」、「總資產」、「近期交易量」與「動態標籤 (`<el-tag>`)」。
* 確保表格在手機版 (RWD) 能隱藏次要欄位，保持畫面整潔。

## 5. SDD 文件同步更新 (重要)
開發完成後，請主動更新專案文件：
1. **修改 PRD：** 打開 `docs/ATQT_CRM_PRD_v1.0.md`，將本次新增的「客戶資料建檔系統（包含信箱、LINE ID、聯絡方式等欄位）」寫入核心模組的規格中，並將檔名升級為 `v1.1`。
2. **修改進度表：** 打開 `docs/Development_Plan.md`，將「階段三」標記為已完成 `[x]`。

---
## 6. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成上述任務後，輸出以下執行報告：
1. **規格對照表 (Spec Traceability)：** 列出本次完成的功能（包含雙引擎建檔與表單）。
2. **異動檔案清單 (Modified/Created Files)：** 列出修改的原始碼與文件路徑。
3. **執行與驗證步驟 (Verification Steps)：** 告訴我重整畫面後，點擊「新增客戶」應該看到什麼表單。
4. **規格釐清與偏離警告 (Clarifications & Deviations)：** 若在實作 API 自動建檔比對邏輯時遇到效能考量或唯一鍵值 (Key) 衝突問題，請在此提出。

---

## ✅ 階段四補充：UI Layout 視覺優化與 Stitch 樣式整合（已完成 2026-02-28）

### 前端技術棧更新
- **字型：** 採用 Inter（Google Fonts）作為全站英數字型，透過 `index.html` `<link>` 注入。
- **圖示：** 引入 Google Material Symbols Outlined 字型圖示，補充側邊欄與 Dashboard 視覺。
- **Tailwind CSS v4 主題：** 在 `style.css` 以 `@theme` 指令定義色票 (`--color-primary`, `--color-success` 等)，全站一致。
- **Element Plus CSS 變數覆寫：** 在 `style.css` `:root` 統一覆寫 `--el-color-primary`, `--el-font-family`, `--el-border-radius-base` 等，使 `<el-table>`, `<el-tag>`, `<el-pagination>` 外觀貼近 Stitch 設計。

### 介面設計規範（對應 Stitch HTML）
| 元素 | 設計值 |
|---|---|
| 主色調 | `#409EFF`（Element Plus primary blue）|
| 背景色 | `#f5f7fa` |
| 卡片背景 | `#ffffff`，`border:1px solid #e4e7ed`，`box-shadow: 0 0 12px rgba(0,0,0,0.05)` |
| 側邊欄 | 白底 `#ffffff`，寬 `256px`，右側分隔線 `#e4e7ed` |
| 圓角 | `6px`（Element Plus 組件）; 卡片 `rounded-lg` = `8px` |
| 字型大小 | 標題 `text-xl` / 標籤 `text-sm 14px` / 次要 `text-xs 12px` |

### 視圖更新摘要
- **`MainLayout.vue`**：深色側邊欄改為白底亮色主題，導覽圖示改用 Material Symbols。
- **`Dashboard.vue`**：新增 4 大 KPI 卡片（含色彩圖示）、SVG 趨勢折線圖佔位、最近動態列表、快速入口面板；RWD 4欄 → 2欄 → 單欄。
- **`CrmTable.vue`**：新增白底篩選卡片（搜尋框 + 分眾按鈕 + 來源切換）；表格標頭 `#f5f7fa` 底色；來源/標籤改為 inline-style Pill Badge 取代 `<el-tag>`。
