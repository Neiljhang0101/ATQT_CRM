/**
 * xlsxImport.js - XLSX 匯入解析工具
 * SDD Traceability: step5_create_mb.md § 2. 實作 XLSX 匯入與資料合併邏輯
 *
 * 支援六種 BingX 匯出檔：
 *   A. USER-INFO-DATA （用戶資訊）: 2967/920 筆，欄位含 UID、信箱、邀請類型 等
 *   B. 近30天交易量   （交易量）  : 843/77/372/2595 筆，欄位含 UID、交易量、vip 等
 *
 * 帳號類型偵測 (account_type):
 *   - 檔名含 '舊帳號' 或 'DATA-1' → 'old'
 *   - 檔名含 '新帳號' 或 'DATA-2' → 'new'
 */
import * as XLSX from 'xlsx'

// ── 欄位映射表 ────────────────────────────────────────────────────

/** USER-INFO 欄位 → store key */
const USER_INFO_MAP = {
  'UID': 'uid',
  // '昵稱' 為 BingX 暱稱，不匯入 line_name（LINE 資料另外匯入）
  '信箱': 'official_email',
  '邀請人UID': 'inviter_uid_code',
  '邀請類型': 'invite_type',
  '已綁定邀請碼': 'bound_invite_code',
  '他的推廣邀請碼': 'own_promo_code',
  'vip等級': 'bingx_vip_level',
  '首充時間': 'first_deposit_time',
  '淨資產': 'total_assets',
  '註冊時間': 'bingx_register_date',
  'REMARK': '_remark_raw',  // 暫存，後面轉成 note_tags
}

/** 交易量欄位 → store key (注意「交易量(USDT) 」尾端有空格) */
const VOLUME_MAP = {
  'UID': 'uid',
  '交易量(USDT) ': 'volume_recent',
  '交易量(USDT)': 'volume_recent',   // 無尾端空格的容錯
  'vip等級': 'bingx_vip_level',
  'Referral Type': 'invite_type',    // 直接邀請 / 間接邀請
}

// ── 偵測函式 ─────────────────────────────────────────────────────

function detectFileType(headers) {
  const set = new Set(headers.map(h => String(h).trim()))
  if (set.has('信箱') && set.has('首充時間')) return 'user-info'
  // 含「交易量(USDT) 」或「交易量(USDT)」即視為交易量檔
  if ([...set].some(h => h.startsWith('交易量(USDT)'))) return 'volume'
  return 'unknown'
}

function detectAccountType(filename) {
  if (/舊帳號|DATA-1/i.test(filename)) return 'old'
  if (/新帳號|DATA-2/i.test(filename)) return 'new'
  return null
}

// ── 主要解析函式 ─────────────────────────────────────────────────

/**
 * 解析 XLSX File 物件，回傳客戶欄位物件陣列
 * @param {File} file  - 使用者上傳的 File 物件
 * @returns {Promise<{records: Array, fileType: string, accountType: string|null, count: number}>}
 */
export function parseXlsxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

        if (!rows || rows.length < 2) {
          resolve({ records: [], fileType: 'unknown', accountType: null, count: 0 })
          return
        }

        const headers = rows[0].map(h => h !== null ? String(h) : '')
        const fileType = detectFileType(headers)
        const accountType = detectAccountType(file.name)
        const records = []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          // 空行略過
          if (!row || row.every(v => v === null || v === '')) continue

          const raw = {}
          headers.forEach((h, idx) => { raw[h] = row[idx] !== undefined ? row[idx] : null })

          if (fileType === 'user-info') {
            const record = { account_type: accountType }
            for (const [xlsxKey, storeKey] of Object.entries(USER_INFO_MAP)) {
              const val = raw[xlsxKey]
              if (val !== null && val !== undefined) record[storeKey] = val
            }
            // uid 強制轉 String
            if (record.uid !== undefined) record.uid = String(record.uid)
            else continue  // 沒有 UID 略過

            // REMARK 轉成 note_tags 陣列
            const remark = record._remark_raw
            delete record._remark_raw
            record.note_tags = remark ? [String(remark)] : []

            // total_assets 轉數字
            if (record.total_assets !== undefined) {
              record.total_assets = parseFloat(record.total_assets) || 0
            }

            records.push(record)

          } else if (fileType === 'volume') {
            const record = { account_type: accountType }
            for (const [xlsxKey, storeKey] of Object.entries(VOLUME_MAP)) {
              if (raw[xlsxKey] !== null && raw[xlsxKey] !== undefined) {
                record[storeKey] = raw[xlsxKey]
              }
            }
            if (record.uid !== undefined) record.uid = String(record.uid)
            else continue

            // 交易量轉數字
            if (record.volume_recent !== undefined) {
              record.volume_recent = parseFloat(record.volume_recent) || 0
            }

            records.push(record)
          }
          // unknown 類型直接略過
        }

        resolve({ records, fileType, accountType, count: records.length })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsArrayBuffer(file)
  })
}
