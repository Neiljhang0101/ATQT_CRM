import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './style.css'
import router from './router/index.js'
import App from './App.vue'
import { useCrmStore } from './store/index.js'

const app = createApp(App)
const pinia = createPinia()

// 全域註冊 Element Plus Icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')

// 應用掛載後初始化 SQLite 資料庫（非阻塞）
// SDD Traceability: step6_db.md § 1. 套件安裝與環境準備
const crmStore = useCrmStore()
crmStore.initDatabase().catch(err => console.error('[DB] 初始化失敗:', err))
