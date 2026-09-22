'use strict';

const { createHandler } = require('./handler');

const TABLE_NAME = 'food_choices';
let database;

function getDatabase() {
  if (!database) {
    const cloudbase = require('@cloudbase/js-sdk');
    const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
    database = app.rdb();
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
