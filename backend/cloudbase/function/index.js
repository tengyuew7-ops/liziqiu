'use strict';

const { createHandler } = require('./handler');

const TABLE_NAME = 'food_choices';
const ENV_ID = 'lzq0914-d7gfrsujmf7f25a7b';
const SCHEMA_NAME = 'public';
const API_KEY_ENV = 'CLOUDBASE_APIKEY';

function requireApiKey() {
  const accessKey = process.env[API_KEY_ENV];
  if (
    typeof accessKey !== 'string' ||
    accessKey.length === 0 ||
    accessKey.trim() !== accessKey
  ) {
    throw new Error(`Missing or invalid required environment variable: ${API_KEY_ENV}`);
  }
  return accessKey;
}

// Validate the server-only credential during cold start. This makes a missing
// or malformed deployment setting fail before the function accepts traffic.
const accessKey = requireApiKey();
let database;

function initializeDatabase(tcb) {
  const app = tcb.init({ env: ENV_ID, accessKey });
  return app.rdb({ database: SCHEMA_NAME });
}

function getDatabase() {
  if (!database) {
    const tcb = require('@cloudbase/node-sdk');
    database = initializeDatabase(tcb);
  }
  return database;
}

async function insertChoice(record) {
  const result = await getDatabase().from(TABLE_NAME).insert(record);
  if (result?.error) {
    const error = new Error('Database insert failed');
    if (typeof result.error.code === 'string') error.code = result.error.code;
    throw error;
  }
}

const handler = createHandler({ insertChoice });

exports.main = async function main(event, context) {
  return handler(event, context);
};
