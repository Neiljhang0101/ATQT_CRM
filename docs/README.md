# ATQT CRM 專案文件索引

> **SDD 最高原則：** 所有功能的設計依據，以本目錄下的文件為唯一真理 (Single Source of Truth)。  
> 實作前請先確認 PRD 版本，有變更需求請提交 CR，不得直接修改程式碼繞過規格。

---

## 文件清單

| 文件 | 說明 | 版本 |
|---|---|---|
| [ATQT_CRM_PRD_v1.1.md](./ATQT_CRM_PRD_v1.1.md) | **主規格書**（唯一真理）| v1.1 |
| [Development_Plan.md](./Development_Plan.md) | 六階段開發計畫與驗收標準 | - |
| [change_requests/](./change_requests/) | 所有已提交的需求變更單 | - |

---

## 變更單 (Change Requests) 清單

| CR 編號 | 標題 | 狀態 | 對應 PRD 版本 |
|---|---|---|---|
| [CR-001](./change_requests/CR-001_雙帳號API支援.md) | 雙帳號 BingX API 支援 | ✅ 已實作 | v1.1 → v1.2 |

---

## SDD 工作流程

```
1. 有新需求 → 填寫 change_requests/CR-XXX.md
2. 更新 README 變更單清單
3. Agent 執行 Impact Analysis → 修改程式碼
4. 輸出執行報告，更新 PRD 版本號
```
