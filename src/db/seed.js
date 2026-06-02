// src/db/seed.js
require('dotenv').config();
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { initDb } = require('./database');
const db = require('./database');

async function seed() {
  await initDb();
  console.log('🌱 Seed iniciado...');

  const COST = 12;
  const users = [
    { name: 'Admin Sistema',         email: 'admin@docvault.dev',           password: 'Admin@2026!',    role: 'admin' },
    { name: 'Ana Oliveira',          email: 'ana.analista@docvault.dev',    password: 'Analista@2026!', role: 'analista' },
    { name: 'Bruno Analista',        email: 'bruno.analista@docvault.dev',  password: 'Analista@2026!', role: 'analista' },
    { name: 'Carlos Solicitante',    email: 'carlos@docvault.dev',          password: 'Carlos@2026!',   role: 'solicitante' },
    { name: 'Diana Souza',           email: 'diana@docvault.dev',           password: 'Diana@2026!',    role: 'solicitante' },
    { name: 'Eduardo Lima',          email: 'eduardo@docvault.dev',         password: 'Eduardo@2026!',  role: 'solicitante' },
  ];

  for (const u of users) {
    const existing = db.get('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing) { console.log(`  ⏭  já existe: ${u.email}`); continue; }
    const id   = uuid();
    const hash = bcrypt.hashSync(u.password, COST);
    db.run('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, u.name, u.email, hash, u.role]);
    console.log(`  ✓ ${u.role.padEnd(12)} ${u.email}`);
  }

  const adminId  = db.get('SELECT id FROM users WHERE email = ?', ['admin@docvault.dev'])?.id;
  const anaId    = db.get('SELECT id FROM users WHERE email = ?', ['ana.analista@docvault.dev'])?.id;
  const carlosId = db.get('SELECT id FROM users WHERE email = ?', ['carlos@docvault.dev'])?.id;
  const dianaId  = db.get('SELECT id FROM users WHERE email = ?', ['diana@docvault.dev'])?.id;
  const eduId    = db.get('SELECT id FROM users WHERE email = ?', ['eduardo@docvault.dev'])?.id;

  const docs = [
    { title: 'Contrato de Prestação de Serviços — Fictício', category: 'contrato',   status: 'aprovado',    owner_id: carlosId, analyst_id: anaId,  comment: 'Aprovado sem pendências.' },
    { title: 'Relatório Trimestral Q1 2026',                category: 'relatorio',  status: 'em_analise',  owner_id: dianaId,  analyst_id: anaId,  comment: null },
    { title: 'Termo de Confidencialidade — Colaborador X',  category: 'termo',      status: 'pendente',    owner_id: eduId,    analyst_id: null,   comment: null },
    { title: 'Proposta Comercial — Cliente Fictício ABC',   category: 'proposta',   status: 'rejeitado',   owner_id: carlosId, analyst_id: anaId,  comment: 'Valores fora da tabela. Revisar.' },
    { title: 'Declaração de Conformidade LGPD',            category: 'declaracao', status: 'pendente',    owner_id: dianaId,  analyst_id: null,   comment: null },
  ];

  for (const d of docs) {
    const id = uuid();
    db.run(
      `INSERT INTO documents (id, title, description, category, status, owner_id, analyst_id, file_name, file_mime, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, d.title, '', d.category, d.status, d.owner_id, d.analyst_id || null,
       `${id}.pdf`, 'application/pdf', d.comment || null]
    );
    console.log(`  ✓ doc [${d.status.padEnd(10)}] ${d.title}`);
  }

  db.run(
    `INSERT INTO audit_logs (id, user_id, user_email, action, target_type, detail, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), adminId, 'admin@docvault.dev', 'SEED_EXECUTED', 'system', 'Banco populado via seed.js', '127.0.0.1']
  );

  console.log('\n✅ Seed concluído!');
  console.log('Credenciais:');
  console.log('  admin@docvault.dev         → Admin@2026!    (admin)');
  console.log('  ana.analista@docvault.dev  → Analista@2026! (analista)');
  console.log('  carlos@docvault.dev        → Carlos@2026!   (solicitante)');
}

seed().catch(e => { console.error(e); process.exit(1); });
