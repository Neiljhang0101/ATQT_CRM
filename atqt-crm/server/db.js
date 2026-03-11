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
  uid                 TEXT PRIMARY KEY,
  line_name           TEXT,
  line_display_name   TEXT,
  official_email      TEXT,
  register_date       TEXT,
  first_deposit_time  TEXT,
  invite_type         TEXT,
  inviter_line_name   TEXT,
  text_notes          TEXT,
  indicator_version   TEXT,
  last_updated        TEXT,
  last_active_date    TEXT,
  in_advanced_group   INTEGER DEFAULT 0,
  has_traded          INTEGER DEFAULT 0,
  has_deposit         INTEGER DEFAULT 0,
  kyc                 INTEGER DEFAULT 0,
  account_type        TEXT,
  last_trade_date     TEXT,
  bingx_vip_level     TEXT,
  tradingview_account TEXT,
  note_tags           TEXT,
  bingx_register_date TEXT,
  inviter_uid_code    TEXT,
  bound_invite_code   TEXT,
  own_promo_code      TEXT
);

CREATE TABLE IF NOT EXISTS user_weekly_stats (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  uid                  TEXT    NOT NULL,
  year_week            TEXT    NOT NULL,
  record_date          TEXT,
  total_assets         REAL,
  volume_weekly        REAL,
  commission_weekly    REAL,
  trade_count_30d      INTEGER,
  line_msg_count       INTEGER,
  community_interaction INTEGER,
  rfm_score            INTEGER,
  rfm_tag              TEXT,
  UNIQUE(uid, year_week)
);

CREATE INDEX IF NOT EXISTS idx_uws_uid ON user_weekly_stats(uid);
`)

// Migration: 舊 DB 若缺少欄位就補上
// customers 欄位 migration
try { db.exec(`ALTER TABLE customers ADD COLUMN in_advanced_group INTEGER DEFAULT 0`)   ; console.log('[DB] Migration: 已新增 in_advanced_group')   } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN account_type TEXT`)                      ; console.log('[DB] Migration: 已新增 account_type')          } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN last_trade_date TEXT`)                   ; console.log('[DB] Migration: 已新增 last_trade_date')        } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN bingx_vip_level TEXT`)                  ; console.log('[DB] Migration: 已新增 bingx_vip_level')       } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN tradingview_account TEXT`)               ; console.log('[DB] Migration: 已新增 tradingview_account')   } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN note_tags TEXT`)                         ; console.log('[DB] Migration: 已新增 note_tags')             } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN bingx_register_date TEXT`)               ; console.log('[DB] Migration: 已新增 bingx_register_date')  } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN inviter_uid_code TEXT`)                  ; console.log('[DB] Migration: 已新增 inviter_uid_code')     } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN bound_invite_code TEXT`)                 ; console.log('[DB] Migration: 已新增 bound_invite_code')    } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN own_promo_code TEXT`)                    ; console.log('[DB] Migration: 已新增 own_promo_code')       } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN line_display_name TEXT`)                 ; console.log('[DB] Migration: 已新增 line_display_name')   } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN inviter_line_name TEXT`)                 ; console.log('[DB] Migration: 已新增 inviter_line_name')   } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN indicator_version TEXT`)                 ; console.log('[DB] Migration: 已新增 indicator_version')   } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN last_active_date TEXT`)                  ; console.log('[DB] Migration: 已新增 last_active_date')    } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN has_traded INTEGER DEFAULT 0`)           ; console.log('[DB] Migration: 已新增 has_traded')          } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN has_deposit INTEGER DEFAULT 0`)          ; console.log('[DB] Migration: 已新增 has_deposit')         } catch (_) {}
try { db.exec(`ALTER TABLE customers ADD COLUMN kyc INTEGER DEFAULT 0`)                  ; console.log('[DB] Migration: 已新增 kyc')                 } catch (_) {}
// user_weekly_stats 欄位 migration
try { db.exec(`ALTER TABLE user_weekly_stats ADD COLUMN trade_count_30d INTEGER`)        ; console.log('[DB] Migration: 已新增 weekly.trade_count_30d') } catch (_) {}
try { db.exec(`ALTER TABLE user_weekly_stats ADD COLUMN line_msg_count INTEGER`)         ; console.log('[DB] Migration: 已新增 weekly.line_msg_count')  } catch (_) {}

console.log(`[DB] SQLite 已連線：${DB_PATH}`)

