import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAgencyInvitees, getSubAccountAssets, commissionFetch, OLD_API_KEY, OLD_SECRET_KEY, NEW_API_KEY, NEW_SECRET_KEY } from '../api/bingx.js'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { initDb, exportDbFile, importDbFile } from '../database/sqlite.js'

dayjs.extend(isoWeek)

/**
 * 客戶資料預設結構 (20 欄位)
 * SDD Traceability: step5_create_mb.md § 1. 擴充 Pinia 資料庫結構
 */
export function createDefaultUser(overrides = {}) {
  return {
    uid: '',                   // 1. BingX UID
    account_type: null,        // 2. 新/舊帳號 ('new'|'old')
    invite_type: null,         // 3. 直接/間接邀請
    inviter_uid_code: null,    // 4. 邀請人 UID / 邀請碼
    bound_invite_code: null,   // 4b. 已綁定邀請碼
    own_promo_code: null,      // 4c. 他的推廣邀請碼
    inviter_line_name: null,   // 5. 邀請人 LINE 暱稱
    line_name: null,           // 6. LINE 暱稱
    line_display_name: null,   // 6b. LINE 名字（官方帳號顯示名稱）
    register_date: null,       // 7. 註冊日期
    volume_recent: null,       // 8. 近期交易量 (Number)
    total_assets: null,        // 9. 總資產 (Number)
    last_trade_date: null,     // 10. 最後交易日
    official_email: null,      // 11. 官網信箱
    tradingview_account: null, // 12. TradingView 帳號
    bingx_register_date: null, // 13. BingX 註冊日期
    rfm_score_tag: null,       // 14. RFM 分數/分眾標籤
    note_tags: [],             // 15. 備註標籤 (Array)
    text_notes: null,          // 16. 文字備註
    indicator_version: null,   // 17. 指標版本
    community_interaction: null, // 18. 社群互動度
    bingx_vip_level: null,     // 19. BingX VIP 等級
    first_deposit_time: null,  // 20. 首次入金時間
    last_active_date: null,    // 21. 虛擬最後活躍日 YYYY-MM-DD（SDD Spec: 每週匯入心跳更新機制）
    in_advanced_group: false,  // 22. 是否在進階群內
    // ── 以下為 API 同步欄位（非 XLSX 匯入範疇） ──
    source: null,
    balance: null,
    volume_30d: null,
    trade_count_30d: 0,
    last_trade_timestamp: null,
    register_timestamp: null,
    has_traded: false,
    has_deposit: false,
    kyc: false,
    line_msg_count_7d: 0,
    line_weekly_msgs: {},      // { "2026-W04": 5, "2026-W05": 3, ... } 每週訊息數（LINE對話匯入）
    rfm_score: null,
    tags: [],
    ...overrides,
  }
}

