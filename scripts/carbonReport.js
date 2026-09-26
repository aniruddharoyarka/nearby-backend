const fs = require('fs');
const path = require('path');
const directory = path.join(__dirname, '../carbon-reports');
const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(f => f.endsWith('.jsonl')).sort() : [];
const selected = process.argv[2] || (files.length ? path.join(directory, files.at(-1)) : null);
if (!selected) { console.error('No measurements yet. Set CARBON_TRACKING=true, restart backend and use the website.'); process.exit(1); }
const rows = fs.readFileSync(selected, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const sum = key => rows.reduce((total, row) => total + row[key], 0);
console.log(JSON.stringify({ report: selected, requests: rows.length, firstRequest: rows[0]?.time, lastRequest: rows.at(-1)?.time,
  requestBodyBytes: sum('requestBodyBytes'), responseBodyBytes: sum('responseBodyBytes'), totalBytes: sum('totalBytes'),
  estimatedGCO2: sum('estimatedGCO2'), requestsWithUnknownBodySize: rows.filter(r => r.unknownRequestSize).length,
  model: 'swd', co2js: '0.16.9', greenHost: false,
  scope: 'API payload estimate only. Excludes headers, TLS, MongoDB and outbound service traffic. Do not add to frontend estimate.'
}, null, 2));
