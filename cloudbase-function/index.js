'use strict';

const { createHandler } = require('./handler');

const TABLE_NAME = 'food_choices';
let database;

function getDatabase() {
  if (!database) {
    const tcb = require('@cloudbase/node-sdk');
    // In an ordinary CloudBase function, node-sdk 3.x resolves the current
    // function environment and its injected server credentials when env is
    // omitted. This keeps PostgreSQL writes on the server-side service role.
    const app = tcb.init({});
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
