<script setup>
/**
 * CustomerDetail.vue - 客戶資料頁
 * SDD Traceability: step5_create_mb.md § 3B. 查看客戶資料頁
 * Route: /crm/:uid
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { useCrmStore } from '../store/index.js'

const route = useRoute()
const router = useRouter()
const crmStore = useCrmStore()

const uid = computed(() => route.params.uid)
const user = computed(() => crmStore.users.find(u => u.uid === uid.value) ?? null)

// 編輯模式????????????????
const editing = ref(false)
const editForm = ref({})

function startEdit() {
  editForm.value = { ...user.value }
  // note_tags 陣列轉換為字串（方便 input 編輯）
  editForm.value._note_tags_str = Array.isArray(user.value.note_tags)
    ? user.value.note_tags.join(', ')
    : (user.value.note_tags || '')
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editForm.value = {}
}

function saveEdit() {
  if (!editForm.value.uid) {
    ElMessage.error('UID 不能為空')
    return
  }
  const patch = { ...editForm.value }
  // ?? note_tags
  patch.note_tags = patch._note_tags_str
    ? patch._note_tags_str.split(',').map(s => s.trim()).filter(Boolean)
    : []
  delete patch._note_tags_str

  try {
    crmStore.updateUser(uid.value, patch)
    ElMessage.success('資料已儲存')
    editing.value = false
  } catch (err) {
    ElNotification({ title: '儲存失敗', type: 'error', message: err.message })
  }
}

onMounted(() => {
  if (!user.value) {
    ElMessage.warning('找不到 UID：' + uid.value + ' 的客戶資料')
  }
})

function accountTypeLabel(v) {
  if (v === 'new') return '新帳號'
  if (v === 'old') return '舊帳號'
  return v ?? '--'
}

function formatNumber(n) {
  if (n === null || n === undefined) return '--'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="flex flex-col gap-5 lg:h-full">

    <!-- 頂部區域：導航 + 操作按鈕 -->
    <div class="flex flex-row items-center justify-between gap-4 flex-wrap shrink-0">
      <div class="flex items-center gap-2 text-sm" style="color:#909399;">
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-[#e6f0ff] hover:text-[#409EFF] flex-shrink-0"
          style="background:#fff;border:1px solid #e4e7ed;color:#606266;"
          @click="router.back()"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <button class="hover:text-[#409EFF] transition-colors" @click="router.push('/crm')">客戶總表</button>
        <span class="material-symbols-outlined text-base">chevron_right</span>
        <span class="font-semibold" style="color:#000000;">客戶概覽</span>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="user">
          <button v-if="!editing"
            class="h-9 px-4 flex items-center gap-1.5 text-sm font-medium rounded-md shadow-sm transition-colors"
            style="background:#fff;border:1px solid #dcdfe6;color:#303133;"
            @click="startEdit"
          >
            編輯資料
          </button>
          <template v-else>
            <button
              class="h-9 px-4 flex items-center gap-1.5 text-sm font-medium text-white rounded-md shadow-md transition-all"
              style="background:#409EFF;"
              @click="saveEdit"
            >
              <span class="material-symbols-outlined text-[18px]">save</span> 儲存變更
            </button>
            <button
              class="h-9 px-4 text-sm font-medium rounded-md shadow-sm transition-colors"
              style="background:#fff;border:1px solid #dcdfe6;color:#606266;"
              @click="cancelEdit"
            >返回</button>
          </template>
        </template>
      </div>
    </div>

    <!-- 找不到用戶 -->
    <div v-if="!user" class="bg-white rounded-lg p-12 text-center" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
      <span class="material-symbols-outlined text-6xl mb-4 block" style="color:#dcdfe6;">person_search</span>
      <p class="text-base mb-4" style="color:#909399;">找不到 UID：{{ uid }} 的客戶資料</p>
      <button class="px-4 py-2 rounded-md text-sm text-white" style="background:#409EFF;" @click="router.push('/crm')">回到總表</button>
    </div>

    <!-- 主要內容區 -->
    <div v-else class="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:overflow-hidden">

      <!-- 左側：主要資料 -->
      <div class="flex flex-col gap-5 pb-4 lg:flex-1 lg:overflow-y-auto">

        <!-- Profile Summary Card -->
        <div class="bg-white rounded-md" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
          <div class="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <!-- Avatar Circle -->
            <div class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style="background:#ecf5ff;color:#409EFF;border:1px solid rgba(64,158,255,0.2);">
              {{ String(user.uid).slice(-2) }}
            </div>
            <div class="flex-1 flex flex-col gap-2">
              <div class="flex items-center gap-3 flex-wrap">
                <h1 class="text-xl font-bold" style="color:#000000;">UID: {{ user.uid }}</h1>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-bold uppercase tracking-wide"
                  :style="(user.account_type === 'new') ? 'background:rgba(103,194,58,0.1);color:#67C23A;border:1px solid rgba(103,194,58,0.2);' : 'background:#f5f7fa;color:#909399;border:1px solid #e4e7ed;'">
                  {{ accountTypeLabel(user.account_type) }}
                </span>
                <span v-if="user.invite_type" class="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium"
                  style="background:#f0f9eb;color:#67C23A;border:1px solid rgba(103,194,58,0.2);">
                  {{ user.invite_type }}
                </span>
              </div>
              <div class="flex flex-wrap gap-4 text-sm" style="color:#909399;">
                <span v-if="user.line_name" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px]">chat</span>
                  <span style="color:#303133;font-weight:500;">{{ user.line_name }}</span>
                </span>
                <span v-if="user.official_email" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px]">mail</span>
                  <span style="color:#303133;">{{ user.official_email }}</span>
                </span>
                <span v-if="user.last_trade_date" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px]">schedule</span>
                  最後交易日：{{ user.last_trade_date }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Identity & Account Details -->
        <div class="bg-white rounded-md" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
          <div class="px-5 py-4 flex items-center gap-2" style="border-bottom:1px solid #e4e7ed;">
            <span class="material-symbols-outlined text-[20px]" style="color:#409EFF;">badge</span>
            <span class="text-base font-bold" style="color:#000000;">身份與帳號資料</span>
          </div>
          <div class="p-5">
            <template v-if="!editing">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-8">
                <div><div class="text-sm mb-1" style="color:#606266;">UID</div><div class="font-mono font-medium" style="color:#409EFF;">{{ user.uid }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">帳號類型</div>
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium"
                    :style="user.account_type === 'new' ? 'background:#ecf5ff;color:#409EFF;border:1px solid rgba(64,158,255,0.2);' : 'background:#f5f7fa;color:#909399;border:1px solid #e4e7ed;'">
                    {{ accountTypeLabel(user.account_type) }}
                  </span>
                </div>
                <div><div class="text-sm mb-1" style="color:#606266;">邀請類型</div><div class="font-medium" style="color:#303133;">{{ user.invite_type || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">邀請人 UID</div><div class="font-mono font-medium cursor-pointer transition-colors hover:text-[#409EFF]" style="color:#303133;">{{ user.inviter_uid_code || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">已綁定邀請碼</div><div class="font-mono font-medium" style="color:#303133;">{{ user.bound_invite_code || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">他的推廣邀請碼</div><div class="font-mono font-medium" style="color:#303133;">{{ user.own_promo_code || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">邀請人 LINE 暱稱</div><div class="font-medium" style="color:#303133;">{{ user.inviter_line_name || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">LINE 暱稱</div><div class="font-medium" style="color:#303133;">{{ user.line_name || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">官網信箱</div><div class="font-medium" style="color:#303133;word-break:break-all;">{{ user.official_email || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">TradingView 帳號</div><div class="font-medium" style="color:#303133;">{{ user.tradingview_account || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">BingX 註冊日期</div><div class="font-medium" style="color:#303133;">{{ user.bingx_register_date || user.register_date || '--' }}</div></div>
              </div>
            </template>
            <template v-else>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm mb-1" style="color:#606266;">BingX UID</label><input :value="editForm.uid" disabled class="w-full px-3 py-2 rounded text-sm" style="background:#f5f7fa;border:1px solid #e4e7ed;color:#909399;height:40px;" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">帳號類型</label>
                  <el-select v-model="editForm.account_type" clearable style="width:100%" size="large">
                    <el-option label="新帳號" value="new" /><el-option label="舊帳號" value="old" />
                  </el-select>
                </div>
                <div><label class="block text-sm mb-1" style="color:#606266;">邀請類型</label>
                  <el-select v-model="editForm.invite_type" clearable style="width:100%" size="large">
                    <el-option label="直接邀請" value="直接邀請" /><el-option label="間接邀請" value="間接邀請" />
                  </el-select>
                </div>
                <div><label class="block text-sm mb-1" style="color:#606266;">邀請人 UID</label><el-input v-model="editForm.inviter_uid_code" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">已綁定邀請碼</label><el-input v-model="editForm.bound_invite_code" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">他的推廣邀請碼</label><el-input v-model="editForm.own_promo_code" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">邀請人 LINE 暱稱</label><el-input v-model="editForm.inviter_line_name" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">LINE 暱稱</label><el-input v-model="editForm.line_name" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">官網信箱</label><el-input v-model="editForm.official_email" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">TradingView 帳號</label><el-input v-model="editForm.tradingview_account" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">BingX 註冊日期</label><el-input v-model="editForm.bingx_register_date" placeholder="YYYY-MM-DD HH:mm:ss" size="large" /></div>
              </div>
            </template>
          </div>
        </div>

        <!-- Financial Overview -->
        <div class="bg-white rounded-md" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
          <div class="px-5 py-4 flex items-center gap-2" style="border-bottom:1px solid #e4e7ed;">
            <span class="material-symbols-outlined text-[20px]" style="color:#409EFF;">attach_money</span>
            <span class="text-base font-bold" style="color:#000000;">財務總覽</span>
          </div>
          <div class="p-5">
            <template v-if="!editing">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-8">
                <div>
                  <div class="text-sm mb-1" style="color:#606266;">近期交易量(U)</div>
                  <div class="text-lg font-semibold" style="color:#1a1d23;">{{ formatNumber(user.volume_recent ?? user.volume_30d) }}</div>
                </div>
                <div>
                  <div class="text-sm mb-1" style="color:#606266;">總資產(U)</div>
                  <div class="text-lg font-bold" :style="(user.total_assets ?? user.balance) > 5000 ? 'color:#E6A23C;' : 'color:#1a1d23;'">
                    {{ formatNumber(user.total_assets ?? user.balance) }}
                  </div>
                </div>
                <div>
                  <div class="text-sm mb-1" style="color:#606266;">BingX VIP 等級</div>
                  <div class="flex items-center gap-1.5 w-fit px-2 py-1 rounded" style="background:rgba(230,162,60,0.08);border:1px solid rgba(230,162,60,0.2);">
                    <span class="material-symbols-outlined text-[18px]" style="color:#E6A23C;">workspace_premium</span>
                    <span class="font-bold text-sm" style="color:#E6A23C;">{{ user.bingx_vip_level ?? '--' }}</span>
                  </div>
                </div>
                <div>
                  <div class="text-sm mb-1" style="color:#606266;">首次入金日</div>
                  <div class="font-medium" style="color:#303133;">{{ user.first_deposit_time || '--' }}</div>
                </div>
                <div>
                  <div class="text-sm mb-1" style="color:#606266;">最後交易日</div>
                  <div class="font-medium" style="color:#303133;">{{ user.last_trade_date || '--' }}</div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm mb-1" style="color:#606266;">近期交易量(U)</label><el-input-number v-model="editForm.volume_recent" :precision="2" :step="1000" style="width:100%" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">總資產(U)</label><el-input-number v-model="editForm.total_assets" :precision="2" :step="100" style="width:100%" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">BingX VIP 等級</label><el-input v-model="editForm.bingx_vip_level" placeholder="例：0 / Lv1" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">首次入金日</label><el-input v-model="editForm.first_deposit_time" placeholder="YYYY-MM-DD" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">最後交易日</label><el-input v-model="editForm.last_trade_date" placeholder="YYYY-MM-DD" size="large" /></div>
              </div>
            </template>
          </div>
        </div>

      </div>

      <!-- 右側：CRM 指標 + 備註 -->
      <div class="w-full lg:w-96 lg:flex-shrink-0 lg:overflow-y-auto flex flex-col gap-5">

        <!-- CRM Metrics & Tags -->
        <div class="bg-white rounded-md" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">
          <div class="px-5 py-4 flex items-center gap-2" style="border-bottom:1px solid #e4e7ed;">
            <span class="material-symbols-outlined text-[20px]" style="color:#409EFF;">label</span>
            <span class="text-base font-bold" style="color:#000000;">CRM 指標與標籤</span>
          </div>
          <div class="p-5">
            <template v-if="!editing">
              <div class="grid grid-cols-2 gap-y-5 gap-x-4">
                <div class="col-span-2">
                  <div class="text-sm mb-2" style="color:#606266;">RFM 分數</div>
                  <div v-if="user.rfm_score" class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-sm font-bold" style="background:rgba(103,194,58,0.1);color:#67C23A;border:1px solid rgba(103,194,58,0.2);">R: {{ user.rfm_score.r }}</span>
                    <span class="px-2 py-0.5 rounded text-sm font-bold" style="background:#ecf5ff;color:#409EFF;border:1px solid rgba(64,158,255,0.2);">F: {{ user.rfm_score.f }}</span>
                    <span class="px-2 py-0.5 rounded text-sm font-bold" style="background:rgba(144,97,219,0.1);color:#9061db;border:1px solid rgba(144,97,219,0.2);">M: {{ user.rfm_score.m }}</span>
                  </div>
                  <div v-else class="text-sm" style="color:#dcdfe6;">--</div>
                </div>
                <div><div class="text-sm mb-1" style="color:#606266;">指標版本</div><div class="font-medium" style="color:#303133;">{{ user.indicator_version || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">社群互動</div><div class="font-medium" style="color:#303133;">{{ user.community_interaction || '--' }}</div></div>
                <div><div class="text-sm mb-1" style="color:#606266;">RFM 受眾標籤</div><div class="font-medium" style="color:#303133;">{{ user.rfm_score_tag || '--' }}</div></div>
                <div class="col-span-2">
                  <div class="text-sm mb-2" style="color:#606266;">備註標籤</div>
                  <div class="flex flex-wrap gap-2">
                    <template v-if="user.note_tags && user.note_tags.length">
                      <span v-for="t in user.note_tags" :key="t"
                        class="inline-flex px-3 py-1 rounded-full text-sm font-medium"
                        style="background:#f5f7fa;color:#606266;border:1px solid #e4e7ed;">{{ t }}</span>
                    </template>
                    <span v-else class="text-sm" style="color:#dcdfe6;">--</span>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm mb-1" style="color:#606266;">RFM 受眾標籤</label><el-input v-model="editForm.rfm_score_tag" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">指標版本</label><el-input v-model="editForm.indicator_version" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">社群互動</label><el-input v-model="editForm.community_interaction" size="large" /></div>
                <div><label class="block text-sm mb-1" style="color:#606266;">備註標籤（逗號分隔）</label><el-input v-model="editForm._note_tags_str" placeholder="例：高活躍、活躍" size="large" /></div>
              </div>
            </template>
          </div>
        </div>

        <!-- Notes -->
        <div class="bg-white rounded-md flex flex-col" style="border:1px solid #e4e7ed;box-shadow:0 0 12px rgba(0,0,0,0.05);">

          <!-- Notes Header -->
          <div class="px-5 py-4 flex items-center justify-between" style="border-bottom:1px solid #e4e7ed;background:#f5f7fa;border-radius:4px 4px 0 0;">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px]" style="color:#409EFF;">edit_note</span>
              <span class="text-base font-bold" style="color:#000000;">內部備註</span>
            </div>
          </div>

          <!-- Notes Body -->
          <div class="flex-1 p-5 flex flex-col gap-4">
            <div class="text-sm flex items-center gap-1.5" style="color:#909399;">
              <span class="material-symbols-outlined text-sm">info</span>
              備註欄為內部記錄，不對外顯示
            </div>
            <div class="flex-1">
              <textarea
                v-if="editing"
                v-model="editForm.text_notes"
                class="w-full p-4 rounded-lg text-sm leading-relaxed resize-none outline-none transition-shadow"
                style="min-height:200px;border:1px solid #dcdfe6;color:#303133;font-family:inherit;"
                placeholder="記錄客戶互動、好感度、事項..."
                @focus="$event.target.style.borderColor='#409EFF'; $event.target.style.boxShadow='0 0 0 2px rgba(64,158,255,0.2)'"
                @blur="$event.target.style.borderColor='#dcdfe6'; $event.target.style.boxShadow='none'"
              ></textarea>
              <div v-else
                class="w-full p-4 rounded-lg text-sm leading-relaxed"
                style="min-height:200px;border:1px solid #e4e7ed;background:#fafafa;color:#303133;white-space:pre-wrap;word-break:break-word;">
                <span v-if="user.text_notes">{{ user.text_notes }}</span>
                <span v-else style="color:#dcdfe6;">尚無備註...</span>
              </div>
            </div>
            <div class="flex justify-end" v-if="editing">
              <button
                class="px-4 py-2 flex items-center gap-1.5 rounded-md text-sm font-medium text-white shadow-sm transition-colors"
                style="background:#409EFF;"
                @click="saveEdit"
              >
                <span class="material-symbols-outlined text-[18px]">send</span>
                儲存備註
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

