/**
 * lineImport.js - LINE 對話紀錄 XLSX 匯入工具
 *
 * 解析 line-chat-parser 輸出的月份對話 xlsx（欄位：日期、時間、發言者暱稱、訊息內容）
 * 回傳：
 *   weeklyStats : { uid → { "2026-W04": count, ... } }   每週訊息數統計
 *   nickMap     : { uid → latestNickname }               最新暱稱（LINE顯示名稱）
 *   summary     : { totalMessages, uniqueUsers, weeks[] } 摘要
 *
 * 發言者暱稱格式（UID 提取規則）：
 *   "31999395-新手-麻了126"  → UID=31999395, nick=新手-麻了126
 *   "29997201_心態Eason1029" → UID=29997201, nick=心態Eason1029
 *   "32892471"               → UID=32892471, nick=null
 *   "ATQT_埋伏_Neil"        → 無 UID，略過
 */
import * as XLSX from 'xlsx'

// ── 工具函式 ──────────────────────────────────────────────────────

/**
 * 取得週次 key，格式 "YYYY-MM-DD"（該週週日的日期，週日起、週六止）
 * 支援：
 *   - "YYYY-MM-DD" / "YYYY/MM/DD" 字串
 *   - JavaScript Date 物件
 *   - Excel 日期序號（正整數 > 20000）
 * @param {string|number|Date} dateVal
 * @returns {string|null}
 */
export function getISOWeekKey(dateVal) {
  let d
  if (dateVal instanceof Date) {
    d = new Date(Date.UTC(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate()))
  } else if (typeof dateVal === 'number' && dateVal > 20000) {
    // Excel 日期序號：1 = 1900-01-01
    d = new Date(Math.round((dateVal - 25569) * 86400 * 1000))
  } else {
    const s = String(dateVal).trim().replace(/\//g, '-')
    if (!/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return null
    d = new Date(s.slice(0, 10) + 'T00:00:00Z')
  }
  if (!d || isNaN(d.getTime())) return null
  const dow = d.getUTCDay() // 0=週日, 6=週六
  d.setUTCDate(d.getUTCDate() - dow) // 退到該週週日
  return d.toISOString().slice(0, 10)
}

/**
 * 從「發言者暱稱」欄位提取 UID 與暱稱
 * @param {string} speaker
 * @returns {{ uid: string|null, nick: string|null }}
 */
export function parseSpeaker(speaker) {
  if (!speaker) return { uid: null, nick: null }
  const s = String(speaker).trim()
  // 必須以 7~10 位數字開頭（BingX UID 範圍）
  const m = s.match(/^(\d{7,10})([-_](.+))?$/)
  if (!m) return { uid: null, nick: null }
  const uid = m[1]
  const nick = m[3] ? m[3].trim() || null : null
  return { uid, nick }
}

// ── 主要解析函式 ──────────────────────────────────────────────────

/**
 * 解析 LINE 對話 XLSX File 物件
 * @param {File} file
 * @returns {Promise<{
 *   weeklyStats: Object,
 *   nickMap: Object,
 *   summary: { totalMessages: number, uniqueUsers: number, weeks: string[] }
 * }>}
 */
export function parseLineChatXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })

        /** @type {{ uid: string, week: string, nick: string|null }[]} */
        const allEntries = []

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
          if (!rows || rows.length < 2) continue

          // 偵測欄位索引（支援多語言/自訂順序）
          const headers = rows[0].map(h => h !== null ? String(h).trim() : '')
          const idxDate    = headers.findIndex(h => h === '日期')
          const idxSpeaker = headers.findIndex(h => h === '發言者暱稱')
          if (idxDate < 0 || idxSpeaker < 0) {
            console.warn(`[LINE匯入] Sheet "${sheetName}" 缺少欄位，現有欄位：`, headers.filter(h=>h).join(' | '))
            continue  // 不是 LINE 對話格式，略過
          }

          let sheetRows = 0, skippedDate = 0, skippedSpeaker = 0

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i]
            if (!row) continue
            const dateVal    = row[idxDate]
            const speakerVal = row[idxSpeaker]
            if (!dateVal || !speakerVal) continue

            const week = getISOWeekKey(dateVal)
            if (!week) { skippedDate++; continue }

            const { uid, nick } = parseSpeaker(speakerVal)
            if (!uid) { sheetRows++; skippedSpeaker++; continue }

            sheetRows++
            allEntries.push({ uid, week, nick })
          }
          console.log(`[LINE匯入] Sheet "${sheetName}":有效 ${sheetRows} 行，日期無效跳過 ${skippedDate}，非客戶發言跳過 ${skippedSpeaker}`)
        }

        // ── 彙整每週統計 ──
        // weeklyStats[uid][weekKey] = count
        const weeklyStats = {}
        // nickMap[uid] = 最後一筆有 nick 的暱稱（檔案中最後出現）
        const nickMap = {}
        const weekSet = new Set()

        for (const { uid, week, nick } of allEntries) {
          if (!weeklyStats[uid]) weeklyStats[uid] = {}
          weeklyStats[uid][week] = (weeklyStats[uid][week] || 0) + 1
          weekSet.add(week)
          if (nick) nickMap[uid] = nick  // 後面的暱稱覆蓋前面（記錄最新）
        }

        const summary = {
          totalMessages: allEntries.length,
          uniqueUsers  : Object.keys(weeklyStats).length,
          weeks        : [...weekSet].sort(),
        }

        resolve({ weeklyStats, nickMap, summary })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = err => reject(err)
    reader.readAsArrayBuffer(file)
  })
}
