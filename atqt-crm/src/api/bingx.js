import axios from 'axios'
import CryptoJS from 'crypto-js'

// ── 工廠函式：依傳入的 apiKey / secretKey 建立獨立的 Axios 實例 ──
function createBingxInstance(apiKey, secretKey) {
  const instance = axios.create({
    // 開發環境透過 Vite proxy 轉發，避免 CORS
    baseURL: '/api/bingx',
    timeout: 15000,
  })

  /** 將 params 物件轉為排序後的 query string (BingX 規範) */
  function buildQueryString(params) {
    return Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&')
  }

  // Request Interceptor：自動注入 timestamp、signature、X-BX-APIKEY
  instance.interceptors.request.use(config => {
    const timestamp = Date.now()
    const params = { ...(config.params || {}), timestamp }
    const queryString = buildQueryString(params)
    const signature = CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex)

    config.params = { ...params, signature }
    config.headers['X-BX-APIKEY'] = apiKey
    return config
  }, error => Promise.reject(error))

  // Response Interceptor：統一解包 / 錯誤訊息
  instance.interceptors.response.use(
    response => response.data,
    error => {
      const msg = error?.response?.data?.msg || error.message || '未知錯誤'
      return Promise.reject(new Error(msg))
    }
  )

  return instance
}

// ── 兩個帳號的獨立實例 ──────────────────────────────────────────
const OLD_API_KEY    = import.meta.env.VITE_BINGX_OLD_API_KEY    || ''
const OLD_SECRET_KEY = import.meta.env.VITE_BINGX_OLD_SECRET_KEY || ''
const NEW_API_KEY    = import.meta.env.VITE_BINGX_NEW_API_KEY    || ''
const NEW_SECRET_KEY = import.meta.env.VITE_BINGX_NEW_SECRET_KEY || ''

export const oldApi = createBingxInstance(OLD_API_KEY, OLD_SECRET_KEY)
export const newApi = createBingxInstance(NEW_API_KEY, NEW_SECRET_KEY)

// ── API 封裝：接受 instance 參數，預設使用舊帳號 ────────────────

/**
 * 取得代理商下線名單 (AARRR 註冊數據)
 * GET /openApi/agent/v1/account/inviteAccountList
 * @param {import('axios').AxiosInstance} api  傳入 oldApi 或 newApi
 */
export function getAgencyInvitees(api = oldApi, params = {}) {
  return api.get('/openApi/agent/v1/account/inviteAccountList', {
    params: {
      pageIndex: 1,
      pageSize: 200,
      recvWindow: 5000,
      ...params,
    },
  })
}

/**
 * 取得代理每日傭金明細
 * GET /openApi/agent/v1/account/inviteDailyCommission
 */
export function getCommissionRecords(api = oldApi, params = {}) {
  return api.get('/openApi/agent/v1/account/inviteDailyCommission', {
    params: {
      pageIndex: 1,
      pageSize: 200,
      recvWindow: 5000,
      ...params,
    },
  })
}

/**
 * 取得子帳戶資產餘額 (高淨值識別)
 * GET /openApi/v3/subAccount/assets
 */
export function getSubAccountAssets(api = oldApi, params = {}) {
  return api.get('/openApi/v3/subAccount/assets', { params })
}

// 預設匯出舊帳號實例（向下相容）
export default oldApi
