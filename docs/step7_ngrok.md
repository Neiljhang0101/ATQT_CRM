# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是「規格驅動開發 (SDD)」框架下的 AI 架構師。請嚴格遵守以下原則：
1. **規格即真理 (Spec is Truth)：** 所有實作必須 100% 貼合規格定義。
2. **禁止擅自加戲：** 絕對不要自己發明 PRD 中未提及的邏輯。

---

# 任務目標：ATQT CRM 系統 - 補充模組 Ngrok 內網穿透與外部共享

為了讓營運團隊能在不部署上雲端的情況下，臨時透過公開網址存取本機開發中的 CRM 系統，請在專案中整合 `ngrok` 並調整 Vite 伺服器設定。

## 1. 安裝 Ngrok 套件
* 請執行 `npm install -D ngrok` 將 ngrok 安裝為開發環境依賴套件。

## 2. 調整 Vite 伺服器配置 (`vite.config.js` / `vite.config.ts`)
在使用 Ngrok 代理 Vite 開發伺服器時，常會遇到 WebSocket 連線失敗或 Host Header 阻擋的問題。請修改 `vite.config` 檔案：
* 在 `server` 區塊中加入 `host: '0.0.0.0'` 允許外部連入。
* 確保 `port` 固定為 `5173`，並加上 `strictPort: true`。
* 針對 Vite 5+ 的安全限制，請加入 `allowedHosts: true` (或依據 Vite 版本設定 `cors: true`)，確保 ngrok 的隨機網域不會被 Vite 拒絕連線。

## 3. 新增 npm 快捷指令 (`package.json`)
* 請在 `scripts` 區塊中新增一個指令：`"share": "ngrok http 5173"`。
* 這樣未來只要開發伺服器啟動著，我開啟另一個終端機輸入 `npm run share` 就能產生對外網址。

## 4. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成任務後輸出執行報告，並**務必提供白話的使用教學**給人類使用者（包含：如果 ngrok 需要 Authtoken 該去哪裡拿、如何同時啟動 `npm run dev` 與 `npm run share`，以及網址會顯示在哪裡）。