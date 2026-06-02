// src/middleware/auth.js
// Verifica JWT e aplica controle de acesso por perfil (RBAC)

const jwt = require('jsonwebtoken');
const audit = require('../utils/audit');

/**
 * Extrai e valida o token JWT do cookie ou header Authorization.
 * Anexa req.user = { id, name, email, role } em caso de sucesso.
 */
function authenticate(req, res, next) {
  const token =
    req.cookies?.token ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    audit.log({
      action: 'ACCESS_DENIED',
      targetType: 'session',
      detail: `Requisição sem token: ${req.method} ${req.path}`,
      ip: req.ip,
    });
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email, role }
    next();
  } catch (err) {
    audit.log({
      action: 'ACCESS_DENIED',
      targetType: 'session',
      detail: `Token inválido ou expirado: ${err.message}`,
      ip: req.ip,
    });
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

/**
 * Fábrica de middleware de autorização por perfil.
 * Uso: authorize('admin') ou authorize('admin', 'analista')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      audit.log({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'ACCESS_DENIED',
        targetType: 'route',
        detail: `Perfil '${req.user?.role}' tentou acessar rota restrita a [${roles.join(', ')}]: ${req.method} ${req.path}`,
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
