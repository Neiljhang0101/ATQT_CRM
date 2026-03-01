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

---

# ATQT CRM — RFM 分眾系統規格文件（實作版）

**最後更新：** 2026-03-01  
**實作位置：** `src/store/index.js` — `calcRScore()` / `calcFScore()` / `calcMScore()` / `calcTags()`  
**觸發時機：** 每次同步 API、匯入 XLSX、匯入 LINE 對話後，對所有 users 重算

---

## RFM 概念說明

RFM 是三個維度的縮寫，各自衡量用戶行為的不同面向，每個維度各給 1–5 分：

| 字母 | 全稱 | 中文 | 衡量的問題 |
|------|------|------|-----------|
| **R** | Recency | 最近活躍度 | 這個人最近有多久沒有和我們互動？越近期活躍，R 分越高 |
| **F** | Frequency | 互動頻率 | 這個人多常和我們互動（交易天數 + LINE 訊息量）？越頻繁，F 分越高 |
| **M** | Monetary | 資產規模 | 這個人的資金體量有多大（帳戶餘額 + 交易量）？規模越大，M 分越高 |

三個分數組合後（e.g., R=4, F=2, M=5）即可對應到特定的**分眾標籤**，用於決定行銷策略與溝通優先順序。

---

## 一、R 分（Recency — 最近活躍度）

> 函數：`calcRScore(u)`  
> 來源欄位：`last_active_date`（虛擬活躍日）、`last_trade_date`（最後交易日）、`bingx_register_date` / `register_date`、`first_deposit_time`

| 優先級 | 判斷條件 | R 分 | 直接輸出標籤 |
|--------|----------|------|-------------|
| 1（新手保護）| 距 `register_date` 或 `first_deposit_time` ≤ 7 天 | 5 | 🌟 新手待破蛋 |
| 2 | 無 `last_active_date` 且無 `last_trade_date` | 1 | 💤 沉睡流失風險 |
| 3 | 距活躍日 ≤ 7 天 | 5 | — |
| 3 | 距活躍日 8–14 天 | 4 | — |
| 3 | 距活躍日 15–30 天 | 3 | — |
| 3 | 距活躍日 31–60 天 | 2 | — |
| 3 | 距活躍日 > 60 天 | 1 | 💤 沉睡流失風險 |

> **虛擬活躍日（`last_active_date`）機制**：非單一 API 欄位，由系統在每次同步時取以下來源最新日期合併寫入：`last_trade_date`（交易）、LINE 最後訊息日（LINE 匯入後）。

---

## 二、F 分（Frequency — 互動頻率）

> 函數：`calcFScore(lineMsgCount7d, tradeCount30d)`  
> 來源欄位：`line_msg_count_7d`（7 天 LINE 訊息數）、`trade_count_30d`（30 天有交易天數）

**計算公式**

```
combined = (line_msg_count_7d / 10) + trade_count_30d
```

| combined 值 | F 分 |
|-------------|------|
| ≥ 20 | 5 |
| ≥ 10 | 4 |
| ≥ 5 | 3 |
| ≥ 2 | 2 |
| < 2 | 1 |

> `trade_count_30d`：近 30 天內有交易量（vol > 0）的天數，由 BingX Commission API 統計；每筆紀錄為一天。  
> `line_msg_count_7d`：7 天 LINE 回覆/主動發訊計次，由 LINE 對話匯入後更新。LINE 訊息除以 10 是為了讓交易行為在分數中佔主導。

---

## 三、M 分（Monetary — 資產規模）

> 函數：`calcMScore(balance, volume30d)`  
> 來源欄位：`balance`（總資產 USDT）、`volume_30d` / `volume_recent`（近 30 天交易量 USDT）

| 條件（任一成立） | M 分 |
|-----------------|------|
| balance > 5,000 **或** volume > 3,000,000 | 5 |
| balance > 2,000 **或** volume > 1,000,000 | 4 |
| balance > 500 **或** volume > 300,000 | 3 |
| balance > 100 **或** volume > 50,000 | 2 |
| 以上皆不符 | 1 |

> `balance` 來源：BingX API 同步（`balanceVolume` 欄位）；`volume_30d` 由 Commission API 累加近 30 天 `volume`。

---

## 四、分眾標籤邏輯

> 函數：`calcTags(u, r, f, m, rfm_tag)`  
> 每位用戶可同時擁有多個標籤（陣列）