export const useCrmStore = defineStore('crm', () => {
  // ── 原始資料 ──────────────────────────────────
  /** @type {import('vue').Ref<Array>} 所有客戶資料 */
  const users = ref([])

  /** @type {import('vue').Ref<boolean>} 是否正在載入 */
  const loading = ref(false)

  /** @type {import('vue').Ref<string|null>} 最後同步時間 */
  const lastSyncTime = ref(null)

  /** @type {import('vue').Ref<boolean>} SQLite 資料庫是否已就緒 */
  const dbReady = ref(false)

  /** 初始化 SQLite 資料庫（應用啟動時呼叫一次） */
  async function initDatabase() {
    await initDb()
    dbReady.value = true
  }

  // ── Getters ───────────────────────────────────

  /** VIP 名單：餘額 > 5000 USDT */
  const vipUsers = computed(() =>
    users.value.filter(u => u.balance > 5000)
  )

  /** 沉睡戶：last_active_date 超過 30 天（或從未有活躍紀錄），且非新手保護期內
   * SDD Spec: 每週匯入心跳更新機制 */
  const sleepingUsers = computed(() => {
    const now = Date.now()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    return users.value.filter(u => {
      // 新手保護期（7 天內）不算沉睡
      const regDate = u.register_date || u.bingx_register_date
      const fdDate = u.first_deposit_time
      const refDate = regDate || fdDate
      if (refDate && now - new Date(refDate).getTime() <= sevenDaysMs) return false
      // 優先用 last_active_date，退而使用 last_trade_date
      const activeDate = u.last_active_date || u.last_trade_date
      if (!activeDate) return true
      return now - new Date(activeDate).getTime() > thirtyDaysMs
    })
  })

  /**
   * 計算 RFM R 分數 (1-5) ── SDD Spec: 每週匯入心跳更新機制
   * @param {Object} u  完整 user 物件
   * @returns {{ r: number, rfm_tag: string|null }}
   */
  function calcRScore(u) {
    const now = Date.now()
    const dayMs = 1000 * 60 * 60 * 24

    // 第一優先：新手保護期（register_date 或 first_deposit_time 距今 <= 7 天）
    const regDate = u.register_date || u.bingx_register_date
    const fdDate = u.first_deposit_time
    const refDate = regDate || fdDate
    if (refDate) {
      const regDays = (now - new Date(refDate).getTime()) / dayMs
      if (regDays <= 7) return { r: 5, rfm_tag: '🌟 新手待破蛋' }
    }

    // 第二優先：依賴虛擬活躍日（last_active_date），退而使用 last_trade_date
    const activeDate = u.last_active_date || u.last_trade_date
    if (!activeDate) return { r: 1, rfm_tag: '💤 沉睡流失風險' }

    const days = (now - new Date(activeDate).getTime()) / dayMs
    if (days <= 7)  return { r: 5, rfm_tag: null }
    if (days <= 14) return { r: 4, rfm_tag: null }
    if (days <= 30) return { r: 3, rfm_tag: null }
    if (days <= 60) return { r: 2, rfm_tag: null }
    return { r: 1, rfm_tag: '💤 沉睡流失風險' }
  }

  /** 計算 RFM M 分數 (1-5) */
  function calcMScore(balance, volume30d) {
    if (balance > 5000 || volume30d > 3000000) return 5
    if (balance > 2000 || volume30d > 1000000) return 4
    if (balance > 500 || volume30d > 300000) return 3
    if (balance > 100 || volume30d > 50000) return 2
    return 1
  }

  /** 計算 RFM F 分數 (1-5) */
  function calcFScore(lineMsgCount7d, tradeCount30d) {
    const combined = (lineMsgCount7d || 0) / 10 + (tradeCount30d || 0)
    if (combined >= 20) return 5
    if (combined >= 10) return 4
    if (combined >= 5) return 3
    if (combined >= 2) return 2
    return 1
  }

  /**
   * 根據 R/F/M 分數與用戶狀態產生分眾標籤陣列
   * SDD Traceability: step3_RFM.md § 動態標籤
   */
  function calcTags(u, r, f, m, rfm_tag) {
    const tags = []
    const msgCount = u.line_msg_count_7d || 0

    // 第一優先：新手待破蛋（直接回傳，不進 8 象限）
    if (rfm_tag === '🌟 新手待破蛋') {
      tags.push('🌟 新手待破蛋')
      if (msgCount >= 100)     tags.push('💬 社群超高互動')
      else if (msgCount >= 50) tags.push('💬 社群高互動')
      else if (msgCount >= 10) tags.push('💬 社群互動中')
      // 新手不觸發社群低互動
      return tags
    }

    // 8 象限分眾（R/F/M 二元化：≥ 3 為高，≤ 2 為低）
    // SDD Traceability: step3_RFM.md § 四、分眾標籤邏輯
    const rH = r >= 3
    const fH = f >= 3
    const mH = m >= 3

    if      ( rH &&  fH &&  mH) tags.push('👑 核心VIP')
    else if ( rH && !fH &&  mH) tags.push('💰 資金型活躍戶')
    else if (!rH &&  fH &&  mH) tags.push('⚡ 高淨值沉默戶')
    else if (!rH && !fH &&  mH) tags.push('🚨 大戶流失危機')
    else if ( rH &&  fH && !mH) tags.push('📊 活躍成長戶')
    else if ( rH && !fH && !mH) tags.push('📉 輕倉回訪戶')
    else if (!rH &&  fH && !mH) tags.push('🔄 老客低迷戶')
    else                         tags.push('💤 休眠待喚醒')

    // 行為疊加標籤
    if (u.has_deposit && !u.has_traded) tags.push('🌱 入金未交易')

    // 社群互動頻率（所有非新手用戶皆觸發）
    if (msgCount >= 100)     tags.push('💬 社群超高互動')
    else if (msgCount >= 50) tags.push('💬 社群高互動')
    else if (msgCount >= 10) tags.push('💬 社群互動中')
    else                     tags.push('🔇 社群低互動')

    return tags
  }

  // ── Actions ───────────────────────────────────

  /** 合併 API 資料至 users store（空值不覆蓋既有非空值） */
  function mergeUsers(newData) {
    newData.forEach(incoming => {
      const idx = users.value.findIndex(u => u.uid === incoming.uid)
      if (idx > -1) {
        const current = users.value[idx]
        const merged = { ...current }
        for (const [key, val] of Object.entries(incoming)) {
          // null/undefined 不覆蓋既有非空值（保留歷史 last_trade_date 等欄位）
          if (val !== null && val !== undefined) {
            merged[key] = val
          }
        }
        users.value[idx] = merged
      } else {
        users.value.push(incoming)
      }
    })
    // 重算 RFM
    users.value = users.value.map(u => {
      const { r, rfm_tag } = calcRScore(u)
      const f = calcFScore(u.line_msg_count_7d, u.trade_count_30d)
      const m = calcMScore(u.balance, u.volume_recent ?? u.volume_30d)
      return { ...u, rfm_score: { r, f, m }, tags: calcTags(u, r, f, m, rfm_tag) }
    })
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
  }

  function setLoading(val) {
    loading.value = val
  }

  /**
   * 分段查詢近 30 天傭金明細（每段最大 7 天，共 5 段，每頁 100 筆）
   * 避免單次請求過多觸發 rate limit，每頁間加入 120ms 間隔
   * @param {import('axios').AxiosInstance} apiInstance
   * @returns {Promise<Array>}
   */
  async function fetchAllCommissionPages(apiInstance, sourceLabel) {
    const apiKey    = sourceLabel === 'new' ? NEW_API_KEY    : OLD_API_KEY
    const secretKey = sourceLabel === 'new' ? NEW_SECRET_KEY : OLD_SECRET_KEY
    const PAGE_SIZE = 100
    const WINDOW_MS = 7 * 24 * 60 * 60 * 1000
    const TOTAL_WINDOWS = 5
    const DELAY_MS = 120
    const allItems = []
    const seen = new Set()
    const sleep = ms => new Promise(r => setTimeout(r, ms))

    for (let w = 0; w < TOTAL_WINDOWS; w++) {
      const endTime = Date.now() - w * WINDOW_MS
      const startTime = endTime - WINDOW_MS
      let pageIndex = 1
      while (true) {
        try {
          const res = await commissionFetch(apiKey, secretKey, { startTime, endTime, pageIndex, pageSize: PAGE_SIZE })
          const list = res?.data?.list ?? []
          if (!Array.isArray(list) || list.length === 0) break
          list.forEach(item => {
            const key = `${item.uid}_${item.commissionTime}`
            if (!seen.has(key)) { seen.add(key); allItems.push(item) }
          })
          if (list.length < PAGE_SIZE) break
          pageIndex++
          await sleep(DELAY_MS)
        } catch (err) {
          console.error(`[commission] w=${w} page=${pageIndex} ERROR:`, err?.message ?? err)
          break
        }
      }
      await sleep(DELAY_MS)
    }
    return allItems
  }

  /**
   * 循環抓取所有頁的下線名單（BingX 每頁最多 200 筆）
   * @param {import('axios').AxiosInstance} apiInstance
   * @returns {Promise<Array>}
   */
  async function fetchAllInviteePages(apiInstance) {
    const PAGE_SIZE = 200
    const DELAY_MS = 120
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    let pageIndex = 1
    let allItems = []
    while (true) {
      const res = await getAgencyInvitees(apiInstance, { pageIndex, pageSize: PAGE_SIZE })
      const list = res?.data?.list ?? []
      if (!Array.isArray(list) || list.length === 0) break
      allItems = allItems.concat(list)
      if (list.length < PAGE_SIZE) break
      pageIndex++
      await sleep(DELAY_MS)
    }
    return allItems
  }

  /**
   * 並行呼叫三支 API，以 uid 合併後存入 store
   * @param {import('axios').AxiosInstance} apiInstance  傳入 oldApi 或 newApi
   * @param {'old'|'new'} sourceLabel
   * @returns {Promise<number>} 同步筆數
   */
  async function fetchAccount(apiInstance, sourceLabel) {
    const [inviteesResult, commissionResult, assetsRes] = await Promise.allSettled([
      fetchAllInviteePages(apiInstance),
      fetchAllCommissionPages(apiInstance, sourceLabel),   // 新版 v2 每日傭金 API
      getSubAccountAssets(apiInstance),
    ])

    // ── 解析下線名單 ──────────────────────────────────────────
    console.log(`[${sourceLabel}] inviteesResult:`, inviteesResult)
    console.log(`[${sourceLabel}] commissionResult:`, commissionResult)
    console.log(`[${sourceLabel}] assetsRes:`, assetsRes)

    const inviteeList =
      inviteesResult.status === 'fulfilled' ? inviteesResult.value : []

    // ── 解析最近 7 天傭金明細 → 每 uid 累計交易量、最新傭金日、近期有無交易 ──
    // 欄位：uid, commissionTime(ms), tradingVolume(USDT string)
    const commissionRaw =
      commissionResult.status === 'fulfilled' ? commissionResult.value : []

    const commissionMap = {}   // uid → { volume, lastTime, hasRecentTrade }
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    if (Array.isArray(commissionRaw)) {
      commissionRaw.forEach(item => {
        const uid = String(item.uid ?? '')
        if (!uid) return
        if (!commissionMap[uid]) {
          commissionMap[uid] = { volume: 0, lastTime: null, hasRecentTrade: false, tradeCount: 0 }
        }
        const vol = parseFloat(item.tradingVolume ?? 0) || 0
        commissionMap[uid].volume += vol
        if (vol > 0) commissionMap[uid].tradeCount += 1
        // hasRecentTrade 僅計近 7 天（用於心跳更新 last_active_date）
        if (vol > 0 && item.commissionTime >= sevenDaysAgo) {
          commissionMap[uid].hasRecentTrade = true
        }
        const t = item.commissionTime ?? null
        if (t && (!commissionMap[uid].lastTime || t > commissionMap[uid].lastTime)) {
          commissionMap[uid].lastTime = t
        }
      })
    }

    // ── 解析子帳戶資產 → uid → USDT balance（選用，API 權限不足時略過）──
    const assetsRaw =
      assetsRes.status === 'fulfilled'
        ? (assetsRes.value?.data?.balances
          ?? assetsRes.value?.data?.balance
          ?? assetsRes.value?.data?.list
          ?? assetsRes.value?.data
          ?? [])
        : []

    const assetsMap = {}
    if (Array.isArray(assetsRaw)) {
      assetsRaw.forEach(item => {
        const uid = String(item.uid ?? item.userId ?? '')
        if (!uid) return
        const usdt = Array.isArray(item.assets)
          ? (item.assets.find(a => a.asset === 'USDT' || a.coin === 'USDT') ?? {})
          : item
        assetsMap[uid] = parseFloat(
          usdt.free ?? usdt.balance ?? usdt.availableAmount ?? item.free ?? 0
        )
      })
    }

    // ── 合併三份資料 ──────────────────────────────────────────
    // 實際 API 欄位（測試確認）：
    //   uid, registerDateTime (ms), balanceVolume (string), trade (bool),
    //   inviterSid, kycResult (bool), deposit (bool), inviteCode
    const merged = Array.isArray(inviteeList)
      ? inviteeList.map(item => {
          const uid = String(item.uid ?? '')
          const cm = commissionMap[uid] ?? {}
          // registerDateTime 是實際欄位名（registerTime 是文件誤植）
          const regTs = item.registerDateTime ?? item.registerTime ?? null
          // balanceVolume 回傳為字串，優先使用 assets API，次之取 invitee 回傳
          const balance = assetsMap[uid] != null
            ? assetsMap[uid]
            : (item.balanceVolume != null ? parseFloat(item.balanceVolume) : null)
          const todayStr = new Date().toISOString().slice(0, 10)
          return {
            uid,
            source: sourceLabel,
            register_date: regTs
              ? new Date(regTs).toLocaleDateString('zh-TW')
              : null,
            register_timestamp: regTs,
            balance,
            volume_30d: cm.volume > 0 ? cm.volume : null,
            volume_recent: cm.volume > 0 ? cm.volume : null,
            trade_count_30d: cm.tradeCount ?? 0,
            last_trade_date: cm.lastTime
              ? new Date(cm.lastTime).toISOString().slice(0, 10)
              : null,
            // hasRecentTrade = 近 7 天有交易量 → 更新心跳日期；否則不含此 key 避免覆蓋歷史值
            ...(cm.hasRecentTrade ? { last_active_date: todayStr } : {}),
            last_trade_timestamp: cm.lastTime,
            has_traded: item.trade ?? false,
            has_deposit: item.deposit ?? false,
            kyc: item.kycResult ?? false,
            account_type: sourceLabel,
            bingx_register_date: regTs ? new Date(regTs).toISOString().slice(0, 10) : null,
            inviter_uid_code: (item.inviterSid != null && item.inviterSid !== 0 && item.inviterSid !== '0') ? String(item.inviterSid) : null,
            invite_type: item.directInvitation != null ? (item.directInvitation ? '直接' : '間接') : null,
            bound_invite_code: item.inviteCode || null,
            own_promo_code: item.ownInviteCode || null,
            bingx_vip_level: (item.userLevel != null && item.userLevel !== 0) ? String(item.userLevel) : null,
            total_assets: balance,
            line_name: null,
            // 注意：不在此設定 line_msg_count_7d，避免覆蓋 LINE 對話匯入的真實訊息數
          }
        })
      : []

    mergeUsers(merged)
    return merged.length
  }

  /**
   * 匯入 XLSX 解析後的記錄（以 uid 為基準合併）
   * SDD Traceability: step5_create_mb.md § 2. 合併邏輯
   * @param {Array} records - parseXlsxFile 回傳的 records
   */
  function importXlsxRecords(records) {
    let importedCount = 0
    let updatedCount = 0

    // SDD Spec: 每週匯入心跳更新機制 ── 取今日日期作為心跳戳記
    const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    records.forEach(incoming => {
      if (!incoming.uid) return
      const idx = users.value.findIndex(u => u.uid === incoming.uid)

      // SDD Spec: 每週匯入心跳更新機制
      // volume_recent > 0 → 本週有交易，強制更新 last_active_date 為今日
      // volume_recent == 0 或空 → 僅更新 volume_recent，絕不覆蓋歷史 last_active_date
      const vol = parseFloat(incoming.volume_recent)
      const hasVolume = !isNaN(vol) && vol > 0

      if (idx > -1) {
        // 合併：XLSX 欄位覆蓋/補充，但空值不覆蓋既有非空值
        const current = users.value[idx]
        const merged = { ...current }
        for (const [key, val] of Object.entries(incoming)) {
          if (val !== null && val !== undefined && val !== '') {
            if (key === 'note_tags' && Array.isArray(val) && val.length > 0) {
              // 合併標籤，去重
              const existing = Array.isArray(merged.note_tags) ? merged.note_tags : []
              merged.note_tags = [...new Set([...existing, ...val])]
            } else {
              merged[key] = val
            }
          }
        }
        // SDD Spec: 每週匯入心跳更新機制 ── 心跳更新
        if (hasVolume) {
          merged.last_active_date = todayStr
          // 以匯入日期作為最後交易日的代理值（API commission 權限不足時的備援）
          if (!merged.last_trade_date || merged.last_trade_date < todayStr) {
            merged.last_trade_date = todayStr
          }
        }
        users.value[idx] = merged
        updatedCount++
      } else {
        // 新建：同樣套用心跳邏輯
        const newUser = createDefaultUser(incoming)
        if (hasVolume) {
          newUser.last_active_date = todayStr
          newUser.last_trade_date = todayStr
        }
        users.value.push(newUser)
        importedCount++
      }
    })
    // 重算 RFM
    users.value = users.value.map(u => {
      const { r, rfm_tag } = calcRScore(u)
      const f = calcFScore(u.line_msg_count_7d, u.trade_count_30d)
      const m = calcMScore(u.balance, u.volume_recent ?? u.volume_30d)
      return { ...u, rfm_score: { r, f, m }, tags: calcTags(u, r, f, m, rfm_tag) }
    })
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    return { importedCount, updatedCount }
  }

  /**
   * 匯入 LINE 對話紀錄（每週訊息數統計 + 暱稱更新）
   * @param {Object} weeklyStats  uid → { weekKey: count }
   * @param {Object} nickMap      uid → latestNickname（LINE 對話內最後出現的暱稱）
   * @returns {{ updatedCount: number, newCount: number, nickUpdated: number }}
   */
  function importLineChatRecords(weeklyStats, nickMap) {
    let updatedCount = 0
    let newCount = 0
    let nickUpdated = 0

    for (const [uid, weekData] of Object.entries(weeklyStats)) {
      const idx = users.value.findIndex(u => u.uid === uid)

      // 最近一週訊息數（用於 RFM F 分）
      const weeks = Object.keys(weekData).sort()
      const latestWeek = weeks[weeks.length - 1]
      const latestCount = weekData[latestWeek] || 0

      // LINE 對話的暱稱為最新，以它為準
      const newNick = nickMap[uid] || null

      if (idx > -1) {
        const cur = users.value[idx]
        // 累加每週統計（同一週的計數累加而非覆蓋，支援重複匯入同月份）
        const merged = { ...(cur.line_weekly_msgs || {}) }
        for (const [wk, cnt] of Object.entries(weekData)) {
          merged[wk] = (merged[wk] || 0) + cnt
        }
        const patch = {
          line_weekly_msgs: merged,
          line_msg_count_7d: merged[latestWeek] || latestCount,
        }
        if (newNick && cur.line_name !== newNick) {
          patch.line_name = newNick
          nickUpdated++
        }
        users.value[idx] = { ...cur, ...patch }
        updatedCount++
      } else {
        // UID 不在名單，新建（僅有 LINE 資料）
        users.value.push(createDefaultUser({
          uid,
          line_name: newNick,
          line_weekly_msgs: { ...weekData },
          line_msg_count_7d: latestCount,
        }))
        newCount++
      }
    }

    // 重算 RFM
    users.value = users.value.map(u => {
      const { r, rfm_tag } = calcRScore(u)
      const f = calcFScore(u.line_msg_count_7d, u.trade_count_30d)
      const m = calcMScore(u.balance, u.volume_recent ?? u.volume_30d)
      return { ...u, rfm_score: { r, f, m }, tags: calcTags(u, r, f, m, rfm_tag) }
    })
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    return { updatedCount, newCount, nickUpdated }
  }

  // ── 三支獨立同步 action ─────────────────────────────────────────

  /**
   * 只同步下線名單（註冊日、有無交易/入金）
   */
  async function fetchInviteesOnly(apiInstance, sourceLabel) {
    const list = await fetchAllInviteePages(apiInstance)
    const todayStr = new Date().toISOString().slice(0, 10)
    const merged = list.map(item => {
      const uid = String(item.uid ?? '')
      const regTs = item.registerDateTime ?? item.registerTime ?? null
      return {
        uid,
        source: sourceLabel,
        register_date: regTs ? new Date(regTs).toLocaleDateString('zh-TW') : null,
        register_timestamp: regTs,
        bingx_register_date: regTs ? new Date(regTs).toISOString().slice(0, 10) : null,
        has_traded: item.trade ?? false,
        has_deposit: item.deposit ?? false,
        kyc: item.kycResult ?? false,
        account_type: sourceLabel,
        inviter_uid_code: (item.inviterSid != null && item.inviterSid !== 0 && item.inviterSid !== '0') ? String(item.inviterSid) : null,
        invite_type: item.directInvitation != null ? (item.directInvitation ? '直接' : '間接') : null,
        bound_invite_code: item.inviteCode || null,
        own_promo_code: item.ownInviteCode || null,
        bingx_vip_level: (item.userLevel != null && item.userLevel !== 0) ? String(item.userLevel) : null,
        balance: item.balanceVolume != null ? parseFloat(item.balanceVolume) : null,
        total_assets: item.balanceVolume != null ? parseFloat(item.balanceVolume) : null,
      }
    })
    mergeUsers(merged)
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    return merged.length
  }

  /**
   * 只同步傭金明細（近 35 天交易量、最後交易日）
   */
  async function fetchCommissionOnly(apiInstance, sourceLabel) {
    const commissionRaw = await fetchAllCommissionPages(apiInstance, sourceLabel)
    const todayStr = new Date().toISOString().slice(0, 10)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const commissionMap = {}
    if (Array.isArray(commissionRaw)) {
      commissionRaw.forEach(item => {
        const uid = String(item.uid ?? '')
        if (!uid) return
        if (!commissionMap[uid]) commissionMap[uid] = { volume: 0, lastTime: null, hasRecentTrade: false, tradeCount: 0 }
        const vol = parseFloat(item.tradingVolume ?? 0) || 0
        commissionMap[uid].volume += vol
        if (vol > 0) commissionMap[uid].tradeCount += 1
        if (vol > 0 && item.commissionTime >= sevenDaysAgo) commissionMap[uid].hasRecentTrade = true
        const t = item.commissionTime ?? null
        if (t && (!commissionMap[uid].lastTime || t > commissionMap[uid].lastTime)) commissionMap[uid].lastTime = t
      })
    }
    const merged = Object.entries(commissionMap).map(([uid, cm]) => ({
      uid,
      volume_30d: cm.volume > 0 ? cm.volume : null,
      volume_recent: cm.volume > 0 ? cm.volume : null,
      trade_count_30d: cm.tradeCount ?? 0,
      last_trade_date: cm.lastTime ? new Date(cm.lastTime).toISOString().slice(0, 10) : null,
      last_trade_timestamp: cm.lastTime,
      ...(cm.hasRecentTrade ? { last_active_date: todayStr } : {}),
    }))
    mergeUsers(merged)
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    return merged.length
  }

  /**
   * 只同步帳戶餘額（來源：Invitee List 的 balanceVolume 欄位）
   * 注：/openApi/v3/subAccount/assets 不支援代理帳號，餘額數據在下線名單中
   */
  async function fetchAssetsOnly(apiInstance, sourceLabel) {
    const list = await fetchAllInviteePages(apiInstance)
    const merged = list
      .filter(item => item.balanceVolume != null)
      .map(item => ({
        uid: String(item.uid ?? ''),
        balance: parseFloat(item.balanceVolume) || 0,
      }))
      .filter(item => item.uid)
    mergeUsers(merged)
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    return merged.length
  }

  /**
   * 手動新增單一客戶
   * SDD Traceability: step5_create_mb.md § 3A. 手動建檔
   * @param {Object} userData
   */
  function addUser(userData) {
    if (!userData.uid) throw new Error('UID 為必填欄位')
    const exists = users.value.find(u => u.uid === String(userData.uid))
    if (exists) throw new Error(`UID ${userData.uid} 已存在`)
    const newUser = createDefaultUser({ ...userData, uid: String(userData.uid) })
    users.value.push(newUser)
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
  }

  /**
   * 更新單一客戶資料（內頁編輯）
   * SDD Traceability: step5_create_mb.md § 3B. CustomerDetail 編輯功能
   * @param {string} uid
   * @param {Object} patch
   */
  function updateUser(uid, patch) {
    const idx = users.value.findIndex(u => u.uid === String(uid))
    if (idx === -1) throw new Error(`找不到 UID: ${uid}`)
    users.value[idx] = { ...users.value[idx], ...patch }
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
  }

  /** 強制重算所有用戶的 RFM 分數與分眾標籤（不依賴 API，僅用現有資料）*/
  function recalcRfm() {
    users.value = users.value.map(u => {
      const { r, rfm_tag } = calcRScore(u)
      const f = calcFScore(u.line_msg_count_7d, u.trade_count_30d)
      const m = calcMScore(u.balance, u.volume_recent ?? u.volume_30d)
      return { ...u, rfm_score: { r, f, m }, tags: calcTags(u, r, f, m, rfm_tag) }
    })
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
  }

  /**
   * 每週戰情結算：將前端所有用戶的當週快照寫入 SQLite
   * SDD Traceability: step6_db.md § 3. syncWeeklyData
   * @returns {Promise<{week: string, count: number}>}
   */
  async function syncWeeklyData() {
    const yearWeek = dayjs().format('GGGG-[W]WW')   // e.g. '2026-W09'

    // 組裝傳送給後端的 payload
    const payload = users.value
      .filter(u => u.uid)
      .map(u => {
        let rfmTotal = null
        if (u.rfm_score != null) {
          if (typeof u.rfm_score === 'object') {
            const { r = 0, f = 0, m = 0 } = u.rfm_score
            rfmTotal = r + f + m
          } else {
            rfmTotal = Number(u.rfm_score)
          }
        }
        let rfmTag = u.rfm_score_tag ?? null
        if (!rfmTag && Array.isArray(u.tags)) {
          rfmTag = u.tags.find(t => /VIP|核心|潛力|沉睡|流失/.test(t)) ?? null
        }
        return {
          uid:                  u.uid,
          line_name:            u.line_name            ?? null,
          official_email:       u.official_email        ?? null,
          register_date:        u.register_date         ?? null,
          first_deposit_time:   u.first_deposit_time    ?? null,
          invite_type:          u.invite_type           ?? null,
          text_notes:           u.text_notes            ?? null,
          total_assets:         u.total_assets != null ? Number(u.total_assets) : (u.balance != null ? Number(u.balance) : null),
          volume_weekly:        u.volume_recent != null ? Number(u.volume_recent) : (u.volume_30d != null ? Number(u.volume_30d) : null),
          commission_weekly:    null,
          community_interaction: u.community_interaction != null ? Number(u.community_interaction) : (u.line_msg_count_7d != null ? Number(u.line_msg_count_7d) : null),
          rfm_score:            rfmTotal,
          rfm_tag:              rfmTag,
        }
      })

    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearWeek, users: payload }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || '[DB] 同步失敗，請確認後端伺服器運作中')
    }
    const data = await res.json()
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    return { week: yearWeek, count: data.count }
  }

  return {
    users,
    loading,
    lastSyncTime,
    dbReady,
    vipUsers,
    sleepingUsers,
    mergeUsers,
    importXlsxRecords,
    importLineChatRecords,
    addUser,
    updateUser,
    setLoading,
    fetchAccount,
    fetchInviteesOnly,
    fetchCommissionOnly,
    fetchAssetsOnly,
    recalcRfm,
    initDatabase,
    syncWeeklyData,
    exportDbFile,
    importDbFile,
  }
})
