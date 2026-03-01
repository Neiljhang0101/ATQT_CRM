<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCrmStore } from '../store/index.js'
import { queryAllCustomers, queryAllWeekly } from '../database/sqlite.js'

const store = useCrmStore()

const kpis = ref([
  { label: '本週總交易量', value: '--', unit: 'USDT', msIcon: 'payments', color: '#409EFF', bg: '#ecf5ff' },
  { label: '活躍下線人數', value: '--', unit: '人',   msIcon: 'group',    color: '#67C23A', bg: 'rgba(103,194,58,0.1)' },
  { label: '高淨值客戶',   value: '--', unit: '位',   msIcon: 'star',     color: '#E6A23C', bg: 'rgba(230,162,60,0.1)' },
  { label: '流失風險客戶', value: '--', unit: '位',   msIcon: 'warning',  color: '#F56C6C', bg: 'rgba(245,108,108,0.1)' },
])
const activePeriod = ref('week')
const periods = [
  { value: 'today', label: '今日' },
  { value: 'week',  label: '本週' },
  { value: 'month', label: '本月' },
  { value: 'year',  label: '年度' },
]
const activities = ref([
  { icon: 'sync',       color: '#409EFF', bg: '#ecf5ff',                title: '同步 API 資料', desc: '完成兩帳號並行同步',    time: '剛剛' },
  { icon: 'star',       color: '#E6A23C', bg: 'rgba(230,162,60,0.1)',  title: '標籤更新',     desc: '3 位下線升級為高淨值客戶', time: '5m' },
  { icon: 'warning',    color: '#F56C6C', bg: 'rgba(245,108,108,0.1)', title: '沉睡警報',     desc: '發現 7 位流失風險客戶',   time: '1h' },
  { icon: 'add_circle', color: '#67C23A', bg: 'rgba(103,194,58,0.1)',  title: '新增下線',     desc: '本週新增 12 位下線',     time: '3h' },
])

// ── DB 管理 ─────────────────────────────────────
const syncing = ref(false)

async function handleSyncWeekly() {
  if (!store.dbReady) {
    ElMessage.warning('資料庫尚未就緒，請稍候…')
    return
  }
  if (store.users.length === 0) {
    ElMessage.warning('目前無客戶資料，請先同步或匯入 XLSX')
    return
  }
  await ElMessageBox.confirm(
    `確定要將目前 ${store.users.length} 位客戶的數據寫入本週 SQLite 快照嗎？`,
    '📊 每週戰情結算',
    { confirmButtonText: '確認結算', cancelButtonText: '取消', type: 'info' }
  )
  syncing.value = true
  try {
    const { week, count } = await store.syncWeeklyData()
    ElMessage.success(`✅ ${week} 結算完成，共寫入 ${count} 筆紀錄`)
    activities.value.unshift({
      icon: 'database',
      color: '#409EFF',
      bg: '#ecf5ff',
      title: '每週結算',
      desc: `${week} 已寫入 ${count} 筆 SQLite 快照`,
      time: '剛剛',
    })
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('結算失敗：' + e.message)
  } finally {
    syncing.value = false
  }
}

function handleExportDb() {
  if (!store.dbReady) { ElMessage.warning('資料庫尚未就緒'); return }
  try {
    store.exportDbFile()
    ElMessage.success('已開始下載 .sqlite 備份檔')
  } catch (e) {
    ElMessage.error('備份失敗：' + e.message)
  }
}

async function handleImportDb(file) {
  try {
    const buffer = await file.arrayBuffer()
    await store.importDbFile(buffer)
    ElMessage.success('✅ 資料庫已從備份檔還原')
  } catch (e) {
    ElMessage.error('還原失敗：' + e.message)
  }
  return false  // 阻止 el-upload 自動上傳
}

// ── 資料表檢視器 ────────────────────────────────
const viewerOpen = ref(false)
const viewerTab = ref('customers')
const viewerCustomers = ref([])
const viewerWeekly = ref([])
const viewerLoading = ref(false)

