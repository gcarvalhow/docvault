// src/routes/admin.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db    = require('../db/database');
const audit = require('../utils/audit');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/users', (req, res) => {
  const users = db.all('SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC');
  return res.json(users);
});

router.post('/users', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Campos obrigatórios.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  if (!['solicitante', 'analista', 'admin'].includes(role)) return res.status(400).json({ error: 'Role inválido.' });
  if (password.length < 8) return res.status(400).json({ error: 'Senha mín. 8 chars.' });
  const id   = uuid();
  const hash = bcrypt.hashSync(password, 12);
  try {
    db.run('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), email.trim().toLowerCase(), hash, role]);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'E-mail já cadastrado.' });
    throw e;
  }
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'USER_CREATED',
    targetType: 'user', targetId: id, detail: `${email} (${role})`, ip: req.ip });
  return res.status(201).json({ id, message: 'Usuário criado.' });
});

router.patch('/users/:id/toggle', (req, res) => {
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Não encontrado.' });
  if (user.id === req.user.id) return res.status(409).json({ error: 'Não é possível desativar o próprio usuário.' });
  const newActive = user.active ? 0 : 1;
  db.run('UPDATE users SET active = ? WHERE id = ?', [newActive, user.id]);
  audit.log({ userId: req.user.id, userEmail: req.user.email,
    action: newActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    targetType: 'user', targetId: user.id,
    detail: `${user.email} ${newActive ? 'ativado' : 'desativado'}`, ip: req.ip });
  return res.json({ message: `Usuário ${newActive ? 'ativado' : 'desativado'}.` });
});

router.get('/logs', (req, res) => {
  const { limit = 100, offset = 0, action, user_email } = req.query;
  const safeLimit  = Math.min(Math.max(Number(limit)  || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  if (action)     { sql += ' AND action = ?';        params.push(action); }
  if (user_email) { sql += ' AND user_email LIKE ?'; params.push(`%${user_email}%`); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);
  const logs = db.all(sql, params);
  return res.json(logs);
});

module.exports = router;
