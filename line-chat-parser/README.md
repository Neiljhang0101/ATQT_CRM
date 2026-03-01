# LINE 聊天紀錄解析工具

將 LINE 官方匯出的 `.txt` 聊天紀錄，排除機器人/系統訊息後，**按月份**切分並匯出為 Excel (`.xlsx`)。

---

## 安裝

```bash
cd line-chat-parser
npm install
```

---

## 使用方式

### 方法一：自動掃描（推薦）
將 LINE 匯出的 `.txt` 檔案複製到 `line-chat-parser/` 資料夾中，然後執行：

```bash
node index.js
```

### 方法二：指定特定檔案

```bash
node index.js "群組對話紀錄.txt"
```

---

## 輸出結果

- 輸出目錄：`line-chat-parser/output/`
- 每個月份產生一個獨立 Excel 檔案，例如：
  - `2025-10_LINE對話.xlsx`
  - `2025-11_LINE對話.xlsx`
- Excel 欄位：`日期` / `時間` / `發言者暱稱` / `訊息內容`

---

## 自訂機器人黑名單

開啟 `index.js` 頂部，修改 `BOT_NAMES` 陣列：

```js
const BOT_NAMES = [
  'LINE Notify',
  '社群管理員',
  '系統機器人',
  '官方帳號',
  // 加入其他需要排除的暱稱...
];
```

---

## 支援的 LINE 匯出格式

| 編碼         | 支援 |
|--------------|------|
| UTF-16 LE with BOM | ✅ |
| UTF-8 with BOM     | ✅ |
| UTF-8              | ✅ |

---

## 過濾邏輯

1. **系統訊息**：無法被 `\t` 分隔出「時間 / 發言者 / 內容」三個欄位的行，自動略過（如「Kevin 已加入群組」）。
2. **黑名單帳號**：發言者暱稱包含 `BOT_NAMES` 中任一關鍵字，整行略過。
