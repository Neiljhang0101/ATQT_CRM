# ATQT CRM 系統：六階段開發計畫

**對應 PRD：** [ATQT_CRM_PRD_v1.1.md](./ATQT_CRM_PRD_v1.1.md)  
**最後更新：** 2026-02-28

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
> **驗收結果：** 雙帳號並行同步，`Promise.allSettled` 任一失敗不中斷。

---

## 階段三：資料擴充與 RFM 智能分眾系統 ✅ 已完成
**目標：將資產與交易量併入客戶總表，讓系統自動打上分眾標籤。**
- [x] 開發 API 請求：獲取子帳戶資產餘額 (`balance`) 與返佣紀錄 (`volume`, `fee`)。
- [x] 實作資料合併邏輯：以 `uid` 為基準，合併資產與交易量至現有總表。
- [x] 驗證 RFM 計算邏輯，以真實數據確認 R/F/M 評分正確。
- [x] 優化 `<el-table>` 快速篩選按鈕，確保 VIP / 沉睡戶篩選正確。
> **驗收結果：** `fetchAccount` 並行呼叫三支 API，以 uid 合併並即時計算 RFM 分數與動態標籤。

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

## 階段六：戰情儀表板與週報產生器
**目標：將所有數據轉化為圖表，並解決週六開會的統整痛點。**
- [ ] ECharts 繪製「風險偏好矩陣」散佈圖。
- [ ] Tailwind Grid 排版首頁 4 大核心 KPI 數據卡片。
- [ ] 開發「一鍵匯出週報」功能，轉換為 Markdown 格式。
> **驗收標準：** 首頁圖表正常渲染；點擊匯出後可直接複製格式整齊的週報。

---

## 階段七：GCP 雲端部署
**目標：將本機完美運作的系統放上雲端，隨時隨地可用。**
- [ ] 移除 Vite Proxy，改為 GCP API Gateway 或 Node.js 中介層轉發。
- [ ] 撰寫 Dockerfile 或 Cloud Run 部署腳本。
- [ ] 部署至 GCP `asia-east1` 台灣節點。
> **驗收標準：** 手機瀏覽器輸入網址，能流暢登入並操作完整 CRM 系統。
