/**
 * ATQT CRM – Express 後端伺服器
 * 埠號：3001
 * 路由前綴：/api/db
 */

import express from 'express'
import { createReadStream, statSync } from 'fs'
import { syncUsers, getAllCustomers, getAllWeekly, getUserWeeklyHistory, getDbPath } from './db.js'

const app = express()
const PORT = 3001

app.use(express.json({ limit: '10mb' }))
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }))

// CORS（僅供本機 Vite dev server 呼叫）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ── Ping ───────────────────────────────────────
app.get('/api/db/ping', (req, res) => {
  res.json({ ok: true, message: 'SQLite 伺服器運作中' })
})

// ── 批次同步（每週結算）────────────────────────
app.post('/api/db/sync', (req, res) => {
  try {
    const { yearWeek, users } = req.body
    if (!yearWeek || !Array.isArray(users)) {
      return res.status(400).json({ ok: false, message: '缺少 yearWeek 或 users' })
    }
    const count = syncUsers(yearWeek, users)
    console.log(`[DB] 同步完成：${yearWeek}，共 ${count} 筆`)
    res.json({ ok: true, week: yearWeek, count })
  } catch (e) {
    console.error('[DB] sync error:', e)
    res.status(500).json({ ok: false, message: e.message })
  }
})

// ── 查詢客戶主表 ───────────────────────────────
app.get('/api/db/customers', (req, res) => {
  try {
    res.json(getAllCustomers())
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

// ── 查詢週歷史（全部用戶，最新 N 筆）──────────
app.get('/api/db/weekly', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200
    res.json(getAllWeekly(limit))
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

// ── 查詢單一用戶的週歷史 ───────────────────────
app.get('/api/db/weekly/history/:uid', (req, res) => {
  try {
    res.json(getUserWeeklyHistory(req.params.uid))
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

// ── 下載 .sqlite 備份 ──────────────────────────
app.get('/api/db/export', (req, res) => {
  try {
    const path = getDbPath()
    const stat = statSync(path)
    const date = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="atqt_crm_${date}.sqlite"`)
    res.setHeader('Content-Length', stat.size)
    createReadStream(path).pipe(res)
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

// ── 上傳還原 .sqlite ───────────────────────────
app.post('/api/db/import', async (req, res) => {
  try {
    const { writeFileSync } = await import('fs')
    const path = getDbPath()
    writeFileSync(path, req.body)
    // 重新載入模組（簡易做法：提示前端重啟伺服器）
    res.json({ ok: true, message: '還原成功，請重新啟動伺服器以套用變更' })
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`[ATQT CRM Server] 運行於 http://localhost:${PORT}`)
  console.log(`[ATQT CRM Server] 資料庫位置：${getDbPath()}`)
})
