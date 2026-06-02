// src/routes/auth.js
const express      = require('express');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const rateLimit    = require('express-rate-limit');
const db           = require('../db/database');
const audit        = require('../utils/audit');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = db.get('SELECT * FROM users WHERE email = ? AND active = 1', [email.trim().toLowerCase()]);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    audit.log({ userEmail: email, action: 'LOGIN_FAILED', targetType: 'session',
      detail: `Tentativa falhou: ${email}`, ip: req.ip });
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });

  audit.log({ userId: user.id, userEmail: user.email, action: 'LOGIN_SUCCESS',
    targetType: 'session', detail: `Perfil: ${user.role}`, ip: req.ip });

  return res.json({ user: payload });
});

router.post('/logout', authenticate, (req, res) => {
  audit.log({ userId: req.user.id, userEmail: req.user.email,
    action: 'LOGOUT', targetType: 'session', ip: req.ip });
  res.clearCookie('token');
  return res.json({ message: 'Logout realizado.' });
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
