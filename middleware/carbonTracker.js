const { co2 } = require('@tgwf/co2');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const model = new co2({ model: 'swd' });

function createCarbonTracker(directory = path.join(__dirname, '../carbon-reports')) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${Date.now()}-${randomUUID()}.jsonl`);
  console.log(`[carbon] Report file: ${file}`);
  return (req, res, next) => {
    // Content-Length is a declared payload size, not total wire traffic.
    const length = Number(req.headers['content-length'] || 0);
    const requestBodyBytes = Number.isSafeInteger(length) && length >= 0 ? length : 0;
    const unknownRequestSize = !req.headers['content-length'] && !!req.headers['transfer-encoding'];
    let responseBodyBytes = 0;
    const size = (chunk, encoding) => {
      if (typeof chunk === 'string') return Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : 'utf8');
      return Buffer.isBuffer(chunk) || chunk instanceof Uint8Array ? chunk.byteLength : 0;
    };
    const write = res.write;
    const end = res.end;
    res.write = function (chunk, encoding, ...args) {
      responseBodyBytes += size(chunk, encoding);
      return write.call(this, chunk, encoding, ...args);
    };
    res.end = function (chunk, encoding, ...args) {
      responseBodyBytes += size(chunk, encoding);
      return end.call(this, chunk, encoding, ...args);
    };
    res.once('finish', () => {
      const totalBytes = requestBodyBytes + responseBodyBytes;
      const record = {
        time: new Date().toISOString(), method: req.method,
        // Route templates avoid logging IDs, query strings, cookies or personal data.
        route: req.route?.path || 'unmatched', status: res.statusCode,
        requestBodyBytes, responseBodyBytes, unknownRequestSize, totalBytes,
        estimatedGCO2: model.perByte(totalBytes, false),
        model: 'swd', co2js: '0.16.9', greenHost: false,
      };
      fs.appendFile(file, JSON.stringify(record) + '\n', error => {
        if (error) console.error('[carbon] Could not write measurement.');
      });
    });
    next();
  };
}
module.exports = { createCarbonTracker };
