<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { oldApi, newApi } from '../api/bingx.js'
import { useCrmStore } from '../store/index.js'
import { parseXlsxFile } from '../utils/xlsxImport.js'
import { parseLineChatXlsx } from '../utils/lineImport.js'

const crmStore = useCrmStore()
const router = useRouter()

const syncingInvitees  = ref(false)
const syncingCommission = ref(false)
const syncingAssets    = ref(false)

const anySyncing = computed(() =>
  crmStore.loading || syncingInvitees.value || syncingCommission.value || syncingAssets.value
)

function handleSyncCommand(cmd) {
  if (cmd === 'all')        syncInvitees()
  else if (cmd === 'invitees')   syncOnlyInvitees()
  else if (cmd === 'commission') syncOnlyCommission()
  else if (cmd === 'assets')     syncOnlyAssets()
}

const filterMode   = ref('all')
const sourceFilter = ref('all')
const tagFilter    = ref('')
const searchUid    = ref('')
const currentPage  = ref(1)
const pageSize     = ref(50)
const sortField    = ref('')
const sortOrder    = ref('')

function handleSortChange({ prop, order }) {
  sortField.value = prop || ''
  sortOrder.value = order || ''
  currentPage.value = 1
}

const oldCount = computed(() => crmStore.users.filter(u => u.source === 'old' || u.account_type === 'old').length)
const newCount = computed(() => crmStore.users.filter(u => u.source === 'new' || u.account_type === 'new').length)

const filteredData = computed(() => {
  let data = crmStore.users
  if (filterMode.value === 'vip') data = crmStore.vipUsers
  else if (filterMode.value === 'sleeping') data = crmStore.sleepingUsers
  if (sourceFilter.value !== 'all') data = data.filter(u => (u.source || u.account_type) === sourceFilter.value)
  if (tagFilter.value) data = data.filter(u => Array.isArray(u.tags) && u.tags.some(t => t.includes(tagFilter.value)))
  if (searchUid.value.trim()) {
    data = data.filter(u =>
      String(u.uid).includes(searchUid.value.trim()) ||
      (u.line_name || '').includes(searchUid.value.trim())
    )
  }
  return data
})

const sortedFilteredData = computed(() => {
  let data = [...filteredData.value]
  if (sortField.value && sortOrder.value) {
    const numericFields = ['balance', 'volume_30d', 'volume_recent', 'total_assets']
    data.sort((a, b) => {
      let aVal = a[sortField.value]
      let bVal = b[sortField.value]
      if (numericFields.includes(sortField.value)) {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
        return sortOrder.value === 'ascending' ? aVal - bVal : bVal - aVal
      }
      aVal = aVal ?? ''
      bVal = bVal ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), 'zh-TW')
      return sortOrder.value === 'ascending' ? cmp : -cmp
    })
  }
  return data
})

const tableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedFilteredData.value.slice(start, start + pageSize.value)
})

watch([filterMode, sourceFilter, searchUid], () => { currentPage.value = 1 })

async function syncInvitees() {
  crmStore.setLoading(true)
  try {
    const [oldResult, newResult] = await Promise.allSettled([
      crmStore.fetchAccount(oldApi, 'old'),
      crmStore.fetchAccount(newApi, 'new'),
    ])
    let totalCount = 0
    const messages = []
    if (oldResult.status === 'fulfilled') {
      totalCount += oldResult.value
      messages.push('舊帳號：同步 ' + oldResult.value + ' 筆')
    } else {
      messages.push('舊帳號失敗：' + oldResult.reason?.message)
      console.error('[舊帳號]', oldResult.reason)
    }
    if (newResult.status === 'fulfilled') {
      totalCount += newResult.value
      messages.push('新帳號：同步 ' + newResult.value + ' 筆')
    } else {
      messages.push('新帳號失敗：' + newResult.reason?.message)
      console.error('[新帳號]', newResult.reason)
    }
    if (totalCount > 0) {
      ElMessage.success('同步完成 ' + messages.join('、'))
    } else {
    ElNotification({ title: '同步失敗', type: 'error', duration: 0, message: messages.join(' | ') })
    }
  } finally {
    crmStore.setLoading(false)
  }
}

