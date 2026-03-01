# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是「規格驅動開發 (SDD)」框架下的 AI 架構師。請嚴格遵守以下原則：
1. **規格即真理 (Spec is Truth)：** 所有實作必須 100% 貼合規格定義。
2. **驗收驅動 (Test-Driven by Spec)：** 開發結束前逐條檢查是否達成要求。

---

# 任務目標：ATQT CRM 系統 - 階段六 SQLite 本機資料庫與個人時間序列架構

為了支援後續「戰情儀表板」的高階同類群組分析與走勢圖表，並兼顧「實體檔案可攜帶性」，我們將導入 WebAssembly 版的 SQLite (`sql.js`)，並實作「精確到單一用戶」的每週歷史紀錄追蹤。

## 1. 套件安裝與環境準備
* 執行 `npm install sql.js localforage dayjs`。
* 配置 `sql-wasm.wasm` 於 Vite 的 `public/` 目錄中。
* 建立 `src/database/sqlite.js` 實作資料庫初始化與 WebAssembly 載入。

## 2. 定義關聯式資料表結構 (Relational Schema)
請在資料庫初始化時，建立以下兩張核心資料表：

### A. `customers` (主表：用戶最新狀態快照)
* 欄位：`uid` (TEXT PRIMARY KEY), `line_name` (TEXT), `official_email` (TEXT), `register_date` (TEXT), `first_deposit_time` (TEXT), `invite_type` (TEXT), `text_notes` (TEXT), `last_updated` (TEXT)。

### B. `user_weekly_stats` (明細表：每個用戶的每週歷史紀錄)
* 說明：儲存每個用戶在特定週數的表現，用於繪製走勢圖。
* 欄位：
  * `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
  * `uid` (TEXT) - 關聯至 customers 表
  * `year_week` (TEXT) - 週數標籤 (如 '2026-W09')
  * `record_date` (TEXT) - 匯入日期時間
  * `total_assets` (REAL) - 當週總資產
  * `volume_weekly` (REAL) - 當週交易量
  * `commission_weekly` (REAL) - 當週手續費貢獻 (預留)
  * `community_interaction` (INTEGER) - 當週社群互動次數
  * `rfm_score` (INTEGER) - 當週 RFM 總分
  * `rfm_tag` (TEXT) - 當週 RFM 分眾標籤 (如 '核心VIP')
* 限制：建立聯合唯一索引 `UNIQUE(uid, year_week)`，確保同一個用戶在同一週只會有一筆紀錄（重複匯入時採 Upsert 覆蓋）。

## 3. 實作「每週戰情結算」與資料庫寫入邏輯
請在 Store 實作 `syncWeeklyData` Action：
* 當社群隊長確認本週資料與 XLSX 匯入無誤後，可點擊觸發。
* **邏輯：**
  1. 取得當前週數（如 `2026-W09`）。
  2. 遍歷當前前端狀態的所有用戶。
  3. 執行 SQLite 的 `INSERT OR REPLACE INTO customers` 更新主表。
  4. 執行 `INSERT OR REPLACE INTO user_weekly_stats`，將每個人的當週資產、RFM、互動度等動態數據寫入明細表。
* **防呆自動儲存：** 寫入完畢後，呼叫 `db.export()` 並存入 `localforage`，實現瀏覽器端持久化。

## 4. 實作 SQLite 實體檔案可攜式模組 (Import/Export)
* **匯出 (Export)：** UI 新增「📥 備份資料庫 (.sqlite)」按鈕，透過 Blob 下載完整的二進位檔案。
* **匯入 (Import)：** UI 新增 `<el-upload>` 供上傳 `.sqlite` 檔案。讀取 `ArrayBuffer` 後重新實例化資料庫並覆寫本機紀錄。

## 5. SDD 文件同步更新
1. **修改 PRD：** 將「SQLite WebAssembly 引擎」與「一對多關聯結構 (customers 1:N user_weekly_stats)」明確寫入規格。
2. **修改計畫表：** 標記階段六已完成 `[x]`。

---

## 6. 執行完畢後的輸出要求 (SDD Execution Report)
1. **異動檔案清單：** 列出修改的檔案與新建的 `sqlite.js`。
2. **SQL 語法驗證：** 請在報告中印出你建立 `user_weekly_stats` 時使用的 `CREATE TABLE` 原始語法，讓我確認欄位都有正確建立。
3. **WASM 載入確認：** 說明如何確保 Vite 開發與編譯環境都能抓到 `.wasm` 檔。