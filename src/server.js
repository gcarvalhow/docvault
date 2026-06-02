// src/server.js
require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET não definida ou fraca (mín. 32 chars). Configure o arquivo .env.');
  process.exit(1);
}

const { initDb } = require('./db/database');
const express      = require('express');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const path         = require('path');

async function start() {
  await initDb();

  const app  = express();
  const PORT = process.env.PORT || 3000;

  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/auth',      require('./routes/auth'));
  app.use('/api/documents', require('./routes/documents'));
  app.use('/api/admin',     require('./routes/admin'));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Rota não encontrada.' });
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // Handler global de erros não tratados
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  app.listen(PORT, () => {
    console.log(`\n🔒 DocVault em http://localhost:${PORT}`);
    console.log('   Execute "npm run seed" para dados fictícios.\n');
  });
}

start().catch(err => { console.error(err); process.exit(1); });
