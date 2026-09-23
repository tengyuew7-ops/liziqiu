'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  ALLOWED_ORIGIN,
  MAX_BODY_BYTES,
  createHandler,
} = require('../handler');
const { ALLOWED_FOODS, validateRecord } = require('../validation');

const previousApiKey = process.env.CLOUDBASE_APIKEY;
process.env.CLOUDBASE_APIKEY = 'unit-test-service-role-key';
const functionEntry = require('../index');
if (previousApiKey === undefined) {
  delete process.env.CLOUDBASE_APIKEY;
} else {
  process.env.CLOUDBASE_APIKEY = previousApiKey;
}

function validRecord(overrides = {}) {
  return {
    food_id: 'hotpot',
    food: '火锅',
    nickname: '栗子',
    visitor_id: 'visitor-123',
    request_id: 'request-123',
    client_time: '2026-09-22T13:13:33.000Z',
    source: 'github-pages',
    page_version: '2.0',
    ...overrides,
  };
}

function eventFor(record = validRecord(), overrides = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      origin: ALLOWED_ORIGIN,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(record),
    ...overrides,
  };
}

function readBody(result) {
  return result.body ? JSON.parse(result.body) : undefined;
}

describe('validateRecord', () => {
  it('accepts every supported food pair', () => {
    for (const [food_id, food] of Object.entries(ALLOWED_FOODS)) {
      assert.deepEqual(validateRecord(validRecord({ food_id, food })), validRecord({ food_id, food }));
    }
  });

  it('rejects missing, extra, and mismatched fields', () => {
    const missing = validRecord();
    delete missing.food;
    assert.throws(() => validateRecord(missing), /记录字段无效/);
    assert.throws(() => validateRecord({ ...validRecord(), extra: true }), /记录字段无效/);
    assert.throws(() => validateRecord(validRecord({ food: '奶茶' })), /美食选项无效/);
  });

  it('rejects invalid nickname, identifiers, time, and source metadata', () => {
    assert.throws(() => validateRecord(validRecord({ nickname: ' 栗子' })), /昵称无效/);
    assert.throws(() => validateRecord(validRecord({ nickname: 'x'.repeat(21) })), /昵称无效/);
    assert.throws(() => validateRecord(validRecord({ visitor_id: 'UPPER' })), /访客编号无效/);
    assert.throws(() => validateRecord(validRecord({ request_id: '../bad' })), /请求编号无效/);
    assert.throws(() => validateRecord(validRecord({ client_time: '2026-02-30T00:00:00.000Z' })), /客户端时间无效/);
    assert.throws(() => validateRecord(validRecord({ source: 'other' })), /记录来源无效/);
    assert.throws(() => validateRecord(validRecord({ page_version: '3.0' })), /记录来源无效/);
  });
});

