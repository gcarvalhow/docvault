// src/utils/audit.js
const { v4: uuid } = require('uuid');
const db = require('../db/database');

function log({ userId = null, userEmail = null, action, targetType = null, targetId = null, detail = null, ip = null }) {
  try {
    db.run(
      `INSERT INTO audit_logs (id, user_id, user_email, action, target_type, target_id, detail, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), userId, userEmail, action, targetType, targetId, detail, ip]
    );
  } catch (err) {
    console.error('[AUDIT ERROR]', err.message);
  }
}

module.exports = { log };
