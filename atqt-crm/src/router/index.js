import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import CrmTable from '../views/CrmTable.vue'
import CustomerDetail from '../views/CustomerDetail.vue'
import Radar from '../views/Radar.vue'
import Campaigns from '../views/Campaigns.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
  },
  {
    path: '/crm',
    name: 'CrmTable',
    component: CrmTable,
  },
  {
    // SDD Traceability: step5_create_mb.md § 3B. 動態路由 /crm/:uid
    path: '/crm/:uid',
    name: 'CustomerDetail',
    component: CustomerDetail,
  },
  {
    path: '/radar',
    name: 'Radar',
    component: Radar,
  },
  {
    path: '/campaigns',
    name: 'Campaigns',
    component: Campaigns,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
