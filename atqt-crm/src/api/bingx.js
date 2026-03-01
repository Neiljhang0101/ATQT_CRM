import axios from 'axios'
import CryptoJS from 'crypto-js'

// ── 工廠函式：依傳入的 apiKey / secretKey 建立獨立的 Axios 實例 ──
function createBingxInstance(apiKey, secretKey) {
  const instance = axios.create({
    baseURL: '/api/bingx',
    timeout: 15000,
  })

  function buildQueryString(params) {
    return Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  }

  instance.interceptors.request.use(config => {
    const timestamp = Date.now()
    const params = { ...(config.params || {}), timestamp }
    const queryString = buildQueryString(params)
    const signature = CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex)
    config.params = { ...params, signature }
    config.headers['X-BX-APIKEY'] = apiKey
    return config
  }, error => Promise.reject(error))

  instance.interceptors.response.use(
    response => response.data,
    error => {
      const msg = error?.response?.data?.msg || error.message || '未知錯誤'
      return Promise.reject(new Error(msg))
    }
  )

  return instance
}

// ── 兩個帳號的 key（trim 防多餘字元）────────────────────────────────────
export const OLD_API_KEY    = (import.meta.env.VITE_BINGX_OLD_API_KEY    || '').trim()
export const OLD_SECRET_KEY = (import.meta.env.VITE_BINGX_OLD_SECRET_KEY || '').trim()
export const NEW_API_KEY    = (import.meta.env.VITE_BINGX_NEW_API_KEY    || '').trim()
export const NEW_SECRET_KEY = (import.meta.env.VITE_BINGX_NEW_SECRET_KEY || '').trim()

console.log('[bingx.js] OLD key:', OLD_API_KEY.slice(0, 8) || '(empty!)', '| secret len:', OLD_SECRET_KEY.length)
console.log('[bingx.js] NEW key:', NEW_API_KEY.slice(0, 8) || '(empty!)', '| secret len:', NEW_SECRET_KEY.length)

export const oldApi = createBingxInstance(OLD_API_KEY, OLD_SECRET_KEY)
export const newApi = createBingxInstance(NEW_API_KEY, NEW_SECRET_KEY)

// ── API 封裝 ──────────────────────────────────────────────────────────────

/** 取得代理商下線名單 */
export function getAgencyInvitees(api = oldApi, params = {}) {
  return api.get('/openApi/agent/v1/account/inviteAccountList', {
    params: { pageIndex: 1, pageSize: 200, recvWindow: 5000, ...params },
  })
}

/**
 * 傭金明細純函式 ── 完全照官方 sample 手動拼 URL + fetch，不走 axios
 * BingX commission v2 不接受 recvWindow，必須用此方式
 * @param {string} apiKey
 * @param {string} secretKey
 * @param {Object} params  必須含 startTime / endTime (ms)
 */
export async function commissionFetch(apiKey, secretKey, params = {}) {
  const paramsObj = { pageIndex: 1, pageSize: 100, ...params, timestamp: Date.now() }
  const qs = Object.keys(paramsObj).sort().map(k => `${k}=${paramsObj[k]}`).join('&')
  const signature = CryptoJS.HmacSHA256(qs, secretKey).toString(CryptoJS.enc.Hex)
  const url = `/api/bingx/openApi/agent/v2/reward/commissionDataList?${qs}&signature=${signature}`
  const res = await fetch(url, { headers: { 'X-BX-APIKEY': apiKey } })
  const data = await res.json()
  console.log('[commissionFetch] code:', data.code, '| total:', data.data?.total, '| msg:', data.msg ?? '')
  return data
}

/** 取得子帳戶資產餘額 */
export function getSubAccountAssets(api = oldApi, params = {}) {
  return api.get('/openApi/v3/subAccount/assets', { params })
}

export default oldApi
