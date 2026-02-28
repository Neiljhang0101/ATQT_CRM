/**
 * xlsxImport.js - XLSX 匯入解析工具
 * SDD Traceability: step5_create_mb.md § 2. 實作 XLSX 匯入與資料合併邏輯
 *
 * 支援六種 BingX 匯出檔 + 官網帳號/TVID/LINE名稱對照：
 *   A. USER-INFO-DATA （用戶資訊）: 欄位含 UID、信箱、邀請類型 等
 *   B. 近30天交易量   （交易量）  : 欄位含 UID、交易量、vip 等
 *   C. 官網帳號及TVID (account-tv): 欄位含 UID、官網信箱、TVID
 *   D. LINE名稱對照   (line-names): 欄位含 UID、LINE稱呼、LINE名字
 *
 * 帳號類型偵測 (account_type):
 *   - 檔名含 '舊帳號' 或 'DATA-1' → 'old'
 *   - 檔名含 '新帳號' 或 'DATA-2' → 'new'
 *
 * 多工作表支援：自動讀取所有 sheet，依標頭偵測類型並按 UID 合併。
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

/** 官網帳號及TVID對照 (名單 sheet) → store key */
const ACCOUNT_TV_MAP = {
  'UID': 'uid',
  '官網信箱': 'official_email',
  'TVID': 'tradingview_account',
}

/** LINE名稱對照 sheet → store key */
const LINE_NAMES_MAP = {
  'UID': 'uid',
  '您的LINE 稱呼(預計加入群組後所取的名字，請勿填寫錯誤)': 'line_name',
  '您的LINE名字(與官方帳號交談時顯示的名字)': 'line_display_name',
}

// ── 偵測函式 ─────────────────────────────────────────────────────

function detectFileType(headers) {
  const set = new Set(headers.map(h => String(h).trim()))
  if (set.has('信箱') && set.has('首充時間')) return 'user-info'
  // 含「交易量(USDT) 」或「交易量(USDT)」即視為交易量檔
  if ([...set].some(h => h.startsWith('交易量(USDT)'))) return 'volume'
  // 官網信箱 + TVID → account-tv
  if (set.has('TVID') && set.has('官網信箱')) return 'account-tv'
  // LINE 稱呼欄位（含部分比對）→ line-names
  if ([...set].some(h => h.includes('您的LINE 稱呼') || h.includes('您的LINE名字'))) return 'line-names'
  return 'unknown'
}

function detectAccountType(filename) {
  if (/舊帳號|DATA-1/i.test(filename)) return 'old'
  if (/新帳號|DATA-2/i.test(filename)) return 'new'
  return null
}

// ── 主要解析函式 ─────────────────────────────────────────────────

/**
 * 解析單一 sheet 的資料列，回傳 records 陣列
 * @private
 */
function parseSheet(rows, fileType, accountType) {
  const records = []
  const headers = rows[0].map(h => h !== null ? String(h) : '')

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(v => v === null || v === '')) continue

    const raw = {}
    headers.forEach((h, idx) => { raw[h] = row[idx] !== undefined ? row[idx] : null })

    if (fileType === 'user-info') {
      const record = { account_type: accountType }
      for (const [xlsxKey, storeKey] of Object.entries(USER_INFO_MAP)) {
        const val = raw[xlsxKey]
        if (val !== null && val !== undefined) record[storeKey] = val
      }
      if (record.uid !== undefined) record.uid = String(record.uid)
      else continue

      const remark = record._remark_raw
      delete record._remark_raw
      record.note_tags = remark ? [String(remark)] : []

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

      if (record.volume_recent !== undefined) {
        record.volume_recent = parseFloat(record.volume_recent) || 0
      }
      records.push(record)

    } else if (fileType === 'account-tv') {
      const record = {}
      for (const [xlsxKey, storeKey] of Object.entries(ACCOUNT_TV_MAP)) {
        const val = raw[xlsxKey]
        if (val !== null && val !== undefined && val !== '') record[storeKey] = val
      }
      if (record.uid !== undefined) record.uid = String(record.uid)
      else continue
      records.push(record)

    } else if (fileType === 'line-names') {
      const record = {}
      // 用 includes 模糊比對，避免欄位標頭含隱形字元造成 key 不符
      for (const h of headers) {
        const val = raw[h]
        if (val === null || val === undefined || val === '') continue
        if (h.trim() === 'UID') {
          record.uid = String(val)
        } else if (h.includes('LINE') && h.includes('稱呼')) {
          record.line_name = String(val)
        } else if (h.includes('LINE') && h.includes('名字')) {
          record.line_display_name = String(val)
        }
      }
      if (!record.uid) continue
      records.push(record)
    }
    // unknown 類型直接略過
  }
  return records
}

/**
 * 解析 XLSX File 物件，回傳客戶欄位物件陣列。
 * 自動讀取所有工作表，依標頭偵測類型，並按 UID 合併同一檔案內的多個 sheet 資料。
 * @param {File} file  - 使用者上傳的 File 物件
 * @returns {Promise<{records: Array, fileType: string, accountType: string|null, count: number}>}
 */
export function parseXlsxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const accountType = detectAccountType(file.name)

        // 以 UID 為 key 累積所有 sheet 的欄位
        const byUid = new Map()
        const detectedTypes = new Set()

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
          if (!rows || rows.length < 2) continue

          const headers = rows[0].map(h => h !== null ? String(h).trim() : '')
          const fileType = detectFileType(headers)
          if (fileType === 'unknown') continue

          detectedTypes.add(fileType)
          const sheetRecords = parseSheet(rows, fileType, accountType)

          for (const rec of sheetRecords) {
            if (!rec.uid) continue
            if (byUid.has(rec.uid)) {
              // 合併：非空值覆蓋
              const existing = byUid.get(rec.uid)
              for (const [k, v] of Object.entries(rec)) {
                if (v !== null && v !== undefined && v !== '') existing[k] = v
              }
            } else {
              byUid.set(rec.uid, { ...rec })
            }
          }
        }

        const records = [...byUid.values()]
        const typesArr = [...detectedTypes]
        const fileType = typesArr.length === 1
          ? typesArr[0]
          : typesArr.length > 1
            ? 'mixed'
            : 'unknown'

        resolve({ records, fileType, accountType, count: records.length })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsArrayBuffer(file)
  })
}