// ── Prepared Statements ────────────────────────
const stmtUpsertCustomer = db.prepare(`
  INSERT INTO customers
    (uid, line_name, line_display_name, official_email, register_date, first_deposit_time,
     invite_type, inviter_line_name, text_notes, indicator_version, last_updated,
     last_active_date, in_advanced_group, has_traded, has_deposit, kyc,
     account_type, last_trade_date, bingx_vip_level, tradingview_account,
     note_tags, bingx_register_date, inviter_uid_code, bound_invite_code, own_promo_code)
  VALUES
    (@uid, @line_name, @line_display_name, @official_email, @register_date, @first_deposit_time,
     @invite_type, @inviter_line_name, @text_notes, @indicator_version, @last_updated,
     @last_active_date, @in_advanced_group, @has_traded, @has_deposit, @kyc,
     @account_type, @last_trade_date, @bingx_vip_level, @tradingview_account,
     @note_tags, @bingx_register_date, @inviter_uid_code, @bound_invite_code, @own_promo_code)
  ON CONFLICT(uid) DO UPDATE SET
    line_name           = COALESCE(@line_name, line_name),
    line_display_name   = COALESCE(@line_display_name, line_display_name),
    official_email      = COALESCE(@official_email, official_email),
    register_date       = COALESCE(@register_date, register_date),
    first_deposit_time  = COALESCE(@first_deposit_time, first_deposit_time),
    invite_type         = COALESCE(@invite_type, invite_type),
    inviter_line_name   = COALESCE(@inviter_line_name, inviter_line_name),
    text_notes          = COALESCE(@text_notes, text_notes),
    indicator_version   = COALESCE(@indicator_version, indicator_version),
    last_updated        = @last_updated,
    last_active_date    = CASE WHEN @last_active_date > last_active_date OR last_active_date IS NULL THEN @last_active_date ELSE last_active_date END,
    in_advanced_group   = CASE WHEN @in_advanced_group = 1 THEN 1 ELSE in_advanced_group END,
    has_traded          = CASE WHEN @has_traded = 1 THEN 1 ELSE has_traded END,
    has_deposit         = CASE WHEN @has_deposit = 1 THEN 1 ELSE has_deposit END,
    kyc                 = CASE WHEN @kyc = 1 THEN 1 ELSE kyc END,
    account_type        = COALESCE(@account_type, account_type),
    last_trade_date     = CASE WHEN @last_trade_date > last_trade_date OR last_trade_date IS NULL THEN @last_trade_date ELSE last_trade_date END,
    bingx_vip_level     = COALESCE(@bingx_vip_level, bingx_vip_level),
    tradingview_account = COALESCE(@tradingview_account, tradingview_account),
    note_tags           = COALESCE(@note_tags, note_tags),
    bingx_register_date = COALESCE(@bingx_register_date, bingx_register_date),
    inviter_uid_code    = COALESCE(@inviter_uid_code, inviter_uid_code),
    bound_invite_code   = COALESCE(@bound_invite_code, bound_invite_code),
    own_promo_code      = COALESCE(@own_promo_code, own_promo_code)
`)

const stmtUpsertWeekly = db.prepare(`
  INSERT OR REPLACE INTO user_weekly_stats
    (uid, year_week, record_date, total_assets, volume_weekly, commission_weekly,
     trade_count_30d, line_msg_count, community_interaction, rfm_score, rfm_tag)
  VALUES
    (@uid, @year_week, @record_date, @total_assets, @volume_weekly, @commission_weekly,
     @trade_count_30d, @line_msg_count, @community_interaction, @rfm_score, @rfm_tag)
`)

// 單獨更新指定 uid+week 的 LINE 訊息數（LINE 對話歷史批次寫入）
const stmtUpsertLineMsgWeek = db.prepare(`
  INSERT INTO user_weekly_stats (uid, year_week, record_date, line_msg_count)
  VALUES (@uid, @year_week, @record_date, @line_msg_count)
  ON CONFLICT(uid, year_week) DO UPDATE SET
    line_msg_count = @line_msg_count
`)

// ── 批次同步（Transaction） ────────────────────
export const syncUsers = db.transaction((yearWeek, users) => {
  const now = new Date().toISOString()
  let count = 0
  for (const u of users) {
    if (!u.uid) continue
    stmtUpsertCustomer.run({
      uid:                u.uid,
      line_name:          u.line_name           ?? null,
      line_display_name:  u.line_display_name   ?? null,
      official_email:     u.official_email       ?? null,
      register_date:      u.register_date        ?? null,
      first_deposit_time: u.first_deposit_time   ?? null,
      invite_type:        u.invite_type          ?? null,
      inviter_line_name:  u.inviter_line_name    ?? null,
      text_notes:         u.text_notes           ?? null,
      indicator_version:  u.indicator_version    ?? null,
      last_updated:       now,
      last_active_date:   u.last_active_date     ?? null,
      in_advanced_group:  u.in_advanced_group    ? 1 : 0,
      has_traded:         u.has_traded           ? 1 : 0,
      has_deposit:        u.has_deposit          ? 1 : 0,
      kyc:                u.kyc                  ? 1 : 0,
      account_type:       u.account_type         ?? null,
      last_trade_date:    u.last_trade_date       ?? null,
      bingx_vip_level:    u.bingx_vip_level      ?? null,
      tradingview_account: u.tradingview_account  ?? null,
      note_tags:          Array.isArray(u.note_tags) && u.note_tags.length > 0 ? JSON.stringify(u.note_tags) : null,
      bingx_register_date: u.bingx_register_date ?? null,
      inviter_uid_code:   u.inviter_uid_code     ?? null,
      bound_invite_code:  u.bound_invite_code    ?? null,
      own_promo_code:     u.own_promo_code       ?? null,
    })
    stmtUpsertWeekly.run({
      uid:                  u.uid,
      year_week:            yearWeek,
      record_date:          now,
      total_assets:         u.total_assets         ?? null,
      volume_weekly:        u.volume_weekly         ?? null,
      commission_weekly:    u.commission_weekly     ?? null,
      trade_count_30d:      u.trade_count_30d       ?? null,
      line_msg_count:       u.line_msg_count        ?? null,
      community_interaction: u.community_interaction ?? null,
      rfm_score:            u.rfm_score            ?? null,
      rfm_tag:              u.rfm_tag              ?? null,
    })
    count++
  }
  return count
})

