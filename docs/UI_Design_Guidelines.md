# ATQT CRM — UI 視覺設計規範 (Design System Guidelines)

> **本文件為本專案唯一視覺真理 (Single Source of Truth)。**  
> 所有新元件、新視圖在開發前必須對照此文件，禁止自行發明不屬於本設計系統的顏色、字體或特效。  
> 對應 PRD：`ATQT_CRM_PRD_v1.1.md` §6 UI 視覺升級章節  
> 最後更新：2026-02-28

---

## 1. 字體規範 (Typography)

### 主要字體

| 角色 | 字體 | 引入方式 |
|---|---|---|
| **全站主字體（中文）** | **Noto Sans TC（思源黑體）** | `@import url(...)` in `style.css` |
| 輔助字體（英數） | Inter | `<link>` in `index.html` |
| 圖示字型 | Material Symbols Outlined | `<link>` in `index.html` |

### CSS `@import` 宣告（寫在 `style.css` 最上方）

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap');
```

### font-family Stack

```
'Noto Sans TC', 'Inter', system-ui, Helvetica, Arial, sans-serif
```

**優先順序說明：**
- 中文字符 → **Noto Sans TC**（思源黑體，繁體中文最佳化）
- 英數字符 → 瀏覽器因 Noto Sans TC 不含拉丁全集，自動 fallback 至 **Inter**
- 離線 fallback → `system-ui`

### 字級對照表

> ⚠️ **最小字級限制：全站任何文字 font-size 不得低於 14px。**

| 用途 | Tailwind Class | px 大小 |
|---|---|---|
| 頁面主標題 | `text-xl` | 20px |
| 卡片標題 / 按鈕 / 表單標籤 | `text-base` | **16px（全站基準）** |
| 表格資料 / 標籤 / 次要文字 | `text-sm` | **14px（最小值）** |

> `text-xs`（12px）**禁止使用**，所有情境請改用 `text-sm`（14px）。

### 字重

| 用途 | font-weight |
|---|---|
| 標題 / 數值強調 | `700` (bold) |
| 按鈕 / 標籤 | `500` (medium) |
| 一般內文 | `400` (regular) |

---

## 2. 色彩計畫 (Color Palette)

> 來源：Stitch HTML `.tailwind.config` 色票，與 Element Plus 預設主色系對齊

### 主色系

| Token | Hex | 用途 |
|---|---|---|
| `--color-primary` | `#409EFF` | 按鈕、連結、作用中選單、圖示底色 |
| `--color-primary-light` | `#ecf5ff` | 淡藍背景（hover 狀態、作用中選單底色） |
| `--color-primary-dark` | `#337ecc` | 按鈕 hover/press 深色 |
| `--color-primary-hover` | `#66b1ff` | 次要 hover 狀態 |

### 語意狀態色

| Token | Hex | 用途 |
|---|---|---|
| `--color-success` | `#67C23A` | 成功狀態、新帳號標籤、正向趨勢 |
| `--color-warning` | `#E6A23C` | 警告、高淨值客戶標籤 |
| `--color-danger` | `#F56C6C` | 錯誤、流失風險標籤、通知紅點 |
| `--color-info` | `#909399` | 一般資訊、灰色圖示 |

### 背景 / 表面色

| Token | Hex | 用途 |
|---|---|---|
| `--color-background-light` | `#f5f7fa` | 整體頁面背景、表格標頭底色 |
| `--color-surface` | `#ffffff` | 卡片、側邊欄、Header 背景 |

### 文字色

| Token | Hex | 用途 |
|---|---|---|
| `--color-text-main` | `#1a1d23` | 主要標題、重要數值 |
| `--color-text-regular` | `#3d4148` | 一般內文、表格資料 |
| `--color-text-secondary` | `#909399` | 說明文字、時間戳、Label |

### 邊框色

| Token | Hex | 用途 |
|---|---|---|
| `--color-border-base` | `#dcdfe6` | 輸入框邊框 |
| `--color-border-light` | `#e4e7ed` | 卡片邊框、分隔線 |

---

## 3. 元件樣式令牌 (Component Tokens)

