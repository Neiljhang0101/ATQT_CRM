# ATQT CRM 系統：六階段開發計畫

**對應 PRD：** [ATQT_CRM_PRD_v1.1.md](./ATQT_CRM_PRD_v1.1.md)  
**最後更新：** 2026-03-01

---

## 階段一：環境建置與後台骨架 ✅ 已完成
**目標：建立一個乾淨、具備 RWD 的前端畫布。**
- [x] 初始化 Vue 3 + Vite 專案。
- [x] 安裝與配置 Tailwind CSS v4、Element Plus、Vue Router、Pinia。
- [x] 建立基礎路由 (`/crm`, `/radar`, `/campaigns`, `/dashboard`)。
- [x] 實作 RWD 響應式佈局 (Layout)：包含左側可收折的導覽列 (Sidebar) 與頂部狀態列 (Header)。
> **驗收結果：** `npm run dev` 正常啟動，RWD 滿版佈局正常。

---

## 階段二：真實 API 串接與客戶總表雛型 ✅ 已完成
**目標：解決本機端打真實 API 的兩大魔王（CORS 與加密），並呈現第一批 UID。**
- [x] 配置 `.env.local` 環境變數（舊帳號 + 新帳號各一組 Key/Secret）。
- [x] 修改 `vite.config.js` 設定 Proxy 代理，解決 CORS 問題。
- [x] 安裝 `crypto-js`，實作 BingX HMAC SHA256 簽名。
- [x] 封裝 `createBingxInstance()` 工廠函式，支援雙帳號獨立呼叫。
- [x] `<el-table>` 渲染真實 UID、帳號來源標籤、RFM 評分。
- [x] **[CR-002]** 傭金 API 改用純 `fetch()` 函式 `commissionFetch()`，繞過 axios 攔截器，解決 `recvWindow` 造成的 signature mismatch (code=100001)。
- [x] **[CR-002]** 同步按鈕合併為單一下拉選單（全部同步 / 下線名單 / 傭金明細 / 帳戶餘額）。
> **驗收結果：** 雙帳號並行同步，`Promise.allSettled` 任一失敗不中斷；傭金明細 `code: 0` 確認成功。

---

## 階段三：資料擴充與 RFM 智能分眾系統 ✅ 已完成
**目標：將資產與交易量併入客戶總表，讓系統自動打上分眾標籤。**
- [x] 開發 API 請求：獲取傭金紀錄 (`volume`, `lastTime`) 與下線名單內建帳戶餘額 (`balanceVolume`)。
- [x] **[CR-002]** `/openApi/v3/subAccount/assets` 對代理商帳號無權限 (code 100400)，改以下線名單 API 的 `balanceVolume` 欄位取得餘額。
- [x] **[CR-002]** 全欄位對應：`inviterSid`→`inviter_uid_code`、`directInvitation`→`invite_type`、`inviteCode`→`bound_invite_code`、`ownInviteCode`→`own_promo_code`、`userLevel`→`bingx_vip_level`、`balanceVolume`→`total_assets`。
- [x] 實作資料合併邏輯：以 `uid` 為基準，`mergeUsers()` 空值不覆蓋既有非空值。
- [x] 驗證 RFM 計算邏輯，`last_active_date` 心跳機制作為 R 分依據。
- [x] `volume_30d` 與 `volume_recent` 雙寫，確保表格與詳細頁顯示一致。
- [x] 優化快速篩選按鈕，確保 VIP / 沉睡戶篩選正確。
> **驗收結果：** 全部同步後，邀請類型、邀請人 UID、綁定邀請碼、推廣碼、VIP 等級、資產餘額皆正確填入。

---

## 階段四：UI Layout 視覺優化與 Stitch 樣式整合 ✅ 已完成
**目標：以 Stitch HTML 設計語彙全面翻新前端視覺。**
- [x] 建立 UI 視覺設計規範與全域變數 (導入思源黑體)
- [x] 提取 Stitch HTML 設計令牌，透過 Tailwind v4 `@theme` 注入全站色票。
- [x] 覆寫 Element Plus CSS 變數，使核心組件外觀貼近高質感設計。
- [x] 引入 Inter 字型 + Material Symbols Outlined 圖示字型。
- [x] 重構 `MainLayout.vue`：深色側邊欄 → 白底亮色風格。
- [x] 重構 `Dashboard.vue`：4 大 KPI 卡片 + SVG 趨勢圖佔位 + 最近動態 + 快速入口，支援 RWD。
- [x] 重構 `CrmTable.vue`：新增白底篩選卡片、Pill Badge 標籤、精緻表格標頭。
> **驗收結果：** `npm run dev` 正常，`/dashboard` 顯示新 KPI 卡片，`/crm` 顯示新篩選卡片與精緻表格。