onMounted(() => {
  if (crmStore.users.length === 0) ElMessage.info('請點右上符按鈕同步 API 或匯入 XLSX 資料')
})

// ── 三支獨立同步 ───────────────────────────────────────────────────
async function syncOnlyInvitees() {
  syncingInvitees.value = true
  try {
    const [o, n] = await Promise.allSettled([
      crmStore.fetchInviteesOnly(oldApi, 'old'),
      crmStore.fetchInviteesOnly(newApi, 'new'),
    ])
    const msgs = []
    if (o.status === 'fulfilled') msgs.push('舊：' + o.value + ' 筆')
    else { msgs.push('舊失敗：' + o.reason?.message); console.error(o.reason) }
    if (n.status === 'fulfilled') msgs.push('新：' + n.value + ' 筆')
    else { msgs.push('新失敗：' + n.reason?.message); console.error(n.reason) }
    ElMessage.success('下線名單同步完成 ' + msgs.join('、'))
  } finally {
    syncingInvitees.value = false
  }
}

async function syncOnlyCommission() {
  syncingCommission.value = true
  try {
    // 診斷：確認 Vite 有正確讀到 API 金鑰
    const newKeyPrefix = import.meta.env.VITE_BINGX_NEW_API_KEY?.slice(0, 8) || '(empty!)'
    const oldKeyPrefix = import.meta.env.VITE_BINGX_OLD_API_KEY?.slice(0, 8) || '(empty!)'
    console.log('[syncCommission] OLD key:', oldKeyPrefix, '| NEW key:', newKeyPrefix)
    ElMessage({ message: `金鑰確認 OLD:${oldKeyPrefix} NEW:${newKeyPrefix}`, type: 'info', duration: 6000 })
    const [o, n] = await Promise.allSettled([
      crmStore.fetchCommissionOnly(oldApi, 'old'),
      crmStore.fetchCommissionOnly(newApi, 'new'),
    ])
    const msgs = []
    if (o.status === 'fulfilled') msgs.push('舊：' + o.value + ' 筆')
    else { msgs.push('舊失敗：' + o.reason?.message); console.error(o.reason) }
    if (n.status === 'fulfilled') msgs.push('新：' + n.value + ' 筆')
    else { msgs.push('新失敗：' + n.reason?.message); console.error(n.reason) }
    ElMessage.success('傭金明細同步完成 ' + msgs.join('、'))
  } finally {
    syncingCommission.value = false
  }
}

async function syncOnlyAssets() {
  syncingAssets.value = true
  try {
    const [o, n] = await Promise.allSettled([
      crmStore.fetchAssetsOnly(oldApi, 'old'),
      crmStore.fetchAssetsOnly(newApi, 'new'),
    ])
    const msgs = []
    if (o.status === 'fulfilled') msgs.push('舊：' + o.value + ' 筆')
    else { msgs.push('舊失敗：' + o.reason?.message); console.error(o.reason) }
    if (n.status === 'fulfilled') msgs.push('新：' + n.value + ' 筆')
    else { msgs.push('新失敗：' + n.reason?.message); console.error(n.reason) }
    ElMessage.success('帳戶資產同步完成 ' + msgs.join('、'))
  } finally {
    syncingAssets.value = false
  }
}

function copyUid(uid) {
  navigator.clipboard.writeText(String(uid)).then(() => {
    ElMessage.success('已複製 UID：' + uid)
  }).catch(() => {
    ElMessage.error('複製失敗，請手動複製')
  })
}

