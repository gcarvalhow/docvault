// src/routes/documents.js
const express = require('express');
const { v4: uuid } = require('uuid');
const db    = require('../db/database');
const audit = require('../utils/audit');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const VALID_CATEGORIES = ['contrato', 'relatorio', 'termo', 'proposta', 'declaracao', 'outro'];
// Transições permitidas por papel: analista não pode repor status para 'pendente'
const ANALYST_STATUSES = ['em_analise', 'aprovado', 'rejeitado'];
const ADMIN_STATUSES   = ['pendente', 'em_analise', 'aprovado', 'rejeitado'];

function validateDoc(body) {
  const { title, category } = body;
  if (!title || typeof title !== 'string' || title.trim().length < 3) return 'Título obrigatório (mín. 3 chars).';
  if (!VALID_CATEGORIES.includes(category)) return `Categoria inválida. Aceitas: ${VALID_CATEGORIES.join(', ')}.`;
  return null;
}

// GET /api/documents
router.get('/', (req, res) => {
  let docs;
  const base = `SELECT d.*, u.name as owner_name, a.name as analyst_name
                FROM documents d
                JOIN users u ON d.owner_id = u.id
                LEFT JOIN users a ON d.analyst_id = a.id`;
  if (req.user.role === 'admin') {
    docs = db.all(base + ' ORDER BY d.created_at DESC');
  } else if (req.user.role === 'analista') {
    docs = db.all(base + ` WHERE d.analyst_id = ? OR d.status = 'pendente' ORDER BY d.created_at DESC`, [req.user.id]);
  } else {
    docs = db.all(base + ' WHERE d.owner_id = ? ORDER BY d.created_at DESC', [req.user.id]);
  }
  return res.json(docs);
});

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const doc = db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Não encontrado.' });
  if (req.user.role === 'solicitante' && doc.owner_id !== req.user.id) {
    audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'ACCESS_DENIED',
      targetType: 'document', targetId: doc.id, detail: 'Acesso a doc de outro usuário', ip: req.ip });
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  return res.json(doc);
});

// POST /api/documents
router.post('/', (req, res) => {
  const err = validateDoc(req.body);
  if (err) return res.status(400).json({ error: err });
  const { title, description = '', category } = req.body;
  const id = uuid();
  db.run(
    `INSERT INTO documents (id, title, description, category, status, owner_id, file_name, file_mime)
     VALUES (?, ?, ?, ?, 'pendente', ?, ?, ?)`,
    [id, title.trim(), description.trim(), category, req.user.id, `${id}.pdf`, 'application/pdf']
  );
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'DOC_CREATED',
    targetType: 'document', targetId: id, detail: `"${title.trim()}" (${category})`, ip: req.ip });
  return res.status(201).json({ id, message: 'Documento criado.' });
});

// PATCH /api/documents/:id/status
router.patch('/:id/status', authorize('analista', 'admin'), (req, res) => {
  const doc = db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Não encontrado.' });
  const { status, comment = '' } = req.body;
  const allowed = req.user.role === 'admin' ? ADMIN_STATUSES : ANALYST_STATUSES;
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido para este perfil.' });
  db.run(
    `UPDATE documents SET status = ?, analyst_id = ?, comment = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, req.user.id, comment.trim(), doc.id]
  );
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'DOC_STATUS_CHANGED',
    targetType: 'document', targetId: doc.id,
    detail: `${doc.status} → ${status}. Comentário: ${comment || '—'}`, ip: req.ip });
  return res.json({ message: `Status: ${status}` });
});

// PUT /api/documents/:id
router.put('/:id', (req, res) => {
  const doc = db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Não encontrado.' });
  if (doc.owner_id !== req.user.id && req.user.role !== 'admin') {
    audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'ACCESS_DENIED',
      targetType: 'document', targetId: doc.id, detail: 'Edição de doc de outro usuário', ip: req.ip });
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  if (doc.status !== 'pendente') return res.status(409).json({ error: 'Documento não pode ser editado neste status.' });
  const err = validateDoc(req.body);
  if (err) return res.status(400).json({ error: err });
  const { title, description = '', category } = req.body;
  db.run(
    `UPDATE documents SET title = ?, description = ?, category = ?, updated_at = datetime('now') WHERE id = ?`,
    [title.trim(), description.trim(), category, doc.id]
  );
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'DOC_EDITED',
    targetType: 'document', targetId: doc.id, detail: `Editado: "${title.trim()}"`, ip: req.ip });
  return res.json({ message: 'Atualizado.' });
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const doc = db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Não encontrado.' });
  if (req.user.role === 'solicitante') {
    if (doc.owner_id !== req.user.id) {
      audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'ACCESS_DENIED',
        targetType: 'document', targetId: doc.id, detail: 'Delete de doc de outro usuário', ip: req.ip });
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    if (doc.status !== 'pendente') return res.status(409).json({ error: 'Só pendentes podem ser excluídos.' });
  }
  db.run('DELETE FROM documents WHERE id = ?', [doc.id]);
  audit.log({ userId: req.user.id, userEmail: req.user.email, action: 'DOC_DELETED',
    targetType: 'document', targetId: doc.id, detail: `"${doc.title}"`, ip: req.ip });
  return res.json({ message: 'Excluído.' });
});

module.exports = router;