---

## 階段五：社群情緒與活動追蹤模組
**目標：導入 LINE 對話解析與 O2O 轉換追蹤功能。**
- [ ] 實作 LINE `.txt` 聊天紀錄上傳與 Regex 解析，統計群友發言頻率。
- [ ] 建立痛點字典，實作詞頻統計與警報卡片 (Alert)。
- [ ] 開發活動同期群 (Cohort) 介面，對比活動前後 14 天交易量變化。
> **驗收標準：** 成功解析 LINE 紀錄並印出關鍵字頻率；Cohort 頁面能正確對比資產增長率。

---

## 階段六：SQLite 本機資料庫與個人時間序列架構 ✅ 已完成
**目標：導入 WebAssembly SQLite，建立精確到單一用戶的每週歷史快照，支援後續同類群組分析。**
- [x] 安裝 `sql.js`、`localforage`、`dayjs` 套件。
- [x] 複製 `sql-wasm.wasm` 至 `public/`，確保 Vite dev/build 皆可正確 fetch。
- [x] 建立 `src/database/sqlite.js`：封裝 `initDb()`、`upsertCustomer()`、`upsertWeeklyStat()`、`persistDb()`、`exportDbFile()`、`importDbFile()`。
- [x] 定義兩張資料表：`customers`（主表快照）+ `user_weekly_stats`（每週明細，UNIQUE(uid, year_week) Upsert）。
- [x] 在 `useCrmStore` 新增 `initDatabase()`、`syncWeeklyData()`，並在 `main.js` 應用啟動後非阻塞初始化。
- [x] 在 `Dashboard.vue` 新增「📦 資料庫管理」卡片：每週戰情結算、備份 .sqlite、還原 .sqlite 上傳。
> **驗收結果：** `npm run dev` 正常，Dashboard 顯示 DB 就緒狀態；點擊「每週戰情結算」可寫入週快照並持久化；備份按鈕可下載 .sqlite 二進位檔。

---

## 補充模組：Ngrok 內網穿透 ✅ 已完成
**目標：不部署雲端的情況下，臨時對外開放本機 CRM 系統。**
- [x] 安裝 `ngrok` 為 devDependencies。
- [x] 調整 `vite.config.js`：加入 `host: '0.0.0.0'`、`port: 5173`、`strictPort: true`、`allowedHosts: true`。
- [x] 新增 `npm run share` 快捷指令 (`ngrok http 5173`)。
- [x] 建立啟動教學文件 `docs/啟動教學.md`。
> **驗收結果：** `npm run share` 成功產生 `https://xxxxx.ngrok-free.dev` 對外網址，團隊成員可直接存取。

---

## 階段七：分眾走勢儀表板與名單下鑽分析 ✅ 已完成
**目標：將 Dashboard 升級為互動式戰情室，含日期區間優化與 ECharts 點擊下鑽。**
- [x] 新增後端 API：`GET /api/db/trend`（分眾走勢聚合）、`GET /api/db/drilldown`（JOIN 名單）、`GET /api/db/kpi`（WoW 比較）。
- [x] 在 `server/db.js` 新增 `getWeeklyTrend()`、`getWeeklyDrilldown()`、`getLatestTwoWeeksKpi()` 函式。
- [x] `Dashboard.vue` 整合 `vue-echarts` 堆疊面積圖，X 軸以 dayjs `isoWeek` plugin 將 `2026-W09` 轉換為 `02/23 ~ 03/01`。
- [x] Tooltip hover 顯示完整日期區間與各分眾人數。
- [x] 點擊圖表節點觸發下鑽，以 `el-dialog` + `el-table` 顯示 JOIN 名單，提供「查看內頁」按鈕。
- [x] KPI 卡片新增 WoW 週環比（🔼 +5%）。
> **驗收結果：** Dashboard 圖表顯示各 RFM 分眾走勢；點擊節點彈出含日期區間標題的名單 Dialog；KPI 顯示與上週比較百分比。

---

## 階段八：GCP 雲端部署
**目標：將本機完美運作的系統放上雲端，隨時隨地可用。**
- [ ] 移除 Vite Proxy，改為 GCP API Gateway 或 Node.js 中介層轉發。
- [ ] 撰寫 Dockerfile 或 Cloud Run 部署腳本。
- [ ] 部署至 GCP `asia-east1` 台灣節點。
> **驗收標準：** 手機瀏覽器輸入網址，能流暢登入並操作完整 CRM 系統。