function tagStyle(tag) {
  if (tag.includes('核心 VIP'))         return { bg: 'rgba(230,162,60,0.13)', color: '#B7860B', border: 'rgba(230,162,60,0.4)' }
  if (tag.includes('高淨值'))            return { bg: 'rgba(230,162,60,0.10)', color: '#E6A23C', border: 'rgba(230,162,60,0.3)' }
  if (tag.includes('新手待破蛋'))        return { bg: 'rgba(103,194,58,0.12)',  color: '#52A135', border: 'rgba(103,194,58,0.4)' }
  if (tag.includes('入金未交易'))        return { bg: 'rgba(32,178,135,0.10)',  color: '#18A77A', border: 'rgba(32,178,135,0.35)' }
  if (tag.includes('初次交易'))          return { bg: 'rgba(144,97,219,0.11)',  color: '#7C4DCC', border: 'rgba(144,97,219,0.35)' }
  if (tag.includes('高潛力活躍'))        return { bg: 'rgba(245,108,108,0.10)', color: '#D94F4F', border: 'rgba(245,108,108,0.32)' }
  if (tag.includes('穩定交易'))          return { bg: '#ecf5ff',                color: '#409EFF', border: 'rgba(64,158,255,0.35)' }
  if (tag.includes('流失預警'))          return { bg: 'rgba(230,100,0,0.10)',   color: '#C05800', border: 'rgba(230,100,0,0.32)' }
  if (tag.includes('沉睡') || tag.includes('沈睡')) return { bg: 'rgba(245,108,108,0.12)', color: '#F56C6C', border: 'rgba(245,108,108,0.3)' }
  if (tag.includes('已流失'))            return { bg: 'rgba(144,158,171,0.13)', color: '#607D8B', border: 'rgba(144,158,171,0.35)' }
  return { bg: '#f5f7fa', color: '#606266', border: '#e4e7ed' }
}

function recalcRfm() {
  crmStore.recalcRfm()
  ElMessage.success(`RFM 標籤已重算，共 ${crmStore.users.length} 位`)
}

// 查看詳情
function viewDetail(row) {
  router.push('/crm/' + row.uid)
}

// ?? XLSX ?入 ?????????????????????????????????????????????
const xlsxImporting = ref(false)

async function handleXlsxUpload(uploadFile) {
  const file = uploadFile.raw ?? uploadFile
  if (!file) return
  xlsxImporting.value = true
  try {
    const { records, fileType, accountType, count } = await parseXlsxFile(file)
    if (count === 0) {
      ElMessage.warning('檔案類型為空，請確認選擇是否正確')
      return
    }
    const { importedCount, updatedCount } = crmStore.importXlsxRecords(records)
    const typeLabel = fileType === 'user-info' ? '用戶資料'
      : fileType === 'volume' ? '交易量'
      : fileType === 'account-tv' ? '官網信箱/TVID'
      : fileType === 'line-names' ? 'LINE名稱'
      : fileType === 'mixed' ? '官網帳號+LINE名稱'
      : '未知類型'
    const accLabel = accountType === 'old' ? '舊帳號' : accountType === 'new' ? '新帳號' : '未知帳號'
    ElMessage.success(`${file.name}（${typeLabel} - ${accLabel}）匯入完成：新增 ${importedCount} 筆 / 更新 ${updatedCount} 筆`)
  } catch (err) {
    ElNotification({ title: 'XLSX 匯入失敗', type: 'error', message: err.message, duration: 0 })
  } finally {
    xlsxImporting.value = false
  }
}

// LINE 對話匯入 ──────────────────────────────────────────────────
const lineImporting = ref(false)

async function handleLineChatUpload(uploadFile) {
  const file = uploadFile.raw ?? uploadFile
  if (!file) return
  lineImporting.value = true
  try {
    const { weeklyStats, nickMap, summary } = await parseLineChatXlsx(file)
    if (summary.totalMessages === 0) {
      ElMessage.warning('未找到有效訊息，請確認是 LINE對話匯出 xlsx 格式')
      return
    }
    const { updatedCount, newCount, nickUpdated } = crmStore.importLineChatRecords(weeklyStats, nickMap)
    ElMessage.success(
      `${file.name} 匯入完成：` +
      `有效訊息 ${summary.totalMessages.toLocaleString()} 則 / ` +
      `涵蓋 ${summary.weeks.length} 週 / ` +
      `更新 ${updatedCount} 人 / 新建 ${newCount} 人 / 暱稱更新 ${nickUpdated} 人`
    )
  } catch (err) {
    ElNotification({ title: 'LINE 對話匯入失敗', type: 'error', message: err.message, duration: 0 })
  } finally {
    lineImporting.value = false
  }
}

// 手動建立資料 ──────────────────────────────────────────────────
const showCreateDialog = ref(false)
const createForm = ref({
  uid: '', account_type: null, invite_type: null, inviter_uid_code: '',
  inviter_line_name: '', line_name: '', register_date: '',
  volume_recent: null, total_assets: null, last_trade_date: '',
  official_email: '', tradingview_account: '', bingx_register_date: '',
  note_tags: '', text_notes: '', indicator_version: '',
  community_interaction: '', bingx_vip_level: '', first_deposit_time: '',
})
const createFormRef = ref(null)
const createRules = {
  uid: [{ required: true, message: 'UID 為必填欄位', trigger: 'blur' }],
}

