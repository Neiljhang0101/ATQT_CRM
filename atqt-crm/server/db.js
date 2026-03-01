/**
 * Express 後端：better-sqlite3 資料庫操作層
 * 資料庫檔案：server/data/atqt_crm.sqlite（磁碟實體檔）
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_PATH  = join(DATA_DIR, 'atqt_crm.sqlite')

// 確保 data/ 目錄存在
mkdirSync(DATA_DIR, { recursive: true })

// ── 初始化 ─────────────────────────────────────
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')   // 寫入效能優化

db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  uid               TEXT PRIMARY KEY,
  line_name         TEXT,
  official_email    TEXT,
  register_date     TEXT,
  first_deposit_time TEXT,
  invite_type       TEXT,
  text_notes        TEXT,
  last_updated      TEXT
);

CREATE TABLE IF NOT EXISTS user_weekly_stats (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  uid                  TEXT    NOT NULL,
  year_week            TEXT    NOT NULL,
  record_date          TEXT,
  total_assets         REAL,
  volume_weekly        REAL,
  commission_weekly    REAL,
  community_interaction INTEGER,
  rfm_score            INTEGER,
  rfm_tag              TEXT,
  UNIQUE(uid, year_week)
);

CREATE INDEX IF NOT EXISTS idx_uws_uid ON user_weekly_stats(uid);
`)

console.log(`[DB] SQLite 已連線：${DB_PATH}`)

// ── Prepared Statements ────────────────────────
const stmtUpsertCustomer = db.prepare(`
  INSERT OR REPLACE INTO customers
    (uid, line_name, official_email, register_date, first_deposit_time,
     invite_type, text_notes, last_updated)
  VALUES
    (@uid, @line_name, @official_email, @register_date, @first_deposit_time,
     @invite_type, @text_notes, @last_updated)
`)

const stmtUpsertWeekly = db.prepare(`
  INSERT OR REPLACE INTO user_weekly_stats
    (uid, year_week, record_date, total_assets, volume_weekly, commission_weekly,
     community_interaction, rfm_score, rfm_tag)
  VALUES
    (@uid, @year_week, @record_date, @total_assets, @volume_weekly, @commission_weekly,
     @community_interaction, @rfm_score, @rfm_tag)
`)

// ── 批次同步（Transaction） ────────────────────
export const syncUsers = db.transaction((yearWeek, users) => {
  const now = new Date().toISOString()
  let count = 0
  for (const u of users) {
    if (!u.uid) continue
    stmtUpsertCustomer.run({
      uid:                u.uid,
      line_name:          u.line_name          ?? null,
      official_email:     u.official_email      ?? null,
      register_date:      u.register_date       ?? null,
      first_deposit_time: u.first_deposit_time  ?? null,
      invite_type:        u.invite_type         ?? null,
      text_notes:         u.text_notes          ?? null,
      last_updated:       now,
    })
    stmtUpsertWeekly.run({
      uid:                  u.uid,
      year_week:            yearWeek,
      record_date:          now,
      total_assets:         u.total_assets         ?? null,
      volume_weekly:        u.volume_weekly         ?? null,
      commission_weekly:    u.commission_weekly     ?? null,
      community_interaction: u.community_interaction ?? null,
      rfm_score:            u.rfm_score            ?? null,
      rfm_tag:              u.rfm_tag              ?? null,
    })
    count++
  }
  return count
})

// ── 查詢 ───────────────────────────────────────
export function getAllCustomers() {
  return db.prepare(`SELECT * FROM customers ORDER BY last_updated DESC`).all()
}

export function getAllWeekly(limit = 200) {
  return db.prepare(
    `SELECT * FROM user_weekly_stats ORDER BY year_week DESC, uid ASC LIMIT ?`
  ).all(limit)
}

export function getUserWeeklyHistory(uid) {
  return db.prepare(
    `SELECT * FROM user_weekly_stats WHERE uid = ? ORDER BY year_week ASC`
  ).all(uid)
}

// ── 匯出二進位 ─────────────────────────────────
export function getDbPath() { return DB_PATH }

export default db