/**
 * 批次寫入 LINE 對話歷史週訊息數（多週，不覆蓋其他週期欄位）
 * records: Array<{ uid, year_week, line_msg_count }>
 */
export const syncLineMsgHistory = db.transaction((records) => {
  const now = new Date().toISOString()
  let count = 0
  for (const r of records) {
    if (!r.uid || !r.year_week) continue
    stmtUpsertLineMsgWeek.run({
      uid:           r.uid,
      year_week:     r.year_week,
      record_date:   now,
      line_msg_count: r.line_msg_count ?? 0,
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

// ── 分眾走勢聚合（Dashboard 圖表用）────────────
export function getWeeklyTrend() {
  return db.prepare(
    `SELECT year_week, rfm_tag, COUNT(uid) AS count
     FROM user_weekly_stats
     WHERE rfm_tag IS NOT NULL AND rfm_tag != ''
     GROUP BY year_week, rfm_tag
     ORDER BY year_week ASC`
  ).all()
}

// ── 點擊下鑽：指定週 + 分眾的名單（JOIN）───────
export function getWeeklyDrilldown(yearWeek, rfmTag) {
  return db.prepare(
    `SELECT c.uid, c.line_name, c.line_display_name,
            w.total_assets, w.volume_weekly, w.rfm_score
     FROM user_weekly_stats w
     JOIN customers c ON w.uid = c.uid
     WHERE w.year_week = ? AND w.rfm_tag = ?
     ORDER BY w.total_assets DESC`
  ).all(yearWeek, rfmTag)
}

// ── 最新兩週 KPI 合計（WoW 比較用）────────────
export function getLatestTwoWeeksKpi() {
  const weeks = db.prepare(
    `SELECT DISTINCT year_week FROM user_weekly_stats ORDER BY year_week DESC LIMIT 2`
  ).all().map(r => r.year_week)
  const result = {}
  for (const w of weeks) {
    const row = db.prepare(
      `SELECT year_week,
              SUM(total_assets)  AS total_assets,
              SUM(volume_weekly) AS volume_weekly,
              COUNT(uid)         AS member_count,
              SUM(CASE WHEN rfm_tag IN ('核心VIP','高淨值') THEN 1 ELSE 0 END) AS high_value,
              SUM(CASE WHEN rfm_tag IN ('流失風險','沉睡') THEN 1 ELSE 0 END)  AS risk_count
       FROM user_weekly_stats WHERE year_week = ?`
    ).get(w)

    // 活躍用戶：進階群且近30天交易天數 > 10
    const activeRow = db.prepare(
      `SELECT COUNT(*) AS active_users
       FROM user_weekly_stats s
       JOIN customers c ON c.uid = s.uid
       WHERE s.year_week = ? AND c.in_advanced_group = 1 AND s.trade_count_30d > 10`
    ).get(w)

    // 中位數：進階群成員、排除 0 與 NULL，ORDER BY + LIMIT/OFFSET（偶數筆取兩值平均）
    const medianRow = db.prepare(`
      SELECT AVG(total_assets) AS median_assets FROM (
        SELECT s.total_assets
        FROM user_weekly_stats s
        JOIN customers c ON c.uid = s.uid
        WHERE s.year_week = ? AND s.total_assets IS NOT NULL AND s.total_assets > 0
          AND c.in_advanced_group = 1
        ORDER BY s.total_assets
        LIMIT 2 - (
          SELECT COUNT(*) FROM user_weekly_stats s2
          JOIN customers c2 ON c2.uid = s2.uid
          WHERE s2.year_week = ? AND s2.total_assets IS NOT NULL AND s2.total_assets > 0
            AND c2.in_advanced_group = 1
        ) % 2
        OFFSET (
          SELECT (COUNT(*) - 1) / 2 FROM user_weekly_stats s3
          JOIN customers c3 ON c3.uid = s3.uid
          WHERE s3.year_week = ? AND s3.total_assets IS NOT NULL AND s3.total_assets > 0
            AND c3.in_advanced_group = 1
        )
      )
    `).get(w, w, w)

    result[w] = { ...row, active_users: activeRow?.active_users ?? 0, median_assets: medianRow?.median_assets ?? null }
  }
  return { weeks, data: result }
}

// ── 匯出二進位 ─────────────────────────────────
export function getDbPath() { return DB_PATH }

export default db
