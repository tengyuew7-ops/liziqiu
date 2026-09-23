'use strict';

const { RequestError, validateRecord } = require('./validation');

const ALLOWED_ORIGIN = 'https://tengyuew7-ops.github.io';
const MAX_BODY_BYTES = 4096;
const MAX_BASE64_BODY_BYTES = 8192;

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
});

function headerValue(headers, name) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return undefined;

  const matches = Object.entries(headers)
    .filter(([key]) => key.toLowerCase() === name.toLowerCase())
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));

  if (matches.length !== 1 || typeof matches[0] !== 'string') return undefined;
  return matches[0];
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function response(statusCode, payload, includeCors = false, extraHeaders = {}) {
  const headers = {
    ...JSON_HEADERS,
    ...(includeCors ? corsHeaders() : {}),
    ...extraHeaders,
  };

  return {
    statusCode,
    headers,
    body: payload === undefined ? '' : JSON.stringify(payload),
    isBase64Encoded: false,
  };
}

function requestError(statusCode, code, message) {
  return new RequestError(statusCode, code, message);
}

function decodeBody(event) {
  if (typeof event.body !== 'string') {
    throw requestError(400, 'INVALID_REQUEST', '请求体必须是 JSON');
  }

  if (!event.isBase64Encoded) {
    if (Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
      throw requestError(413, 'PAYLOAD_TOO_LARGE', '请求体过大');
    }
    return event.body;
  }

  if (Buffer.byteLength(event.body, 'ascii') > MAX_BASE64_BODY_BYTES) {
    throw requestError(413, 'PAYLOAD_TOO_LARGE', '请求体过大');
  }

  const normalized = event.body.replace(/\s/g, '');
  if (
    normalized.length === 0 ||
    normalized.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)
  ) {
    throw requestError(400, 'INVALID_REQUEST', '请求体编码无效');
  }

  const decoded = Buffer.from(normalized, 'base64');
  if (decoded.length > MAX_BODY_BYTES) {
    throw requestError(413, 'PAYLOAD_TOO_LARGE', '请求体过大');
  }
  return decoded.toString('utf8');
}

function parseRecord(event) {
  const contentType = headerValue(event.headers, 'content-type');
  if (!contentType || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw requestError(415, 'UNSUPPORTED_MEDIA_TYPE', '请使用 application/json');
  }

  const body = decodeBody(event);
  let value;
  try {
    value = JSON.parse(body);
  } catch {
    throw requestError(400, 'INVALID_REQUEST', 'JSON 格式无效');
  }
  return validateRecord(value);
}

function normalizeMethod(event) {
  if (typeof event.httpMethod === 'string') return event.httpMethod.toUpperCase();
  if (typeof event.requestContext?.http?.method === 'string') {
    return event.requestContext.http.method.toUpperCase();
  }
  return '';
}

function createHandler({ insertChoice, logger = console } = {}) {
  if (typeof insertChoice !== 'function') {
    throw new TypeError('insertChoice must be a function');
  }

  return async function handle(event = {}) {
    const method = normalizeMethod(event);
    const origin = headerValue(event.headers, 'origin');
    const originAllowed = origin === ALLOWED_ORIGIN;

    if (method === 'GET') {
      if (origin && !originAllowed) {
        return response(403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
      }
      return response(200, { ok: true, service: 'liziqiu-food-choice' }, originAllowed);
    }

    if (method === 'OPTIONS') {
      if (!originAllowed) {
        return response(403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
      }

      const requestedMethod = headerValue(event.headers, 'access-control-request-method');
      if (requestedMethod?.toUpperCase() !== 'POST') {
        return response(405, { ok: false, code: 'METHOD_NOT_ALLOWED' }, true, {
          Allow: 'POST, OPTIONS',
        });
      }
      return response(204, undefined, true);
    }

    if (method !== 'POST') {
      return response(405, { ok: false, code: 'METHOD_NOT_ALLOWED' }, originAllowed, {
        Allow: 'GET, POST, OPTIONS',
      });
    }

    if (!originAllowed) {
      return response(403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
    }

    let record;
    try {
      record = parseRecord(event);
    } catch (error) {
      if (error instanceof RequestError) {
        return response(
          error.statusCode,
          { ok: false, code: error.code, message: error.message },
          true,
        );
      }
      return response(400, { ok: false, code: 'INVALID_REQUEST' }, true);
    }

    try {
      await insertChoice(record);
      return response(201, { ok: true, requestId: record.request_id }, true);
    } catch (error) {
      logger.error('food choice insert failed', {
        requestId: record.request_id,
        code: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      });
      return response(503, { ok: false, code: 'STORAGE_UNAVAILABLE' }, true);
    }
  };
}

module.exports = {
  ALLOWED_ORIGIN,
  MAX_BODY_BYTES,
  createHandler,
  decodeBody,
  headerValue,
  normalizeMethod,
  parseRecord,
  response,
};
