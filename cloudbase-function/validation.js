'use strict';

const ALLOWED_FOODS = Object.freeze({
  hotpot: '火锅',
  bbq: '烤肉',
  sushi: '日料',
  malatang: '麻辣烫',
  shaokao: '烧烤',
  pizza: '披萨',
  noodles: '面 / 粉',
  'fried-chicken': '炸鸡',
  'home-cooking': '家常菜',
  burger: '汉堡',
  dessert: '甜品',
  'milk-tea': '奶茶',
});

const RECORD_FIELDS = Object.freeze([
  'food_id',
  'food',
  'nickname',
  'visitor_id',
  'request_id',
  'client_time',
  'source',
  'page_version',
]);

class RequestError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'RequestError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function fail(message) {
  throw new RequestError(400, 'INVALID_REQUEST', message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateRecord(value) {
  if (!isPlainObject(value)) fail('记录格式无效');

  const keys = Object.keys(value);
  if (
    keys.length !== RECORD_FIELDS.length ||
    RECORD_FIELDS.some(field => !Object.prototype.hasOwnProperty.call(value, field)) ||
    keys.some(key => !RECORD_FIELDS.includes(key))
  ) {
    fail('记录字段无效');
  }

  if (
    typeof value.food_id !== 'string' ||
    typeof value.food !== 'string' ||
    !Object.prototype.hasOwnProperty.call(ALLOWED_FOODS, value.food_id) ||
    ALLOWED_FOODS[value.food_id] !== value.food
  ) {
    fail('美食选项无效');
  }

  if (
    typeof value.nickname !== 'string' ||
    Array.from(value.nickname).length > 20 ||
    value.nickname !== value.nickname.trim() ||
    /[\u0000-\u001f\u007f]/.test(value.nickname)
  ) {
    fail('昵称无效');
  }

  if (typeof value.visitor_id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(value.visitor_id)) {
    fail('访客编号无效');
  }

  if (typeof value.request_id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(value.request_id)) {
    fail('请求编号无效');
  }

  if (
    typeof value.client_time !== 'string' ||
    value.client_time.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.client_time)
  ) {
    fail('客户端时间无效');
  }

  try {
    if (new Date(value.client_time).toISOString() !== value.client_time) {
      fail('客户端时间无效');
    }
  } catch {
    fail('客户端时间无效');
  }

  if (value.source !== 'github-pages' || value.page_version !== '2.0') {
    fail('记录来源无效');
  }

  return {
    food_id: value.food_id,
    food: value.food,
    nickname: value.nickname,
    visitor_id: value.visitor_id,
    request_id: value.request_id,
    client_time: value.client_time,
    source: value.source,
    page_version: value.page_version,
  };
}

module.exports = {
  ALLOWED_FOODS,
  RECORD_FIELDS,
  RequestError,
  validateRecord,
};