### 4.1 基礎 R 標籤（由 `calcRScore` 回傳的 `rfm_tag`）

| 標籤 | 觸發條件 |
|------|----------|
| 🌟 新手待破蛋 | 距註冊/首次入金 ≤ 7 天 |
| 💤 沉睡流失風險 | 無活躍日記錄，或距活躍日 > 60 天，且 `has_traded = false` |
| ❄️ 已流失老客 | `rfm_tag = 💤 沉睡流失風險` 且 `has_traded = true` |

### 4.2 行為狀態標籤

| 標籤 | 觸發條件 |
|------|----------|
| 🌱 入金未交易 | `has_deposit = true` 且 `has_traded = false` |

> ~~🚀 初次交易~~ 已移除：`trade_count_30d` 僅統計近 30 天，無法區分「真正第一次交易」與「久未交易後回流」，判斷依據不足，避免誤導行銷操作。若未來取得帳戶開立以來累計交易次數欄位，可重新評估加回。

### 4.3 複合標籤（R × M 或 F × M）

| 標籤 | 觸發條件 |
|------|----------|
| 👑 核心 VIP | M = 5 且（R ≥ 4 **或** F ≥ 4） |
| ⚠️ 沉睡的高淨值戶 | M = 5 且 R ≤ 2 |
| 🔥 高潛力活躍戶 | M ∈ {3, 4} 且 R ≥ 4 |
| 📊 穩定交易戶 | M ∈ {3, 4} 且 R = 3 |
| ⏰ 流失預警 | M ≥ 3 且 R = 2 |

### 4.4 社群互動頻率標籤

> 依據 `line_msg_count_7d`（近一週 LINE 訊息則數），各級以 **100 則/週** 為最高段基準，四段遞減。

| 標籤 | 觸發條件（每週 LINE 則數） | 顯示色系 |
|------|--------------------------|----------|
| 💬 社群超高互動 | `line_msg_count_7d` ≥ 100 | 深青色 |
| 💬 社群高互動 | `line_msg_count_7d` ≥ 50 | 綠色 |
| 💬 社群互動中 | `line_msg_count_7d` ≥ 10 | 藍色 |
| 🔇 社群低互動 | `line_msg_count_7d` < 10（且非「🌟 新手待破蛋」） | 灰色 |

> **資料來源：** 每次 LINE 對話匯入後，由 `importLine()` 更新 `line_msg_count_7d`（取最近一週所有訊息計次）。  
> **受眾應用：** 可用於選定社群觸及策略，「超高互動」代表高 KOC（Key Opinion Consumer）發展潛力，「低互動」可作為再觸及（Reactivation）名單。

---

## 五、標籤共存規則

- 一位用戶可同時擁有多個標籤（e.g., 🌱 + ⏰）
- 「❄️ 已流失老客」與「💤 沉睡流失風險」**互斥**（以 `has_traded` 判斷取其一）
- 「🌟 新手待破蛋」不與其他複合標籤共存（R 分鎖定為 5，不觸發流失/預警類）
- 社群互動頻率標籤（4.4）**四者互斥**，只取最高段；「🌟 新手待破蛋」不觸發「🔇 社群低互動」
- 標籤陣列儲存於 `u.tags[]`，分數儲存於 `u.rfm_score: { r, f, m }`

---

## 六、各欄位資料來源與缺失影響

| 欄位 | 用途 | 主要來源 | 缺失時影響 |
|------|------|----------|-----------|
| `last_active_date` | R 分主要依據 | 系統合成 | 退用 `last_trade_date` |
| `last_trade_date` | R 分備援 | BingX Commission API | 退為 R=1 |
| `bingx_register_date` | 新手保護判斷 | BingX API / XLSX 匯入 | 略過新手保護 |
| `first_deposit_time` | 新手保護判斷備援 | XLSX 匯入 | 略過新手保護 |
| `line_msg_count_7d` | F 分 + 互動偵測 | LINE 對話匯入 | F 分僅靠 `trade_count_30d` |
| `trade_count_30d` | F 分 + 顯示 | BingX Commission API 同步 | F 分偏低 |
| `balance` | M 分 | BingX API 同步 | M 分僅靠 `volume_30d` |
| `volume_30d` | M 分備援 | BingX Commission API | M 分僅靠 `balance` |
| `has_traded` | 標籤精確度 | 系統推算（有交易量則 true） | 流失 vs. 沉睡分類錯誤 |