async function openViewer() {
  if (!store.dbReady) { ElMessage.warning('資料庫尚未就緒，請稍候'); return }
  viewerOpen.value = true
  viewerLoading.value = true
  try {
    const [customers, weekly] = await Promise.all([
      queryAllCustomers(),
      queryAllWeekly(200),
    ])
    viewerCustomers.value = customers
    viewerWeekly.value = weekly
  } catch (e) {
    ElMessage.error('查詢失敗：' + e.message)
  } finally {
    viewerLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto flex flex-col gap-6">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <div>
        <h2 class="text-xl font-semibold" style="color:#1a1d23;">戰情大盤</h2>
        <p class="text-sm mt-0.5" style="color:#909399;">最後更新至 {{ new Date().toLocaleDateString('zh-TW') }}</p>
      </div>
      <div class="flex bg-white rounded-md border p-1" style="border-color:#e4e7ed;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <button v-for="p in periods" :key="p.value"
          class="px-3 py-1.5 text-sm font-medium rounded transition-colors"
          :style="activePeriod === p.value ? 'color:#409EFF;background:#ecf5ff;' : 'color:#3d4148;'"
          :class="activePeriod !== p.value ? 'hover:bg-gray-50' : ''"
          @click="activePeriod = p.value">{{ p.label }}</button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div v-for="kpi in kpis" :key="kpi.label"
        class="bg-white rounded-lg p-5 flex flex-col gap-3 transition-shadow hover:shadow-md cursor-default"
        style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium mb-1" style="color:#909399;">{{ kpi.label }}</p>
            <h3 class="text-2xl font-bold" style="color:#1a1d23;">
              {{ kpi.value }}
              <span v-if="kpi.unit" class="text-sm font-normal ml-1" style="color:#909399;">{{ kpi.unit }}</span>
            </h3>
          </div>
          <div class="p-2 rounded-md" :style="`background:${kpi.bg};`">
            <span class="material-symbols-outlined text-[24px]" :style="`color:${kpi.color};`">{{ kpi.msIcon }}</span>
          </div>
        </div>
        <p class="text-xs" style="color:#909399;">同步後即時更新</p>
      </div>
    </div>

    <div class="bg-white rounded-lg p-6" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-base font-semibold" style="color:#1a1d23;">交易量趨勢</h3>
          <p class="text-sm mt-0.5" style="color:#909399;">近 6 週交易線圖概覽（階段五接入實數）</p>
        </div>
        <a href="/crm" class="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80" style="color:#409EFF;">
          前往客戶總表
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </a>
      </div>
      <div class="relative h-56 w-full">
        <div class="absolute left-0 top-0 h-full flex flex-col justify-between text-xs w-8" style="color:#909399;">
          <span>50k</span><span>40k</span><span>30k</span><span>20k</span><span>10k</span><span>0</span>
        </div>
        <div class="absolute left-10 right-0 top-2 bottom-6">
          <div class="w-full h-full flex flex-col justify-between">
            <div v-for="i in 5" :key="i" class="w-full h-px" style="background:#e4e7ed;"></div>
            <div class="w-full h-px" style="background:#dcdfe6;"></div>
          </div>
          <svg class="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradientFill" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" style="stop-color:#409EFF;stop-opacity:0.2"/>
                <stop offset="100%" style="stop-color:#409EFF;stop-opacity:0"/>
              </linearGradient>
            </defs>
            <path d="M0,80 C50,80 50,40 100,40 C150,40 150,100 200,100 C250,100 250,20 300,20 C350,20 350,60 400,60 C450,60 450,30 500,30 C550,30 550,50 600,50 L600,200 L0,200 Z" fill="url(#gradientFill)"/>
            <path d="M0,80 C50,80 50,40 100,40 C150,40 150,100 200,100 C250,100 250,20 300,20 C350,20 350,60 400,60 C450,60 450,30 500,30 C550,30 550,50 600,50" fill="none" stroke="#409EFF" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
            <circle cx="16.6%" cy="40%" r="4" fill="#fff" stroke="#409EFF" stroke-width="2"/>
            <circle cx="33.2%" cy="65%" r="4" fill="#fff" stroke="#409EFF" stroke-width="2"/>
            <circle cx="49.8%" cy="20%" r="4" fill="#fff" stroke="#409EFF" stroke-width="2"/>
            <circle cx="66.4%" cy="40%" r="4" fill="#fff" stroke="#409EFF" stroke-width="2"/>
            <circle cx="83%"   cy="25%" r="4" fill="#fff" stroke="#409EFF" stroke-width="2"/>
            <circle cx="100%"  cy="35%" r="4" fill="#fff" stroke="#409EFF" stroke-width="2"/>
          </svg>
        </div>
        <div class="absolute left-10 right-0 bottom-0 flex justify-between text-xs" style="color:#909399;">
          <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 bg-white rounded-lg flex flex-col" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
        <div class="px-6 py-4 flex justify-between items-center" style="border-bottom:1px solid #e4e7ed;">
          <h3 class="text-base font-semibold" style="color:#1a1d23;">最近動態</h3>
          <span class="text-xs" style="color:#909399;">系統記錄</span>
        </div>
        <div>
          <div v-for="act in activities" :key="act.title"
            class="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            style="border-bottom:1px solid #e4e7ed;">
            <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" :style="`background:${act.bg};`">
              <span class="material-symbols-outlined text-[20px]" :style="`color:${act.color};`">{{ act.icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" style="color:#1a1d23;">{{ act.title }}</p>
              <p class="text-xs truncate" style="color:#909399;">{{ act.desc }}</p>
            </div>
            <span class="text-xs whitespace-nowrap" style="color:#909399;">{{ act.time }}</span>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-lg flex flex-col" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
        <div class="px-6 py-4" style="border-bottom:1px solid #e4e7ed;">
          <h3 class="text-base font-semibold" style="color:#1a1d23;">快速入口</h3>
        </div>
        <div class="p-4 flex flex-col gap-3 flex-1">
          <router-link to="/crm" class="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors group" style="border:1px solid #e4e7ed;">
            <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background:#ecf5ff;">
              <span class="material-symbols-outlined text-[20px]" style="color:#409EFF;">group</span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium" style="color:#1a1d23;">客戶總表</p>
              <p class="text-xs" style="color:#909399;">同步並查看下線名單</p>
            </div>
            <span class="material-symbols-outlined text-[18px] text-gray-300 group-hover:text-[#409EFF] transition-colors">chevron_right</span>
          </router-link>
          <router-link to="/radar" class="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors group" style="border:1px solid #e4e7ed;">
            <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background:rgba(230,162,60,0.1);">
              <span class="material-symbols-outlined text-[20px]" style="color:#E6A23C;">bar_chart</span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium" style="color:#1a1d23;">痛點雷達</p>
              <p class="text-xs" style="color:#909399;">LINE 社群推廣（開發中）</p>
            </div>
            <span class="material-symbols-outlined text-[18px] text-gray-300 group-hover:text-[#409EFF] transition-colors">chevron_right</span>
          </router-link>
          <router-link to="/campaigns" class="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors group" style="border:1px solid #e4e7ed;">
            <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background:rgba(103,194,58,0.1);">
              <span class="material-symbols-outlined text-[20px]" style="color:#67C23A;">flag</span>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium" style="color:#1a1d23;">活動追蹤</p>
              <p class="text-xs" style="color:#909399;">活動效果轉化對照</p>
            </div>
            <span class="material-symbols-outlined text-[18px] text-gray-300 group-hover:text-[#409EFF] transition-colors">chevron_right</span>
          </router-link>
        </div>
        <div class="p-4" style="border-top:1px solid #e4e7ed;">
          <p class="text-xs text-center" style="color:#909399;">下段接入 ECharts 為實際圖表</p>
        </div>
      </div>
    </div>

    <!-- ── SQLite 資料庫管理卡片 ── SDD step6_db.md § 4 ── -->
    <div class="bg-white rounded-lg p-6" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="text-base font-semibold" style="color:#1a1d23;">📦 資料庫管理</h3>
          <p class="text-sm mt-0.5" style="color:#909399;">
            SQLite 本機快照 &nbsp;·&nbsp;
            <span :style="store.dbReady ? 'color:#67C23A;' : 'color:#F56C6C;'">
              {{ store.dbReady ? '✅ 已就緒' : '⏳ 載入中…' }}
            </span>
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-3">
        <!-- 每週結算 -->
        <el-button
          type="primary"
          :loading="syncing"
          :disabled="!store.dbReady"
          @click="handleSyncWeekly"
        >
          <span class="material-symbols-outlined text-[16px] mr-1">database</span>
          每週戰情結算
        </el-button>

        <!-- 備份 -->
        <el-button
          type="success"
          :disabled="!store.dbReady"
          @click="handleExportDb"
        >
          <span class="material-symbols-outlined text-[16px] mr-1">download</span>
          備份資料庫 (.sqlite)
        </el-button>

        <!-- 還原 -->
        <el-upload
          :show-file-list="false"
          accept=".sqlite,.db"
          :before-upload="handleImportDb"
        >
          <el-button type="warning">
            <span class="material-symbols-outlined text-[16px] mr-1">upload</span>
            還原資料庫
          </el-button>
        </el-upload>

        <!-- 檢視資料表 -->
        <el-button
          :disabled="!store.dbReady"
          @click="openViewer"
        >
          <span class="material-symbols-outlined text-[16px] mr-1">table_view</span>
          檢視資料表
        </el-button>
      </div>
      <p class="text-xs mt-3" style="color:#909399;">
        結算後資料自動持久化於瀏覽器（localforage）；也可下載 .sqlite 檔案隨身攜帶，下次上傳即可還原所有歷史週報。
      </p>
    </div>

    <!-- ── 資料表檢視對話方塊 ── -->
    <el-dialog
      v-model="viewerOpen"
      title="🗄️ SQLite 資料表檢視"
      width="92%"
      top="4vh"
      destroy-on-close
    >
      <el-tabs v-model="viewerTab">

        <!-- customers 主表 -->
        <el-tab-pane label="customers（主表）" name="customers">
          <p class="text-xs mb-3" style="color:#909399;">共 {{ viewerCustomers.length }} 筆</p>
          <el-table
            :data="viewerCustomers"
            :loading="viewerLoading"
            size="small"
            border
            stripe
            max-height="420"
            style="width:100%;font-size:12px;"
          >
            <el-table-column prop="uid"                label="uid"                min-width="110" fixed show-overflow-tooltip />
            <el-table-column prop="line_name"          label="line_name"          min-width="100" show-overflow-tooltip />
            <el-table-column prop="official_email"     label="official_email"     min-width="140" show-overflow-tooltip />
            <el-table-column prop="register_date"      label="register_date"      min-width="100" show-overflow-tooltip />
            <el-table-column prop="first_deposit_time" label="first_deposit_time" min-width="130" show-overflow-tooltip />
            <el-table-column prop="invite_type"        label="invite_type"        min-width="90"  show-overflow-tooltip />
            <el-table-column prop="text_notes"         label="text_notes"         min-width="120" show-overflow-tooltip />
            <el-table-column prop="last_updated"       label="last_updated"       min-width="160" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>

        <!-- user_weekly_stats 明細表 -->
        <el-tab-pane label="user_weekly_stats（週歷史）" name="weekly">
          <p class="text-xs mb-3" style="color:#909399;">顯示最新 200 筆（依週數降冪）</p>
          <el-table
            :data="viewerWeekly"
            :loading="viewerLoading"
            size="small"
            border
            stripe
            max-height="420"
            style="width:100%;font-size:12px;"
          >
            <el-table-column prop="id"                    label="id"           width="60"  fixed />
            <el-table-column prop="uid"                   label="uid"          min-width="110" show-overflow-tooltip />
            <el-table-column prop="year_week"             label="year_week"    width="90"  />
            <el-table-column prop="total_assets"          label="total_assets" min-width="100" show-overflow-tooltip />
            <el-table-column prop="volume_weekly"         label="volume_weekly" min-width="110" show-overflow-tooltip />
            <el-table-column prop="community_interaction" label="interaction"  width="80"  />
            <el-table-column prop="rfm_score"             label="rfm_score"    width="80"  />
            <el-table-column prop="rfm_tag"               label="rfm_tag"      min-width="100" show-overflow-tooltip />
            <el-table-column prop="record_date"           label="record_date"  min-width="160" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>

      </el-tabs>
    </el-dialog>
  </div>
</template>