### 圓角 (Border Radius)

| 元件 | Class / 值 | px |
|---|---|---|
| 卡片 | `rounded-lg` | 8px |
| 按鈕、輸入框、標籤 | `rounded` / `6px` | 6px |
| 小型標籤 (Pill Badge) | `rounded` | 4–6px |
| 圓形頭像 | `rounded-full` | 50% |
| 圖示底色塊 | `rounded-md` | 6px |

### 陰影 (Shadow)

| 層級 | 值 | 用途 |
|---|---|---|
| 卡片預設 | `0 0 12px rgba(0,0,0,0.05)` | 所有白色卡片 |
| 卡片 hover | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` | 滑鼠移入卡片 |
| Header | `0 2px 4px rgba(0,0,0,0.05)` | 頂部 sticky Header |

---

## 5. 間距規範 — 8px Grid System

> **核心原則：所有間距值必須是 8 的倍數（或 4 的倍數作為半格）。**  
> 禁止使用任意數值（如 5px、11px、13px）。新增元件時請從下表選取。

### 間距尺度表

| Token 名稱 | px | Tailwind Class | 用途 |
|---|---|---|---|
| `space-0.5` | 2px | `p-0.5` / `gap-0.5` | 最小微調（圖示微偏移） |
| `space-1` | 4px | `p-1` / `gap-1` | 標籤內間距、圖示行內間距 |
| `space-2` | 8px | `p-2` / `gap-2` | **基準單位 (1×)**，按鈕垂直 padding、緊密列表行距 |
| `space-3` | 12px | `p-3` / `gap-3` | 卡片內小間距、選單項目高度 |
| `space-4` | 16px | `p-4` / `gap-4` | **常用 (2×)**，卡片 padding、表格 cell padding |
| `space-5` | 20px | `p-5` / `gap-5` | 區塊間距、KPI 卡片 padding |
| `space-6` | 24px | `p-6` / `gap-6` | **常用 (3×)**，卡片標題區 padding、段落間距 |
| `space-8` | 32px | `p-8` / `gap-8` | 主要區塊間隔（卡片與卡片之間） |
| `space-10` | 40px | `p-10` / `gap-10` | 頁面 section 間距 |
| `space-12` | 48px | `p-12` / `gap-12` | 大型 section 上下邊距 |

### 水平版面規範

| 元素 | 左右 padding | 對應 Tailwind |
|---|---|---|
| 頁面主內容區 | 24px | `px-6` |
| 側邊欄 Logo 區 / Header | 24px | `px-6` |
| 卡片內部 | 20px | `px-5` |
| 表格 cell | 16px | `px-4` |
| 小型 Pill Badge | 8px | `px-2` |
| 按鈕（標準） | 16px | `px-4` |

### 垂直版面規範

| 元素 | 上下 padding / gap | 對應 Tailwind |
|---|---|---|
| 頁面區塊與區塊之間 | 24px | `gap-6` |
| KPI 卡片群組 | 20px | `gap-5` |
| 表格 cell | 12px | `py-3` |
| 頁首 Header 高度 | 64px（`h-16`） | `h-16` |
| 側邊欄選單項目 | 10px 上下 | `py-2.5` |

### 開發守則

1. **加間距前先查表** — 找最近的 8px 倍數值，不可直接寫 `style="margin:13px"`。
2. **半格（4px）** — 僅用於細節微調（Pill Badge 垂直 padding `py-0.5`、圖示對齊）。
3. **Tailwind inline 數值** — 若必須用 `[]` 語法，只允許 8 的倍數，如 `mt-[40px]`。
4. **元件間距** — Grid gap 統一使用 `gap-5`（20px）或 `gap-6`（24px）。

> 位置：`atqt-crm/src/style.css`

```css
@theme {
  --font-sans: 'Noto Sans TC', 'Inter', system-ui, Helvetica, Arial, sans-serif;
  --font-display: 'Noto Sans TC', 'Inter', system-ui, Helvetica, Arial, sans-serif;

  --color-primary: #409EFF;
  --color-primary-light: #ecf5ff;
  --color-primary-dark: #337ecc;
  --color-primary-hover: #66b1ff;

  --color-success: #67C23A;
  --color-warning: #E6A23C;
  --color-danger: #F56C6C;
  --color-info: #909399;

  --color-background-light: #f5f7fa;
  --color-surface: #ffffff;

  --color-text-main: #303133;
  --color-text-regular: #606266;
  --color-text-secondary: #909399;

  --color-border-base: #dcdfe6;
  --color-border-light: #e4e7ed;

  --shadow-card: 0 0 12px rgba(0,0,0,0.05);
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
}
```

---

## 6. Element Plus CSS 變數覆寫原則

> 位置：`atqt-crm/src/style.css` `:root` 區塊

以下變數已覆寫，確保 `<el-table>`, `<el-button>`, `<el-tag>`, `<el-pagination>`, `<el-input>` 等組件外觀與本設計系統一致：

```css
:root {
  --el-color-primary: #409EFF;
  --el-color-primary-light-3: #66b1ff;   /* hover 色 */
  --el-color-primary-light-9: #ecf5ff;   /* 淺色背景 */
  --el-border-radius-base: 6px;
  --el-border-radius-small: 4px;
  --el-font-family: 'Noto Sans TC', 'Inter', system-ui, Helvetica, Arial, sans-serif;
  --el-font-size-base: 16px;          /* 全站基準字級 */
  --el-font-size-small: 14px;         /* 最小字級（不得再低）*/
  --el-font-size-large: 18px;
  --el-form-label-font-size: 16px;
  --el-box-shadow-base: 0 0 12px rgba(0,0,0,0.05);
  --el-fill-color-light: #f5f7fa;
  --el-bg-color-page: #f5f7fa;
}