function openCreateDialog() {
  Object.assign(createForm.value, {
    uid: '', account_type: null, invite_type: null, inviter_uid_code: '',
    inviter_line_name: '', line_name: '', register_date: '',
    volume_recent: null, total_assets: null, last_trade_date: '',
    official_email: '', tradingview_account: '', bingx_register_date: '',
    note_tags: '', text_notes: '', indicator_version: '',
    community_interaction: '', bingx_vip_level: '', first_deposit_time: '',
  })
  showCreateDialog.value = true
}

async function submitCreateForm() {
  if (!createFormRef.value) return
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      const data = { ...createForm.value }
      // note_tags 字串轉陣列
      data.note_tags = data.note_tags ? data.note_tags.split(',').map(s => s.trim()).filter(Boolean) : []
      crmStore.addUser(data)
      ElMessage.success(`客戶 UID ${data.uid} 建立成功`)
      showCreateDialog.value = false
    } catch (err) {
      ElMessage.error(err.message)
    }
  })
}
</script>

<template>
  <div class="max-w-full flex flex-col gap-5">

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold" style="color:#1a1d23;">客戶總表</h2>
        <span class="px-2 py-0.5 rounded text-sm font-medium" style="background:#f5f7fa;border:1px solid #e4e7ed;color:#909399;">{{ crmStore.users.length }} 位客戶</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <p v-if="crmStore.lastSyncTime" class="text-sm hidden sm:block" style="color:#909399;">最後同步：{{ crmStore.lastSyncTime }}</p>

        <!-- 重算 RFM -->
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
          style="background:#f0f0ff;color:#7C4DCC;border:1px solid rgba(124,77,204,0.3);"
          @click="recalcRfm"
        >
          <span class="material-symbols-outlined text-[18px]">refresh</span>
          重算 RFM
        </button>

        <!-- 手動建立資料 -->
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
          style="background:#f0f9eb;color:#67C23A;border:1px solid rgba(103,194,58,0.3);"
          @click="openCreateDialog"
        >
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          手動建立資料
        </button>

        <!-- XLSX ?入 -->
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          accept=".xlsx"
          :on-change="handleXlsxUpload"
        >
          <template #trigger>
            <button
              class="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
              :style="xlsxImporting ? 'background:#d4edda;color:#aaa;cursor:not-allowed;' : 'background:#f0f9eb;color:#67C23A;border:1px solid rgba(103,194,58,0.3);'"
              :disabled="xlsxImporting"
              type="button"
            >
              <span class="material-symbols-outlined text-[18px]">upload_file</span>
              {{ xlsxImporting ? '匯入中...' : '匯入 XLSX' }}
            </button>
          </template>
        </el-upload>

        <!-- LINE 對話匯入 -->
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          accept=".xlsx"
          :on-change="handleLineChatUpload"
        >
          <template #trigger>
            <button
              class="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
              :style="lineImporting ? 'background:#e8f4fd;color:#aaa;cursor:not-allowed;' : 'background:#e8f4fd;color:#409EFF;border:1px solid rgba(64,158,255,0.3);'"
              :disabled="lineImporting"
              type="button"
            >
              <span class="material-symbols-outlined text-[18px]">chat</span>
              {{ lineImporting ? '匯入中...' : '匯入 LINE 對話' }}
            </button>
          </template>
        </el-upload>

        <!-- 同步下拉選單 -->
        <el-dropdown
          trigger="click"
          :disabled="anySyncing"
          @command="handleSyncCommand"
        >
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white transition-colors shadow-sm"
            :style="anySyncing ? 'background:#aaa;cursor:not-allowed;' : 'background:#606266;'"
            :disabled="anySyncing"
          >
            <span class="material-symbols-outlined text-[18px]" :class="anySyncing ? 'animate-spin' : ''">sync</span>
            {{ anySyncing ? '同步中...' : '同步資料' }}
            <span class="material-symbols-outlined text-[16px]">arrow_drop_down</span>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="all">
                <span class="material-symbols-outlined text-[16px] mr-1" style="vertical-align:middle;color:#606266;">sync</span>
                全部同步
              </el-dropdown-item>
              <el-dropdown-item divided command="invitees">
                <span class="material-symbols-outlined text-[16px] mr-1" style="vertical-align:middle;color:#409EFF;">group</span>
                下線名單
              </el-dropdown-item>
              <el-dropdown-item command="commission">
                <span class="material-symbols-outlined text-[16px] mr-1" style="vertical-align:middle;color:#E6A23C;">bar_chart</span>
                傭金明細
              </el-dropdown-item>
              <el-dropdown-item command="assets">
                <span class="material-symbols-outlined text-[16px] mr-1" style="vertical-align:middle;color:#67C23A;">account_balance_wallet</span>
                帳戶餘額
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="bg-white rounded-lg p-4" style="border:1px solid #e4e7ed;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex-1 min-w-[220px]">
          <label class="block text-sm font-medium mb-1.5" style="color:#909399;">搜尋</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px]" style="color:#909399;">search</span>
            <input v-model="searchUid" type="text" placeholder="搜尋 UID / LINE 暱稱..."
              class="w-full pl-9 pr-3 py-2 bg-white text-sm rounded focus:outline-none transition-shadow"
              style="border:1px solid #dcdfe6;font-family:inherit;"
              @focus="$event.target.style.borderColor='#409EFF'"
              @blur="$event.target.style.borderColor='#dcdfe6'" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color:#909399;">帳號來源</label>
          <div class="flex gap-1.5">
            <button v-for="s in [['all','全部'],['old','舊帳號'],['new','新帳號']]" :key="s[0]"
              class="px-3 py-1.5 text-sm rounded transition-colors"
              :style="sourceFilter === s[0] ? 'background:#409EFF;color:#fff;font-weight:500;' : 'background:#f5f7fa;color:#3d4148;border:1px solid #e4e7ed;'"
              @click="sourceFilter = s[0]">{{ s[1] }}</button>
          </div>
        </div>
        <div class="w-full">
          <label class="block text-sm font-medium mb-1.5" style="color:#909399;">受眾篩選</label>
          <div class="flex gap-1.5 flex-wrap">
            <button class="px-3 py-1.5 text-sm rounded transition-colors"
              :style="filterMode === 'all' ? 'background:#409EFF;color:#fff;font-weight:500;' : 'background:#f5f7fa;color:#3d4148;border:1px solid #e4e7ed;'"
              @click="filterMode = 'all'; tagFilter = ''">全部 ({{ crmStore.users.length }})</button>
            <button class="px-3 py-1.5 text-sm rounded transition-colors"
              :style="filterMode === 'vip' ? 'background:#E6A23C;color:#fff;font-weight:500;' : 'background:rgba(230,162,60,0.08);color:#E6A23C;border:1px solid rgba(230,162,60,0.3);'"
              @click="filterMode = 'vip'; tagFilter = ''">高淨值 ({{ crmStore.vipUsers.length }})</button>
            <button class="px-3 py-1.5 text-sm rounded transition-colors"
              :style="filterMode === 'sleeping' ? 'background:#F56C6C;color:#fff;font-weight:500;' : 'background:rgba(245,108,108,0.08);color:#F56C6C;border:1px solid rgba(245,108,108,0.3);'"
              @click="filterMode = 'sleeping'; tagFilter = ''">潛在流失風險 ({{ crmStore.sleepingUsers.length }})</button>
          </div>
          <!-- 分眾標籤快篩 -->
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="text-xs mt-0.5 mr-0.5" style="color:#909399;">標籤：</span>
            <button v-for="[key, label, ts] in [
              ['核心 VIP',   '👑 核心 VIP',   { bg:'rgba(230,162,60,0.13)', color:'#B7860B', border:'rgba(230,162,60,0.4)'}],
              ['新手待破蛋', '🌟 新手待破蛋', { bg:'rgba(103,194,58,0.12)', color:'#52A135', border:'rgba(103,194,58,0.4)'}],
              ['入金未交易', '🌱 入金未交易', { bg:'rgba(32,178,135,0.10)', color:'#18A77A', border:'rgba(32,178,135,0.35)'}],
              ['初次交易',   '🚀 初次交易',   { bg:'rgba(144,97,219,0.11)', color:'#7C4DCC', border:'rgba(144,97,219,0.35)'}],
              ['高潛力活躍', '🔥 高潛力活躍戶',{ bg:'rgba(245,108,108,0.10)', color:'#D94F4F', border:'rgba(245,108,108,0.32)'}],
              ['穩定交易',   '📊 穩定交易戶', { bg:'#ecf5ff', color:'#409EFF', border:'rgba(64,158,255,0.35)'}],
              ['流失預警',   '⏰ 流失預警',   { bg:'rgba(230,100,0,0.10)', color:'#C05800', border:'rgba(230,100,0,0.32)'}],
              ['已流失',     '❄️ 已流失老客',  { bg:'rgba(144,158,171,0.13)', color:'#607D8B', border:'rgba(144,158,171,0.35)'}],
              ['沉睡',       '💤 沉睡流失',    { bg:'rgba(245,108,108,0.12)', color:'#F56C6C', border:'rgba(245,108,108,0.3)'}],
              ['高淨值',     '⚠️ 沉睡高淨值',  { bg:'rgba(230,162,60,0.10)', color:'#E6A23C', border:'rgba(230,162,60,0.3)'}],
            ]" :key="key"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-all"
              :style="tagFilter === key
                ? `background:${ts.color};color:#fff;border:1px solid ${ts.border};`
                : `background:${ts.bg};color:${ts.color};border:1px solid ${ts.border};opacity:0.85;`"
              @click="tagFilter = tagFilter === key ? '' : key; filterMode = 'all'"
            >{{ label }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg flex flex-col" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
      <el-table :data="tableData" v-loading="crmStore.loading"
        empty-text="尚無資料，請點擊右上方『同步兩個帳號』按鈕"
        style="width:100%;font-family:inherit;"
        @sort-change="handleSortChange"
        :header-cell-style="{ background:'#f5f7fa', color:'#909399', fontWeight:'600', fontSize:'14px', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e4e7ed', padding:'12px 16px' }"
        :cell-style="{ padding:'12px 16px', fontSize:'14px', color:'#1a1d23', borderBottom:'1px solid #f0f2f5', whiteSpace:'nowrap' }"
        :row-style="{ cursor:'default' }">

        <el-table-column label="UID" width="265" sortable prop="uid">
          <template #default="{ row }">
            <div class="flex items-center gap-1.5">
              <!-- ???帳??-->
              <span class="inline-flex items-center px-1.5 py-0.5 rounded font-medium flex-shrink-0" style="font-size:14px;"
                :style="(row.source || row.account_type) === 'new' ? 'background:rgba(103,194,58,0.12);color:#67C23A;border:1px solid rgba(103,194,58,0.3);' : 'background:#f5f7fa;color:#909399;border:1px solid #e4e7ed;'"
              >{{ (row.source || row.account_type) === 'new' ? '新' : '舊' }}</span>
              <!-- ?????-->
              <span class="inline-flex items-center px-1.5 py-0.5 rounded font-medium flex-shrink-0" style="font-size:14px;"
                :style="!row.invite_type ? 'background:#f5f7fa;color:#c0c4cc;border:1px solid #e4e7ed;' : (row.invite_type.includes('直接') ? 'background:rgba(64,158,255,0.1);color:#409EFF;border:1px solid rgba(64,158,255,0.25);' : 'background:rgba(230,162,60,0.1);color:#E6A23C;border:1px solid rgba(230,162,60,0.25);')"
>{{ !row.invite_type ? '-' : (row.invite_type.includes('直接') ? '直' : '間') }}</span>
              <span class="font-mono" style="color:#3d4148;font-size:14px;">{{ row.uid }}</span>
              <button @click.stop="copyUid(row.uid)"
                class="flex items-center justify-center rounded transition-colors"
                style="width:24px;height:24px;border:1px solid #e4e7ed;background:#f5f7fa;color:#909399;flex-shrink:0;cursor:pointer;" title="複製 UID">
                <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span>
              </button>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="LINE 暱稱" width="160">
          <template #default="{ row }">
            <span v-if="row.line_name" style="color:#1a1d23;">{{ row.line_name }}</span>
            <span v-else class="text-sm" style="color:#c0c4cc;">-</span>
          </template>
        </el-table-column>

        <el-table-column label="註冊日期" width="155" sortable prop="bingx_register_date" class-name="hidden md:table-cell">
          <template #default="{ row }">
            <span style="color:#3d4148;">{{ row.bingx_register_date || row.register_date || '--' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="volume_recent" label="近30天交易量(U)" width="185" sortable>
          <template #default="{ row }">
            <span v-if="(row.volume_recent ?? row.volume_30d) !== null && (row.volume_recent ?? row.volume_30d) !== undefined" style="color:#1a1d23;">{{ Number(row.volume_recent ?? row.volume_30d).toLocaleString(undefined, { maximumFractionDigits: 2 }) }}</span>
            <span v-else class="text-sm" style="color:#dcdfe6;">--</span>
          </template>
        </el-table-column>

        <el-table-column prop="balance" label="總資產(U)" width="165" sortable>
          <template #default="{ row }">
            <span v-if="row.balance !== null" :style="row.balance > 5000 ? 'color:#E6A23C;font-weight:600;' : 'color:#1a1d23;'">{{ Number(row.balance).toLocaleString() }}</span>
            <span v-else class="text-sm" style="color:#dcdfe6;">--</span>
          </template>
        </el-table-column>

        <el-table-column label="RFM" width="135" class-name="hidden md:table-cell">
          <template #default="{ row }">
            <span v-if="row.rfm_score" class="text-sm font-mono px-1.5 py-0.5 rounded" style="background:#f5f7fa;color:#3d4148;border:1px solid #e4e7ed;">R{{ row.rfm_score.r }} F{{ row.rfm_score.f }} M{{ row.rfm_score.m }}</span>
            <span v-else class="text-sm" style="color:#dcdfe6;">--</span>
          </template>
        </el-table-column>

        <el-table-column label="標籤" min-width="200">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <template v-if="row.tags && row.tags.length">
                <span v-for="tag in row.tags" :key="tag"
                  class="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium"
                  :style="`background:${tagStyle(tag).bg};color:${tagStyle(tag).color};border:1px solid ${tagStyle(tag).border};`">{{ tag }}</span>
              </template>
              <span v-else class="text-sm" style="color:#dcdfe6;">一般用戶</span>
            </div>
          </template>
        </el-table-column>

        <!-- ???-->
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-tooltip content="查看詳情" placement="left">
              <button
                class="flex items-center justify-center p-1.5 rounded transition-colors"
                style="background:#ecf5ff;color:#409EFF;border:1px solid rgba(64,158,255,0.3);"
                @click="viewDetail(row)"
              >
                <span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span>
              </button>
            </el-tooltip>
          </template>
        </el-table-column>

      </el-table>

      <div v-if="sortedFilteredData.length > 0"
        class="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        style="border-top:1px solid #e4e7ed;">
        <span class="text-sm" style="color:#909399;">
          顯示 {{ sortedFilteredData.length }} / 共{{ crmStore.users.length }} 人·
          VIP {{ crmStore.vipUsers.length }} · 沉睡 {{ crmStore.sleepingUsers.length }}
        </span>
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="sortedFilteredData.length"
          layout="sizes, prev, pager, next"
          background small />
      </div>
    </div>

  </div>

  <!-- ?? ??建?資? Dialog ???????????????????????????????? -->
  <el-dialog v-model="showCreateDialog" width="720px" :close-on-click-modal="false" :show-close="false">
    <!-- ?? Header -->
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px]" style="color:#409EFF;">person_add</span>
          <span class="text-base font-bold" style="color:#1a1d23;">手動建立客戶資料</span>
        </div>
        <button @click="showCreateDialog = false" class="flex items-center justify-center w-8 h-8 rounded-md transition-colors" style="color:#909399;" @mouseenter="$event.target.style.background='#f5f7fa'" @mouseleave="$event.target.style.background='transparent'">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </template>

    <el-form ref="createFormRef" :model="createForm" :rules="createRules" size="large">

      <!-- Section 1: 身份資料 -->
      <div class="mb-5">
        <div class="flex items-center gap-2 mb-4 pb-2" style="border-bottom:1px solid #e4e7ed;">
          <span class="material-symbols-outlined text-[16px]" style="color:#409EFF;">badge</span>
          <span class="text-sm font-semibold" style="color:#303133;">身份資料</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">BingX UID <span style="color:#F56C6C;">*</span></label>
            <el-form-item prop="uid" class="!mb-0">
              <el-input v-model="createForm.uid" placeholder="請輸入 UID" />
            </el-form-item>
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">帳號類型</label>
            <el-select v-model="createForm.account_type" placeholder="選擇" clearable style="width:100%">
              <el-option label="新帳號" value="new" /><el-option label="舊帳號" value="old" />
            </el-select>
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">邀請類型</label>
            <el-select v-model="createForm.invite_type" placeholder="選擇" clearable style="width:100%">
              <el-option label="直接邀請" value="直接邀請" /><el-option label="間接邀請" value="間接邀請" />
            </el-select>
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">邀請人 UID</label>
            <el-input v-model="createForm.inviter_uid_code" placeholder="選填" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">邀請人 LINE 暱稱</label>
            <el-input v-model="createForm.inviter_line_name" placeholder="選填" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">LINE 暱稱</label>
            <el-input v-model="createForm.line_name" placeholder="選填" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">官網信箱</label>
            <el-input v-model="createForm.official_email" placeholder="選填" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">TradingView 帳號</label>
            <el-input v-model="createForm.tradingview_account" placeholder="選填" />
          </div>
        </div>
      </div>

      <!-- Section 2: 財務資料 -->
      <div class="mb-5">
        <div class="flex items-center gap-2 mb-4 pb-2" style="border-bottom:1px solid #e4e7ed;">
          <span class="material-symbols-outlined text-[16px]" style="color:#409EFF;">attach_money</span>
          <span class="text-sm font-semibold" style="color:#303133;">財務資料</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">BingX 註冊日期</label>
            <el-input v-model="createForm.bingx_register_date" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">首次入金日期</label>
            <el-input v-model="createForm.first_deposit_time" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">近期交易量(U)</label>
            <el-input-number v-model="createForm.volume_recent" :precision="2" :step="1000" size="large" style="width:100%" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">總資產(U)</label>
            <el-input-number v-model="createForm.total_assets" :precision="2" :step="100" size="large" style="width:100%" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">BingX VIP 等級</label>
            <el-input v-model="createForm.bingx_vip_level" placeholder="例：0 / Lv1" />
          </div>
        </div>
      </div>

      <!-- Section 3: CRM 標籤設定?-->
      <div>
        <div class="flex items-center gap-2 mb-4 pb-2" style="border-bottom:1px solid #e4e7ed;">
          <span class="material-symbols-outlined text-[16px]" style="color:#409EFF;">label</span>
          <span class="text-sm font-semibold" style="color:#303133;">CRM 標籤設定</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">指標版本</label>
            <el-input v-model="createForm.indicator_version" placeholder="選填" />
          </div>
          <div>
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">社群互動</label>
            <el-input v-model="createForm.community_interaction" placeholder="選填" />
          </div>
          <div class="col-span-2">
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">備註標籤（逗號分隔）</label>
            <el-input v-model="createForm.note_tags" placeholder="例如：高活躍、VIP、潛力客戶" />
          </div>
          <div class="col-span-2">
            <label class="block text-sm mb-1.5 font-medium" style="color:#606266;">文字備註</label>
            <el-input v-model="createForm.text_notes" type="textarea" :rows="3" placeholder="記錄客戶互動、好感度、事項…..." />
          </div>
        </div>
      </div>

    </el-form>

    <template #footer>
      <div class="flex items-center justify-between">
        <p class="text-sm" style="color:#909399;">* 選填欄位可以之後再補填</p>
        <div class="flex gap-2">
          <button
            class="h-9 px-4 rounded-md text-sm font-medium transition-colors"
            style="background:#fff;border:1px solid #dcdfe6;color:#606266;"
            @click="showCreateDialog = false"
          >取消</button>
          <button
            class="h-9 px-4 rounded-md text-sm font-medium text-white shadow-sm transition-colors"
            style="background:#409EFF;"
            @click="submitCreateForm"
          >
            <span class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">person_add</span>
              建立客戶
            </span>
          </button>
        </div>
      </div>
    </template>
  </el-dialog>

</template>

