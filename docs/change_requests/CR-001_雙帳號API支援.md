# 【SDD 需求變更單】CR-001：雙帳號 BingX API 支援

**變更單號：** CR-001  
**提交日期：** 2026-02-28  
**狀態：** ✅ 已實作  
**對應 PRD 版本：** PRD v1.0 → 更新至 v1.1  

---

## 1. 變更背景與原因 (Why)

原 PRD v1.0 僅規劃單一 BingX 代理商帳號。實際業務需求為同時管理**舊帳號**與**新帳號**兩個獨立的 BingX 代理帳號，兩組帳號各有不同的下線名單，需合併後統一在 CRM 介面呈現，並保留來源標記以利分別管理。

---

## 2. 規格變更對照 (What)

| 項目 | 舊規格 (v1.0) | 新規格 (v1.1) |
|---|---|---|
| API Key 組數 | 1 組 | 2 組（舊帳號 + 新帳號） |
| 環境變數 | `VITE_BINGX_API_KEY` | `VITE_BINGX_OLD_API_KEY` / `VITE_BINGX_NEW_API_KEY` |
| API 呼叫方式 | 單一 axios 實例 | `createBingxInstance()` 工廠函式，各自獨立 |
| 同步失敗處理 | 整體報錯 | `Promise.allSettled`，任一失敗不中斷另一帳號 |
| 客戶資料結構 | 無來源欄位 | 新增 `source: 'old' \| 'new'` |
| 表格 UI | 無帳號標示 | 新增「帳號」欄，顯示舊/新帳號 `<el-tag>` |
| 篩選功能 | VIP / 沉睡戶 | 新增帳號來源 Radio 按鈕篩選 |

---

## 3. 影響分析 (Impact Analysis)

| 檔案 | 變更類型 | 說明 |
|---|---|---|
| `.env.local` | 修改 | 舊 Key 變數重命名，新增第二組 |
| `src/api/bingx.js` | 重構 | 改為工廠函式，匯出 `oldApi` / `newApi` |
| `src/views/CrmTable.vue` | 修改 | 同步邏輯、表格欄位、篩選按鈕 |
| `src/store/index.js` | 不影響 | `mergeUsers()` 已支援增量合併 |

---

## 4. 執行報告 (Implementation Report)

- ✅ `.env.local` 已更新為雙組金鑰格式
- ✅ `bingx.js` 重構完成，`createBingxInstance()` 封裝 Key/Secret 於 closure
- ✅ `CrmTable.vue` 同步按鈕改為「同步兩個帳號」，使用 `Promise.allSettled`
- ✅ Pinia Store `mergeUsers()` 以 `uid` 為 key 做增量合併，無重複問題
- ✅ 統計列顯示「舊帳號 N · 新帳號 M」分別計數
