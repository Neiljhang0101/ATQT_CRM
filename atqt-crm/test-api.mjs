/**
 * BingX API 探索腳本  代理商可用欄位清查
 * node test-api.mjs
 */
import crypto from 'crypto'
import https from 'https'

const API_KEY    = 'vrI4J6EZTWdq6oII9jM5U0p53XyH4ee2xkdVM11YtqIwPu5Pmylt6otoxB8eHEWESrxy4BwGX5nnUdZ6hMIzAA'
const SECRET_KEY = 'MQ9dtJGBAzvvXGNzRUOmpbnjmhiUNxlQzAROdywZ2nsxVbEqX9XMJekqjiLnJ9WBsEEVd8rmY4hLGJwvmWFEA'
const BASE = 'open-api.bingx.com'

function call(path, extraParams = {}) {
  return new Promise(resolve => {
    const params = { pageIndex: '1', pageSize: '3', recvWindow: '5000', timestamp: String(Date.now()), ...extraParams }
    const qs = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
    const sig = crypto.createHmac('sha256', SECRET_KEY).update(qs).digest('hex')
    const url = `https://${BASE}${path}?${qs}&signature=${sig}`
    https.get(url, { headers: { 'X-BX-APIKEY': API_KEY } }, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve({ path, status: res.statusCode, json: JSON.parse(raw) }) }
        catch { resolve({ path, status: res.statusCode, raw: raw.substring(0, 300) }) }
      })
    }).on('error', e => resolve({ path, error: e.message }))
  })
}

const ENDPOINTS = [
  ['/openApi/agent/v1/account/inviteAccountList', {}],
  ['/openApi/agent/v1/account/inviteDailyCommission', {}],
  ['/openApi/agent/v1/account/inviteDepositList', {}],
  ['/openApi/agent/v1/account/agentUserInfo', {}],
  ['/openApi/v3/subAccount/assets', {}],
  ['/openApi/v3/agency/commission/records', {}],
  ['/openApi/agent/v1/account/partnerInfo', {}],
  ['/openApi/agent/v1/account/inviteCodeData', {}],
]

console.log(' 探索代理商 API 欄位...\n')
for (const [path, extra] of ENDPOINTS) {
  const r = await call(path, extra)
  console.log(`\n ${path}`)
  if (r.error) { console.log(`    網路錯誤: ${r.error}`); continue }
  if (!r.json)  { console.log(`     HTTP ${r.status} | ${r.raw}`); continue }
  const j = r.json
  if (j.code !== 0) { console.log(`    code=${j.code}  msg=${j.msg}`); continue }
  const data = j.data
  const list = data?.list ?? data?.commissionList ?? data?.depositList ?? (Array.isArray(data) ? data : null)
  if (list && list.length > 0) {
    console.log(`    欄位: [ ${Object.keys(list[0]).join(' | ')} ]`)
    console.log(`   第一筆: ${JSON.stringify(list[0])}`)
  } else {
    console.log(`    data: ${JSON.stringify(data)?.substring(0, 400)}`)
  }
}
console.log('\n 完畢')