describe('HTTP gateway handler', () => {
  it('exports the CloudBase index.main entry point', async () => {
    assert.equal(typeof functionEntry.main, 'function');
    const result = await functionEntry.main({ httpMethod: 'GET', headers: {} }, {});
    assert.equal(result.statusCode, 200);
  });

  it('returns a health response without invoking storage', async () => {
    let calls = 0;
    const handler = createHandler({ insertChoice: async () => { calls += 1; } });
    const result = await handler({ httpMethod: 'GET', headers: {} });
    assert.equal(result.statusCode, 200);
    assert.equal(readBody(result).service, 'liziqiu-food-choice');
    assert.equal(calls, 0);
  });

  it('answers a valid CORS preflight for the exact GitHub Pages origin', async () => {
    const handler = createHandler({ insertChoice: async () => {} });
    const result = await handler({
      httpMethod: 'OPTIONS',
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.equal(result.statusCode, 204);
    assert.equal(result.headers['Access-Control-Allow-Origin'], ALLOWED_ORIGIN);
    assert.equal(result.body, '');
  });

  it('rejects incomplete or non-POST preflights', async () => {
    const handler = createHandler({ insertChoice: async () => {} });
    const missingMethod = await handler({
      httpMethod: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN },
    });
    const wrongMethod = await handler({
      httpMethod: 'OPTIONS',
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Method': 'DELETE',
      },
    });
    assert.equal(missingMethod.statusCode, 405);
    assert.equal(wrongMethod.statusCode, 405);
  });

  it('rejects a different or missing origin before parsing or writing', async () => {
    let calls = 0;
    const handler = createHandler({ insertChoice: async () => { calls += 1; } });
    const wrong = await handler(eventFor(undefined, {
      headers: { origin: 'https://example.com', 'content-type': 'application/json' },
    }));
    const missing = await handler(eventFor(undefined, {
      headers: { 'content-type': 'application/json' },
    }));
    assert.equal(wrong.statusCode, 403);
    assert.equal(missing.statusCode, 403);
    assert.equal(wrong.headers['Access-Control-Allow-Origin'], undefined);
    assert.equal(calls, 0);
  });

  it('rejects unsupported methods and content types', async () => {
    const handler = createHandler({ insertChoice: async () => {} });
    const method = await handler({
      httpMethod: 'DELETE',
      headers: { origin: ALLOWED_ORIGIN },
    });
    const type = await handler(eventFor(undefined, {
      headers: { origin: ALLOWED_ORIGIN, 'content-type': 'text/plain' },
    }));
    assert.equal(method.statusCode, 405);
    assert.equal(type.statusCode, 415);
  });

  it('rejects invalid JSON and oversized request bodies', async () => {
    const handler = createHandler({ insertChoice: async () => {} });
    const invalid = await handler(eventFor(undefined, { body: '{' }));
    const oversized = await handler(eventFor(undefined, { body: 'x'.repeat(MAX_BODY_BYTES + 1) }));
    assert.equal(invalid.statusCode, 400);
    assert.equal(oversized.statusCode, 413);
  });

  it('decodes a base64 JSON body and writes only the validated record', async () => {
    const written = [];
    const handler = createHandler({ insertChoice: async record => written.push(record) });
    const record = validRecord({ food_id: 'dessert', food: '甜品' });
    const result = await handler(eventFor(undefined, {
      body: Buffer.from(JSON.stringify(record), 'utf8').toString('base64'),
      isBase64Encoded: true,
    }));
    assert.equal(result.statusCode, 201);
    assert.deepEqual(written, [record]);
    assert.deepEqual(readBody(result), { ok: true, requestId: record.request_id });
  });

  it('returns a generic storage error without exposing internal details', async () => {
    const logs = [];
    const handler = createHandler({
      insertChoice: async () => {
        const error = new Error('secret database hostname and SQL details');
        error.code = 'DB_PRIVATE_CODE';
        throw error;
      },
      logger: { error: (...args) => logs.push(args) },
    });
    const result = await handler(eventFor());
    assert.equal(result.statusCode, 503);
    assert.deepEqual(readBody(result), { ok: false, code: 'STORAGE_UNAVAILABLE' });
    assert.doesNotMatch(result.body, /secret|hostname|SQL|DB_PRIVATE_CODE/i);
    assert.equal(logs.length, 1);
  });
});

describe('CloudBase server credential', () => {
  function coldStartWith(apiKey) {
    const env = { ...process.env };
    if (apiKey === undefined) {
      delete env.CLOUDBASE_APIKEY;
    } else {
      env.CLOUDBASE_APIKEY = apiKey;
    }
    return spawnSync(process.execPath, ['-e', "require('./index')"], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      env,
    });
  }

  it('aborts module cold start when CLOUDBASE_APIKEY is absent or malformed', () => {
    for (const value of [undefined, '', ' padded-secret ']) {
      const result = coldStartWith(value);
      const output = `${result.stdout}\n${result.stderr}`;

      assert.notEqual(result.status, 0);
      assert.match(output, /CLOUDBASE_APIKEY/);
      if (value) {
        assert.doesNotMatch(output, new RegExp(value.trim()));
      }
    }
  });

  it('passes CLOUDBASE_APIKEY and the target environment explicitly to the SDK', () => {
    const source = readFileSync(path.resolve(__dirname, '..', 'index.js'), 'utf8');

    assert.match(source, /process\.env\[API_KEY_ENV\]/);
    assert.match(source, /const accessKey = requireApiKey\(\);/);
    assert.match(source, /const ENV_ID = 'lzq0914-d7gfrsujmf7f25a7b';/);
    assert.match(source, /const SCHEMA_NAME = 'public';/);
    assert.match(source, /tcb\.init\(\{ env: ENV_ID, accessKey \}\)/);
    assert.match(source, /app\.rdb\(\{ database: SCHEMA_NAME \}\)/);
    assert.doesNotMatch(source, /tcb\.init\(\{ accessKey \}\)/);
    assert.doesNotMatch(source, /return app\.rdb\(\);/);
    assert.doesNotMatch(source, /console\.(?:log|info|warn|error)/);
    assert.deepEqual(Object.keys(functionEntry), ['main']);
  });
});
