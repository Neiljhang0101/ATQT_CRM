# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是「規格驅動開發 (SDD)」框架下的 AI 架構師。請嚴格遵守以下原則：
1. **規格即真理 (Spec is Truth)：** 所有實作必須 100% 貼合規格定義。
2. **禁止擅自加戲：** 絕對不要自己發明 PRD 中未提及的邏輯。
3. **驗收驅動 (Test-Driven by Spec)：** 開發結束前逐條檢查是否達成要求。

---

# 任務目標：ATQT CRM 系統 - 階段七 分眾走勢儀表板與名單下鑽分析 (含日期區間優化)

本階段將把 `/dashboard` 升級為互動式戰情室。請讀取 SQLite 資料庫 (`user_weekly_stats` 與 `customers`)，並利用 ECharts 實作分眾走勢圖表與點擊下鑽名單功能。特別注意：必須將機器讀取的週數轉換為人類直覺的日期區間。

## 1. 套件安裝與環境準備
* 確認已安裝 `echarts`, `vue-echarts`, `dayjs` (若缺少請安裝 `dayjs/plugin/isoWeek` 以支援週數解析)。
* 在 `Dashboard.vue` 中引入並註冊元件。

## 2. 實作「每週分眾數量走勢圖」 (SQL 聚合與 ECharts 繪製)
* **資料聚合：** 撰寫 SQL 語法，從 `user_weekly_stats` 撈出 `year_week`, `rfm_tag`, `COUNT(uid)`。
* **繪製堆疊折線/面積圖 (Stacked Area Chart)：** * Series：各個 RFM 分眾標籤，並給予對比強烈的顏色。
* **【重要 UX 優化】日期區間轉換 (Date Range Formatting)：**
  資料庫取出的 X 軸原始值為 `2026-W09`，請在 ECharts 的 `xAxis.axisLabel.formatter` 與 `tooltip.formatter` 中，利用 `dayjs` 將其轉換為直覺的日期區間。
  * 例如：將 `2026-W09` 轉換顯示為 `02/23 ~ 03/01`。
  * 確保使用者滑鼠 Hover 到圖表節點時，Tooltip 顯示的是完整的日期區間與各標籤人數。

## 3. 實作「圖表點擊下鑽」(Interactive Drill-down) 與快速查看名單
* **事件監聽：** 在 ECharts 綁定點擊事件 (`@click`)。
* **觸發邏輯：** 點擊圖表區塊時，擷取該點的原始 `year_week` 與 `rfm_tag`。
* **SQL 關聯查詢 (JOIN)：** 使用 `SELECT c.uid, c.line_name, w.total_assets, w.volume_weekly FROM user_weekly_stats w JOIN customers c ON w.uid = c.uid WHERE w.year_week = ? AND w.rfm_tag = ?` 撈出名單。
* **名單彈窗 (Dialog)：**
  * 彈出 `<el-dialog>` 顯示 `<el-table>` 名單。
  * **標題優化：** 彈窗標題也必須將週數轉為日期區間，例如顯示：「02/23 ~ 03/01 - 核心VIP (共 15 人)」。
  * 提供「查看內頁」按鈕可跳轉至 `/crm/:uid`。

## 4. UI 介面優化
* Dashboard 頂部保留最新一週的 KPI 數據卡（如總資產、總交易量），並顯示與上週比較的 WoW 成長率 (如 🔼 +5%)。
* 圖表區塊需支援 RWD 響應式。

## 5. SDD 文件同步更新
1. **修改 PRD：** 將「分眾走勢圖表」、「日期區間轉換 UX」與「ECharts 點擊下鑽」寫入系統規格。
2. **修改計畫表：** 將階段七標記為已完成 `[x]`。

---

## 6. 執行完畢後的輸出要求 (SDD Execution Report)
1. **異動檔案清單：** 列出修改的檔案。
2. **圖表互動與日期轉換驗證：** 請在報告中說明你使用了 `dayjs` 的哪個 plugin 或邏輯來把 `2026-W09` 轉成 `02/23 ~ 03/01`，並告訴我滑鼠 Hover 時應該看到什麼。
3. **SQL 語法確認：** 印出用於下鑽查詢名單的 JOIN 語法。