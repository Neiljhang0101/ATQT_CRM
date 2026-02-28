import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAgencyInvitees, getCommissionRecords, getSubAccountAssets } from '../api/bingx.js'

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

  // ── Getters ───────────────────────────────────

  /** VIP 名單：餘額 > 5000 USDT */
  const vipUsers = computed(() =>
    users.value.filter(u => u.balance > 5000)
  )

  /** 沉睡戶：超過 7 天未交易 */
  const sleepingUsers = computed(() => {
    const now = Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    return users.value.filter(u => {
      if (!u.last_trade_date) return true
      return now - new Date(u.last_trade_date).getTime() > sevenDaysMs
    })
  })

  /** 計算 RFM R 分數 (1-5) */
  function calcRScore(lastTradeDate) {
    if (!lastTradeDate) return 1
    const daysDiff = (Date.now() - new Date(lastTradeDate).getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff <= 3) return 5
    if (daysDiff <= 7) return 4
    if (daysDiff <= 14) return 3
    if (daysDiff <= 30) return 2
    return 1
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

  // ── Actions ───────────────────────────────────

  /** 合併 API 資料至 users store */
  function mergeUsers(newData) {
    newData.forEach(incoming => {
      const idx = users.value.findIndex(u => u.uid === incoming.uid)
      if (idx > -1) {
        users.value[idx] = { ...users.value[idx], ...incoming }
      } else {
        users.value.push(incoming)
      }
    })
    // 重算 RFM
    users.value = users.value.map(u => {
      const r = calcRScore(u.last_trade_date)
      const f = calcFScore(u.line_msg_count_7d, u.trade_count_30d)
      const m = calcMScore(u.balance, u.volume_recent ?? u.volume_30d)
      const tags = []
      if (m === 5 && r <= 2) tags.push('⚠️ 沉睡的高淨值戶')
      if (m === 5 && (r >= 4 || f >= 4)) tags.push('👑 核心 VIP')
      return { ...u, rfm_score: { r, f, m }, tags }
    })
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
  }

  function setLoading(val) {
    loading.value = val
  }

  /**
   * 循環抓取所有頁的下線名單（BingX 每頁最多 200 筆）
   * @param {import('axios').AxiosInstance} apiInstance
   * @returns {Promise<Array>}
   */
  async function fetchAllInviteePages(apiInstance) {
    const PAGE_SIZE = 200
    let pageIndex = 1
    let allItems = []
    while (true) {
      const res = await getAgencyInvitees(apiInstance, { pageIndex, pageSize: PAGE_SIZE })
      const list = res?.data?.list ?? []
      if (!Array.isArray(list) || list.length === 0) break
      allItems = allItems.concat(list)
      if (list.length < PAGE_SIZE) break  // 最後一頁
      pageIndex++
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
    // 下線名單需要分頁循環抓全部；其他兩支 API 目前 code=100400 但仍嘗試
    const [inviteesResult, commissionRes, assetsRes] = await Promise.allSettled([
      fetchAllInviteePages(apiInstance),
      getCommissionRecords(apiInstance),
      getSubAccountAssets(apiInstance),
    ])

    // ── 解析下線名單 ──────────────────────────────────────────
    console.log(`[${sourceLabel}] inviteesResult:`, inviteesResult)
    console.log(`[${sourceLabel}] commissionRes:`, commissionRes)
    console.log(`[${sourceLabel}] assetsRes:`, assetsRes)

    // fetchAllInviteePages 回傳陣列，不再是 response 物件
    const inviteeList =
      inviteesResult.status === 'fulfilled'
        ? inviteesResult.value
        : []

    // ── 解析返佣紀錄 → 累計 volume、trade_count、最後交易時間 ──
    const commissionRaw =
      commissionRes.status === 'fulfilled'
        ? (commissionRes.value?.data?.list
          ?? commissionRes.value?.data?.commissionList
          ?? [])
        : []

    // 以 uid 索引返佣資料
    const commissionMap = {}
    if (Array.isArray(commissionRaw)) {
      commissionRaw.forEach(item => {
        const uid = String(item.uid ?? item.inviteeId ?? '')
        if (!uid) return
        if (!commissionMap[uid]) {
          commissionMap[uid] = { volume: 0, tradeCount: 0, lastTime: null }
        }
        commissionMap[uid].volume += parseFloat(item.volume ?? item.amount ?? item.commissionAmount ?? 0)
        commissionMap[uid].tradeCount += 1
        const t = item.time ?? item.createTime ?? item.date ?? item.timestamp
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
          const lastTime = cm.lastTime
          // registerDateTime 是實際欄位名（registerTime 是文件誤植）
          const regTs = item.registerDateTime ?? item.registerTime ?? null
          // balanceVolume 回傳為字串，優先使用 assets API，次之取 invitee 回傳
          const balance = assetsMap[uid] != null
            ? assetsMap[uid]
            : (item.balanceVolume != null ? parseFloat(item.balanceVolume) : null)
          return {
            uid,
            source: sourceLabel,
            register_date: regTs
              ? new Date(regTs).toLocaleDateString('zh-TW')
              : null,
            register_timestamp: regTs,
            balance,
            volume_30d: cm.volume > 0 ? cm.volume : null,
            trade_count_30d: cm.tradeCount ?? 0,
            last_trade_date: lastTime
              ? new Date(lastTime).toLocaleDateString('zh-TW')
              : null,
            last_trade_timestamp: lastTime,
            has_traded: item.trade ?? false,
            has_deposit: item.deposit ?? false,
            kyc: item.kycResult ?? false,
            line_name: null,
            line_msg_count_7d: 0,
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
    records.forEach(incoming => {
      if (!incoming.uid) return
      const idx = users.value.findIndex(u => u.uid === incoming.uid)
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
        users.value[idx] = merged
        updatedCount++
      } else {
        // 新建
        users.value.push(createDefaultUser(incoming))
        importedCount++
      }
    })
    // 重算 RFM
    users.value = users.value.map(u => {
      const r = calcRScore(u.last_trade_date)
      const f = calcFScore(u.line_msg_count_7d, u.trade_count_30d)
      const m = calcMScore(u.balance, u.volume_recent ?? u.volume_30d)
      return { ...u, rfm_score: { r, f, m } }
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
      const r = calcRScore(u.last_trade_date)
      const f = calcFScore(u.line_msg_count_7d, u.trade_count_30d)
      const m = calcMScore(u.balance, u.volume_recent ?? u.volume_30d)
      return { ...u, rfm_score: { r, f, m } }
    })
    lastSyncTime.value = new Date().toLocaleString('zh-TW')
    return { updatedCount, newCount, nickUpdated }
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

  return {
    users,
    loading,
    lastSyncTime,
    vipUsers,
    sleepingUsers,
    mergeUsers,
    importXlsxRecords,
    importLineChatRecords,
    addUser,
    updateUser,
    setLoading,
    fetchAccount,
  }
})
