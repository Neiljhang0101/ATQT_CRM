/**
 * SQLite HTTP Client
 * SDD Traceability: step6_db.md § 1-4（後端版）
 *
 * 所有 DB 操作委派給 Express 後端（server/index.js :3001）
 * 前端透過 Vite proxy /api/db/* 存取，資料庫實體檔案在：
 *   atqt-crm/server/data/atqt_crm.sqlite
 */

// ── 初始化：Ping 後端伺服器 ────────────────────────────────────────────────

/**
 * Ping Express 後端，確認伺服器運作中
 */
export async function initDb() {
  const res = await fetch('/api/db/ping')
  if (!res.ok) throw new Error('[DB] 無法連接本機資料庫伺服器，請確認 npm run dev:server 已啟動')
  return true
}

// ── 查詢 ───────────────────────────────────────────────────────────────────

/**
 * 查詢所有客戶主表資料
 * @returns {Promise<Array<Object>>}
 */
export async function queryAllCustomers() {
  const res = await fetch('/api/db/customers')
  if (!res.ok) throw new Error('[DB] 查詢 customers 失敗')
  return res.json()
}

/**
 * 查詢全部用戶週歷史（最新 N 筆）
 * @param {number} limit
 * @returns {Promise<Array<Object>>}
 */
export async function queryAllWeekly(limit = 200) {
  const res = await fetch(`/api/db/weekly?limit=${limit}`)
  if (!res.ok) throw new Error('[DB] 查詢 user_weekly_stats 失敗')
  return res.json()
}

/**
 * 查詢指定 uid 的所有週歷史紀錄（依週數升冪）
 * @param {string} uid
 * @returns {Promise<Array<Object>>}
 */
export async function queryUserWeeklyHistory(uid) {
  const res = await fetch(`/api/db/weekly/history/${uid}`)
  if (!res.ok) throw new Error('[DB] 查詢週歷史失敗')
  return res.json()
}

// ── 匯出備份（直接開啟下載）────────────────────────────────────────────────

/**
 * 觸發瀏覽器下載 .sqlite 備份（由後端提供）
 */
export function exportDbFile() {
  window.open('/api/db/export', '_blank')
}

// ── 匯入備份 ───────────────────────────────────────────────────────────────

/**
 * 上傳 .sqlite 檔案至後端還原
 * @param {ArrayBuffer} buffer
 */
export async function importDbFile(buffer) {
  const res = await fetch('/api/db/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: buffer,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || '還原失敗')
  }
  return res.json()
}
