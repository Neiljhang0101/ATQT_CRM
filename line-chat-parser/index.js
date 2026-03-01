/**
 * line-chat-parser / index.js
 *
 * LINE 聊天紀錄解析工具
 * --------------------------------------------------
 * 用法：
 *   1. 將本腳本與 LINE 匯出的 .txt 檔放在同一資料夾
 *   2. node index.js                  ← 自動掃描當前目錄所有 .txt 檔
 *   3. node index.js 群組對話.txt     ← 指定特定檔案
 *
 * 輸出：每個月份產生一個 YYYY-MM_LINE對話.xlsx，存放於 output/ 資料夾
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// ──────────────────────────────────────────────
// ★ 可自訂：機器人 / 官方帳號暱稱黑名單（部分比對）
// ──────────────────────────────────────────────
const BOT_NAMES = [
  'LINE Notify',
  '社群管理員',
  '系統機器人',
  '官方帳號',
  'ATQT Bot',
  'ATQT Assistant',
];

// ──────────────────────────────────────────────
// 工具函式：自動偵測編碼並讀取檔案
// 支援 UTF-16 LE BOM、UTF-8 BOM、純 UTF-8
// ──────────────────────────────────────────────
function readLineFile(filePath) {
  const raw = fs.readFileSync(filePath);

  // UTF-16 LE BOM: FF FE
  if (raw[0] === 0xFF && raw[1] === 0xFE) {
    console.log('  ↳ 偵測到編碼：UTF-16 LE');
    return raw.slice(2).toString('utf16le');
  }

  // UTF-8 BOM: EF BB BF
  if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
    console.log('  ↳ 偵測到編碼：UTF-8 BOM');
    return raw.slice(3).toString('utf8');
  }

  console.log('  ↳ 偵測到編碼：UTF-8');
  return raw.toString('utf8');
}

// ──────────────────────────────────────────────
// 核心：解析 LINE txt → 結構化資料（按月分組）
//
// 支援格式：
//   日期行：2025.12.06 星期六  /  2025/12/06（週六）  /  2025/12/06(六)
//   訊息行：22:21 Speaker 訊息內容  （單一空格分隔）
//          22:21\tSpeaker\t訊息內容 （tab 分隔）
//   多行訊息：時間戳之後的空行或非時間行，視為同一則訊息的續行
// ──────────────────────────────────────────────
function parseLineChat(text) {
  // 日期標頭 (同時支援 . 和 / 分隔)
  const DATE_HEADER = /^(\d{4})[.\/](\d{1,2})[.\/](\d{1,2})/;

  // 訊息起始行：HH:MM 後接 tab 或空格，再接發言者，再接分隔後的內容
  // 格式 A (tab)  ：22:21\tSpeaker\t內容
  // 格式 B (空格) ：22:21 Speaker 內容（Speaker 不含空格→取第一個詞）
  const MSG_TAB    = /^(\d{1,2}:\d{2})\t(.+?)\t(.*)$/;
  const MSG_SPACE  = /^(\d{1,2}:\d{2}) (.+?) (.+)$/;
  // 系統訊息（只有時間+說明，沒有第三段內容）—— 如 "22:21 Kevin已加入群組"
  const SYS_MSG    = /^(\d{1,2}:\d{2}) \S+$/;

  const monthlyData = {}; // key: 'YYYY-MM'
  let currentDate = '';
  let currentYM   = '';
  let lastEntry   = null; // 用來累積多行訊息

  const lines = text.split(/\r?\n/);

  const flushEntry = () => {
    if (!lastEntry) return;
    if (!monthlyData[lastEntry.ym]) monthlyData[lastEntry.ym] = [];
    monthlyData[lastEntry.ym].push({
      日期: lastEntry.date,
      時間: lastEntry.time,
      發言者暱稱: lastEntry.speaker,
      訊息內容: lastEntry.content.trim(),
    });
    lastEntry = null;
  };

  for (const raw of lines) {
    const line = raw; // 保留原始縮排，trimEnd 去掉右側空白
    const trimmed = line.trim();

    // 1. 日期標頭
    const dateMatch = trimmed.match(DATE_HEADER);
    if (dateMatch) {
      flushEntry();
      const y = dateMatch[1];
      const m = dateMatch[2].padStart(2, '0');
      const d = dateMatch[3].padStart(2, '0');
      currentDate = `${y}-${m}-${d}`;
      currentYM   = `${y}-${m}`;
      continue;
    }

    if (!currentDate) continue; // 尚未讀到日期

    // 2. 訊息起始行？
    const matchTab   = trimmed.match(MSG_TAB);
    const matchSpace = (!matchTab) ? trimmed.match(MSG_SPACE) : null;
    const msgMatch   = matchTab || matchSpace;

    if (msgMatch) {
      flushEntry(); // 先存前一則

      const time    = msgMatch[1];
      const speaker = msgMatch[2].trim();
      const content = msgMatch[3].trim();

      // 機器人黑名單
      const isBot = BOT_NAMES.some(n =>
        speaker.toLowerCase().includes(n.toLowerCase())
      );
      if (isBot) continue;

      // 系統訊息：有時間但只有兩段（無內容欄位）
      if (!content && SYS_MSG.test(trimmed)) continue;

      lastEntry = { ym: currentYM, date: currentDate, time, speaker, content };
      continue;
    }

    // 3. 非訊息起始行 → 可能是多行訊息的續行
    if (lastEntry) {
      // 空行或內容行都累加（保留換行）
      lastEntry.content += '\n' + trimmed;
    }
    // 若 lastEntry 為 null 且非訊息行 → 系統訊息，略過
  }

  flushEntry(); // 最後一則
  return monthlyData;
}

// ──────────────────────────────────────────────
// 匯出：將每月資料寫入 xlsx
// ──────────────────────────────────────────────
function exportMonthly(monthlyData, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const months = Object.keys(monthlyData).sort();

  if (months.length === 0) {
    console.log('⚠️  未找到任何有效對話紀錄，請確認檔案格式是否正確。');
    return;
  }

  for (const ym of months) {
    const rows = monthlyData[ym];
    console.log(`\n📅 正在處理月份：${ym}...`);
    console.log(`   ➜ 該月共匯出 ${rows.length} 筆對話紀錄`);

    // 建立工作表
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ['日期', '時間', '發言者暱稱', '訊息內容'],
    });

    // 自動調整欄寬
    ws['!cols'] = [
      { wch: 12 },  // 日期
      { wch: 8  },  // 時間
      { wch: 20 },  // 發言者暱稱
      { wch: 60 },  // 訊息內容
    ];

    const wb       = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ym);

    const outFile  = path.join(outputDir, `${ym}_LINE對話.xlsx`);
    XLSX.writeFile(wb, outFile, { bookType: 'xlsx', type: 'binary' });
    console.log(`   ✅ 已輸出：${outFile}`);
  }
}

// ──────────────────────────────────────────────
// 主程式入口
// ──────────────────────────────────────────────
function main() {
  const outputDir = path.join(__dirname, 'output');

  // 從命令列參數取得指定檔案，或自動掃描當前目錄所有 .txt
  let txtFiles = [];

  if (process.argv[2]) {
    // 指定檔案
    const specified = path.resolve(process.argv[2]);
    if (!fs.existsSync(specified)) {
      console.error(`❌ 找不到檔案：${specified}`);
      process.exit(1);
    }
    txtFiles = [specified];
  } else {
    // 自動掃描
    txtFiles = fs.readdirSync(__dirname)
      .filter(f => f.toLowerCase().endsWith('.txt'))
      .map(f => path.join(__dirname, f));

    if (txtFiles.length === 0) {
      console.error('❌ 當前目錄找不到任何 .txt 檔案，請將 LINE 匯出的 txt 放在此資料夾中。');
      process.exit(1);
    }
  }

  console.log('='.repeat(55));
  console.log(' LINE 聊天紀錄解析工具');
  console.log('='.repeat(55));

  for (const filePath of txtFiles) {
    console.log(`\n📂 讀取檔案：${path.basename(filePath)}`);
    const text        = readLineFile(filePath);
    const monthlyData = parseLineChat(text);
    exportMonthly(monthlyData, outputDir);
  }

  console.log('\n' + '='.repeat(55));
  console.log(' 全部處理完成！輸出目錄：' + outputDir);
  console.log('='.repeat(55));
}

main();
