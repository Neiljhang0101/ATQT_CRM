# 【SDD 規格驅動開發最高指導原則】(請優先且嚴格遵守)
你現在是在「規格驅動開發 (SDD)」框架下工作的 AI 架構師。請嚴格遵守以下四點原則：
1. **規格即真理 (Spec is Truth)：** 在撰寫任何程式碼前，必須仔細閱讀並對齊我提供的 PRD 或階段目標。所有實作必須 100% 貼合規格定義。
2. **禁止擅自加戲 (No Hallucination/Over-engineering)：** 若 PRD 中未提及特定的 UI 元件、欄位、或錯誤處理邏輯，絕對不要自己發明或預設。若遇到規格定義模糊或技術衝突，請立即暫停並向我提出「釐清問題 (Clarification Questions)」。
3. **雙向追蹤 (Traceability)：** 在關鍵程式碼的註解中，請標明該段邏輯是對應到 PRD 的哪一個章節。
4. **驗收驅動 (Test-Driven by Spec)：** 開發結束前，必須拿著 PRD 的驗收標準，逐條檢查自己的程式碼是否完全達成。

---

# 任務目標：ATQT CRM 系統 - 階段六 雲端資料庫與手動建檔系統 (Firebase)

專案已完成前置的基礎建設。為了讓社群隊長「手動新增」的客戶資料（如 LINE 暱稱、信箱）能夠永久保存，並與 BingX API 數據完美整合，請執行以下階段五開發：

## 1. 系統架構變更與 Firebase 初始化
* 請安裝 Firebase 核心套件：執行 `npm install firebase`。
* 在 `.env.local` 檔案中新增 Firebase 變數的佔位符（請預留 `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` 等），讓我後續手動填寫。
* 建立 `src/firebase/init.js`，實作 Firebase App 與 Firestore 的初始化邏輯，並匯出 `db` 實例。

## 2. 定義 Firestore 資料結構 (Schema) 與 Pinia 改寫
請修改 `src/store/` 中的客戶資料邏輯，將 Pinia 轉型為「資料整合樞紐」：
* **資料庫結構：** 在 Firestore 中建立 `customers` collection。文件 ID (Document ID) 預設與 BingX 的 `uid` 一致。儲存欄位包含：`uid`, `email`, `line_id`, `line_name`, `contact_info`, `source`, `created_at`。
* **`fetchCustomers` (讀取與合併)：**
  1. 從 Firestore `customers` 讀取所有手動建檔的靜態資料。
  2. 呼叫 BingX API 獲取最新的動態數據 (`balance`, `volume` 等)。
  3. 在前端以 `uid` 為基準，將「Firestore 靜態資料」與「BingX API 動態數據」合併為完整的 `users` 陣列。
* **`addCustomer` (寫入)：** 實作將前端表單資料寫入 Firestore `customers` collection 的功能。

## 3. 升級前端 UI (`src/views/CrmTable.vue`)
* **手動建檔表單：** 在表格上方（使用 Tailwind 排版）新增「+ 手動新增客戶」的 `<el-button>`。點擊後彈出 `<el-dialog>` 與 `<el-form>`。表單需包含：UID、LINE 暱稱、LINE ID、官網信箱、聯絡方式。點擊確認後呼叫 Store 的寫入功能。
* **表格欄位擴充：** 確保 `<el-table>` 能同步顯示 API 抓來的「交易數據」與 Firestore 讀出的「聯絡資訊」。

## 4. SDD 文件同步更新 (嚴格執行)
開發完成後，請主動更新專案的 `docs/` 文件：
1. **修改 PRD：** 讀取並修改 `docs/ATQT_CRM_PRD_v*.md`，新增「Firebase 資料庫持久化與手動建檔模組」的架構說明，並將文件版本號遞增。
2. **修改計畫表：** 修改 `docs/Development_Plan.md`，將本任務插入為「階段五」，原本的儀表板與部署順延為階段六與階段七。並將「階段五」標記為已完成 `[x]`。

---

## 5. 執行完畢後的輸出要求 (SDD Execution Report)
請在完成任務後，輸出以下結構化的執行報告，以利我進行 SDD 規格驗收：
1. **規格對照表 (Spec Traceability)：** 列出本次完成的功能，並明確標註對應到 PRD 的哪個章節。（格式：`[PRD X.X] 功能名稱 - 狀態: 完成`）
2. **異動檔案清單 (Modified/Created Files)：** 列出建立或修改的檔案路徑。
3. **安裝套件清單 (Dependencies)：** 若有新增安裝套件，請列出名稱與版本。
4. **執行與驗證步驟 (Verification Steps)：** 提示我接下來應該去 Firebase Console 獲取哪些金鑰填入 `.env.local`，以及重啟伺服器後畫面應有什麼變化。
5. **規格釐清與偏離警告 (Clarifications & Deviations)：** 若在非同步處理 (Promise.all) Firestore 讀取與 BingX API 請求時有效能或 Rate Limit 隱憂，請提出優化建議與你的替代方案。