/* 表單元件強制覆寫 */
.el-input__inner,
.el-textarea__inner,
.el-form-item__label,
.el-select .el-input__inner,
.el-radio__label,
.el-checkbox__label,
.el-button {
  font-size: 16px !important;
}
```

---

## 7. 新增元件時的視覺開發守則

1. **顏色** — 只使用本文件第 2 節的 Token，不可自行引入新色碼。
2. **字體** — 全站字體已由 `style.css` 全域設定，不需在單一元件中宣告 `font-family`。
3. **間距** — 所有 padding / margin / gap 必須符合第 5 節 8px Grid 規範。
4. **卡片** — 標準格式：`bg-white rounded-lg p-5 border border-[#e4e7ed] shadow-card`。
5. **標籤（Pill Badge）** — 使用 inline-style 指定 `background` / `color` / `border`，對應第 2 節語意色，不使用 `<el-tag>` 的 `type` prop 顏色（避免與設計系統脫鉤）。
6. **Material Symbols** — 圖示尺寸統一使用 `text-[22px]`（選單）、`text-[24px]`（KPI 卡片圖示）、`text-[18px]`（行內操作按鈕）。
7. **字級** — 任何元件的 `font-size` 不得低於 **14px**。標準表單欄位、按鈕、標籤統一使用 **16px**。
8. **表格欄位** — 所有 `<el-table-column>` 須設定明確 `width`（不依賴自動縮排），並在 `:cell-style` 加入 `whiteSpace: 'nowrap'` 防止換行。
9. **檔案編碼** — 所有 `.vue` / `.js` / `.css` 檔案必須以 **UTF-8 無 BOM** 儲存。詳細規範見第 9 節。

---

## 9. 檔案編碼安全守則 ⚠️

> **事故紀錄（2026-02-28）**：使用 PowerShell `Set-Content -NoNewline` 批次替換顏色值時，所有含中文的 Vue 檔案被改寫為 **UTF-16 LE**，導致 Tailwind Oxide（Rust）panic、Vite 解析失敗、中文字符全面亂碼，同時 HTML 閉合標籤（如 `</span>`）遺失 `<` 字節，全站無法瀏覽。

### 根本原因

| 方式 | 輸出編碼 | 是否安全 |
|---|---|---|
| `Set-Content` / `Set-Content -NoNewline` | **UTF-16 LE**（含中文時） | ❌ 絕對禁止 |
| `Out-File -Encoding utf8` | UTF-8 **含 BOM** | ❌ 可能觸發部分工具問題 |
| `[System.IO.File]::WriteAllText(path, content, New-Object System.Text.UTF8Encoding $false)` | UTF-8 無 BOM | ✅ |
| `Node.js fs.writeFileSync(path, content, 'utf8')` | UTF-8 無 BOM | ✅ 推薦 |

### 強制規則

1. **禁止**使用 PowerShell `Set-Content` 或 `Out-File` 寫入含中文的原始碼檔案。
2. 需要用腳本批次修改原始碼時，**一律使用 Node.js `.cjs` 腳本** + `fs.writeFileSync(..., 'utf8')`。
3. Node.js `.mjs` / ES Module 腳本中，**禁止**在 template literal（backtick 字串）內直接放 `</script>` — 會觸發 V8 解析錯誤 `SyntaxError: Invalid regular expression: missing /`。請改用字串拼接：`'<' + '/script>'`。
4. 每次修改 `.vue` 檔案後，立即執行 `npm run dev` 確認 Vite 無錯誤輸出，不要等到多個修改後才驗證。

### 緊急修復流程

若發生編碼損壞（症狀：中文亂碼 `管�???`、`</span>` 缺 `<`、Vite `Element is missing end tag`）：

```js
// fix_xxx.cjs（CommonJS 腳本，Node.js 直接執行）
const fs = require('fs')
const scriptClose = '<' + '/script>'   // ← 避免 V8 解析衝突

const content = [
`<script setup>
// ... Vue 元件內容 ...
`, scriptClose, `

<template>
  <!-- ... -->
</template>
`].join('\n')

fs.writeFileSync('絕對路徑/Component.vue', content, 'utf8')
console.log('Component.vue written')
```

執行：`node fix_xxx.cjs`，完成後刪除腳本。

---

## 8. CrmTable 元件規範

### 欄位結構（當前版本）

| 欄位 | width | 說明 |
|---|---|---|
| UID（含來源標籤 + 複製） | 240px | 合併欄，見下方設計說明 |
| LINE 暱稱 | 160px | 未綁定顯示灰色 `--` |
| 註冊日期 | 155px | 可排序，md 以下隱藏 |
| 近期交易量 (U) | 185px | 數值排序 |
| 總資產 (U) | 165px | 數值排序，>5000 顯示警示橘色 |
| 最後交易日 | 155px | 可排序，md 以下隱藏 |
| RFM | 135px | `R? F? M?` 格式，md 以下隱藏 |
| 標籤 | min 200px | Pill Badge 陣列 |

### UID 欄位合併設計

來源標籤與 UID 合併於同一欄，排列順序：**[新/舊 Badge] → UID 文字 → [複製按鈕]**

```html
<div class="flex items-center gap-2">
  <!-- 來源 Badge：新=綠色、舊=灰色，字為「新」/「舊」 -->
  <span style="font-size:12px; background:...; color:...; border:...">新</span>
  <!-- UID -->
  <span class="font-mono" style="font-size:14px; color:#606266;">{{ row.uid }}</span>
  <!-- 複製按鈕：點擊呼叫 copyUid()，顯示 ElMessage.success -->
  <button @click.stop="copyUid(row.uid)">
    <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span>
  </button>
</div>
```

> 來源 Badge 字級允許 `12px`（僅限此 Badge），因其角色為附屬識別標記，非主要內容文字。

### 排序架構

**禁止**使用 `el-table` 內建 `:sort-method`，原因：內建排序只作用在當前頁切片，換頁後排序遺失。

**正確做法**：排序邏輯移至 computed 層，分三層處理：

```
filteredData（篩選）
  → sortedFilteredData（排序，含數值/字串分支）
    → tableData（分頁切片，傳入 :data）
```

- 監聽 `el-table` 的 `@sort-change` 事件更新 `sortField` / `sortOrder`
- 數值欄位（`balance`、`volume_30d`）使用 `Number()` 強制轉型
- 更換篩選條件或排序時重置 `currentPage = 1`
