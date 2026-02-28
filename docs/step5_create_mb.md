# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是在「規格驅動開發 (SDD)」框架下工作的 AI 架構師。請嚴格遵守以下四點原則：
1. **規格即真理 (Spec is Truth)：** 所有實作必須 100% 貼合規格定義。
2. **禁止擅自加戲：** 絕對不要自己發明 PRD 中未提及的邏輯。
3. **雙向追蹤 (Traceability)：** 在關鍵程式碼註解中標明對應邏輯。
4. **驗收驅動 (Test-Driven by Spec)：** 開發結束前逐條檢查是否達成要求。

---

# 任務目標：ATQT CRM 系統 - 階段五 客戶資料系統優化

本階段的目標是大幅擴充客戶資料的欄位（共 20 項），並實作「客戶專屬內頁」、「手動建檔表單」以及「XLSX 批次匯入補充資料」的功能。所有資料目前先儲存於 Pinia 中（資料庫持久化將於階段六處理）。

## 1. 擴充 Pinia 資料庫結構 (State Schema)
請在 `src/store/` 中，將客戶資料的結構嚴格擴充為以下 20 個欄位。請注意屬性的命名與型別：
1. `uid`: BingX UID (String, 唯一鍵值)
2. `account_type`: 新/舊帳號標籤 (String)
3. `invite_type`: 直接/間接邀請 (String)
4. `inviter_uid_code`: 邀請人 UID / 邀請碼 (String)
5. `inviter_line_name`: 邀請人 LINE 暱稱 (String)
6. `line_name`: LINE 暱稱 (String)
7. `register_date`: 註冊日期 (String)
8. `volume_recent`: 近期交易量 (Number)
9. `total_assets`: 總資產 (Number)
10. `last_trade_date`: 最後交易日 (String)
11. `official_email`: 官網註冊帳號信箱 (String)
12. `tradingview_account`: TradingView 帳號 (String)
13. `bingx_register_date`: BingX 註冊日期 (String)
14. `rfm_score_tag`: RFM 分數 / 分眾標籤 (String/Array)
15. `note_tags`: 備註標籤 (Array)
16. `text_notes`: 文字備註欄 (String)
17. `indicator_version`: 指標版本 (String)
18. `community_interaction`: 社群互動度 (String/Number)
19. `bingx_vip_level`: BingX VIP 等級 (String)
20. `first_deposit_time`: 首次入金時間 (String)

## 2. 實作 XLSX 匯入與資料合併邏輯
* 請安裝 `xlsx` 套件：執行 `npm install xlsx`。
* 在 Store 或 Utils 中實作匯入解析邏輯：允許使用者上傳 `.xlsx` 檔案，解析出對應的欄位資料。
* **合併邏輯 (Merge)：** 以 `uid` 為基準。若 Pinia 中已有該 UID，則將 Excel 讀取到的新欄位覆蓋/補充進去；若無此 UID，則建立一筆新客戶資料。

## 3. 升級 UI 視圖與路由
### A. 客戶總表 (`src/views/CrmTable.vue`)
* **手動建檔：** 新增「+ 手動建立資料」按鈕，彈出 `<el-dialog>` 表單，允許手動輸入上述欄位並存入 Pinia。
* **Excel 匯入：** 新增「匯入 XLSX」按鈕（使用 `<el-upload>`），並串接步驟 2 的解析邏輯。
* **內頁導航：** 在表格的操作列 (Action Column) 新增「查看詳情」按鈕，點擊後跳轉至該客戶的專屬內頁。

### B. 新增客戶資料內頁 (`src/views/CustomerDetail.vue`)
* 請在 `src/router/index.js` 註冊動態路由 `/crm/:uid`。
* 建立 `CustomerDetail.vue` 視圖：根據網址的 `uid` 從 Pinia 取得該客戶的完整 20 項欄位資料。
* 使用 Element Plus 的 `<el-descriptions>` 或 Tailwind Grid 排版，清晰展示所有詳細資訊，並提供「編輯」與「儲存」功能，修改後同步更新回 Pinia。

## 4. SDD 文件同步更新
1. **修改 PRD：** 更新 `docs/ATQT_CRM_PRD_v*.md`，將這 20 個欄位與 XLSX 匯入功能明確寫入規格中。
2. **修改計畫表：** 更新 `docs/Development_Plan.md`，將本任務列為「階段五：客戶資料系統優化 (含內頁與 XLSX 匯入)」，將「Firebase 資料庫導入」順延至階段六。標記階段五為已完成 `[x]`。

---

## 5. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成任務後，輸出以下結構化的執行報告：
1. **規格對照表 (Spec Traceability)：** 列出本次擴充的 20 個欄位、XLSX 匯入功能與內頁路由狀態。
2. **異動檔案清單 (Modified/Created Files)：** 列出修改的檔案 (包含 `router/index.js` 與新建的 `CustomerDetail.vue`)。
3. **執行與驗證步驟 (Verification Steps)：** 提示我準備一份包含 UID 與測試欄位的 Excel 檔，並說明如何在畫面上測試匯入與內頁跳轉功能。
4. **規格釐清與偏離警告 (Clarifications & Deviations)：** 說明 Excel 匯入時，表頭 (Header) 中文名稱與系統屬性 (Key) 的映射對應邏輯 (Mapping) 是如何處理的。