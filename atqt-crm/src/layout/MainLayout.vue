<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

import logoWhite from '../assets/icons/ATQT_logo_white.png'
import logo04 from '../assets/icons/ATQT_logo-04.png'

const route = useRoute()
const sidebarOpen = ref(true)
const isMobile = ref(false)

function handleResize() {
  isMobile.value = window.innerWidth < 768
  sidebarOpen.value = !isMobile.value
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => window.removeEventListener('resize', handleResize))

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

const menuItems = [
  { path: '/dashboard', msIcon: 'dashboard', label: '數據總覽' },
  { path: '/crm',       msIcon: 'group',     label: '客戶總表' },
  { path: '/radar',     msIcon: 'bar_chart', label: '痛點雷達' },
  { path: '/campaigns', msIcon: 'flag',      label: '活動追蹤' },
]

const activeMenu = computed(() => route.path)
</script>

<template>
  <div class="flex h-screen overflow-hidden" style="background:#f5f7fa;">

    <!-- 遮罩 (mobile) -->
    <transition name="fade">
      <div
        v-if="isMobile && sidebarOpen"
        class="fixed inset-0 z-20 bg-black/40"
        @click="toggleSidebar"
      />
    </transition>

    <!-- 側邊欄 -->
    <transition name="slide">
      <aside
        v-show="sidebarOpen"
        class="fixed md:static z-30 flex flex-col h-full w-64 bg-white shrink-0"
        style="border-right:1px solid #e4e7ed;"
      >
        <!-- Logo 區 -->
        <div class="h-16 flex items-center justify-center px-6" style="border-bottom:1px solid #e4e7ed;">
          <img :src="logo04" alt="ATQT Logo" class="h-14 w-auto object-contain" style="image-rendering:auto;" />
        </div>

        <!-- 導覽選單 -->
        <nav class="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-0.5">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
            :class="activeMenu === item.path
              ? 'text-[#409EFF] bg-[#ecf5ff]'
              : 'text-[#3d4148] hover:bg-gray-50 hover:text-[#409EFF]'"
            @click="isMobile && toggleSidebar()"
          >
            <span
              class="material-symbols-outlined text-[22px] transition-colors"
              :style="activeMenu === item.path ? 'color:#409EFF;font-variation-settings:\'FILL\' 1' : ''"
            >{{ item.msIcon }}</span>
            <span>{{ item.label }}</span>
          </router-link>

          <div class="my-2 mx-3" style="border-top:1px solid #e4e7ed;"></div>

          <a
            href="#"
            class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[#3d4148] hover:bg-gray-50 hover:text-[#409EFF] transition-colors group"
          >
            <span class="material-symbols-outlined text-[22px] group-hover:text-[#409EFF] transition-colors">settings</span>
            <span>系統設定</span>
          </a>
        </nav>

        <!-- 底部基本資訊 -->
        <div class="p-4" style="border-top:1px solid #e4e7ed;">
          <div class="flex items-center gap-2 p-2 rounded-md text-xs" style="color:#909399;">
            <div class="w-7 h-7 rounded-full flex items-center justify-center" style="background:#409EFF;padding:4px;">
              <img :src="logoWhite" alt="ATQT" class="w-full h-full object-contain" style="image-rendering:auto;" />
            </div>
            <div class="flex flex-col">
              <span style="color:#1a1d23;font-size:14px;font-weight:500;">管理者</span>
              <span>v1.1 · ATQT Lab</span>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- 主區塊 -->
    <div class="flex flex-1 flex-col min-w-0 overflow-hidden">

      <!-- Header (Sticky) -->
      <header class="h-16 bg-white sticky top-0 z-10 flex items-center justify-between px-6"
              style="border-bottom:1px solid #e4e7ed;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <div class="flex items-center gap-3">
          <!-- 漢堡選單 -->
          <button
            class="p-1.5 rounded-md hover:bg-gray-100 text-[#3d4148] transition-colors"
            @click="toggleSidebar"
          >
            <span class="material-symbols-outlined text-[22px]">{{ sidebarOpen ? 'menu_open' : 'menu' }}</span>
          </button>
          <span class="font-semibold text-sm" style="color:#1a1d23;">ATQT Trading Lab CRM</span>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-xs" style="color:#909399;">{{ new Date().toLocaleDateString('zh-TW') }}</span>
          <button class="relative p-2 text-[#3d4148] hover:bg-gray-100 rounded-full transition-colors">
            <span class="material-symbols-outlined text-[22px]">notifications</span>
          </button>
        </div>
      </header>

      <!-- 頁面主內容 -->
      <main class="flex-1 overflow-y-auto p-6">
        <router-view />
      </main>

    </div>
  </div>
</template>

<style scoped>
/* 側邊欄滑入動畫 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

/* 遮罩淡入動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
