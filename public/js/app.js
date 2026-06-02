// public/js/app.js — DocVault SPA

// ─── State ────────────────────────────────────────────────────────────────────
let currentUser = null;

// ─── API helper ───────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// ─── Util ─────────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');

function statusBadge(s) {
  const labels = { pendente: 'Pendente', em_analise: 'Em análise', aprovado: 'Aprovado', rejeitado: 'Rejeitado' };
  return `<span class="badge badge-${s}">${labels[s] || s}</span>`;
}
function roleBadge(r) {
  return `<span class="badge badge-${r}">${r}</span>`;
}
function fmtDate(s) {
  if (!s) return '—';
  return new Date(s + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Page switching ───────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
}

function showPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(panelId)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === panelId);
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, actionsHTML = '') {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHTML + (actionsHTML ? `<div class="modal-actions">${actionsHTML}</div>` : '');
  show($('#modal-overlay'));
}
function closeModal() { hide($('#modal-overlay')); }
$('#modal-close').addEventListener('click', closeModal);
$('#modal-overlay').addEventListener('click', (e) => { if (e.target === $('#modal-overlay')) closeModal(); });

// ─── Auth ─────────────────────────────────────────────────────────────────────
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#login-error');
  hide(errEl);
  try {
    const { user } = await api('POST', '/auth/login', {
      email:    $('#login-email').value.trim(),
      password: $('#login-password').value,
    });
    currentUser = user;
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    show(errEl);
  }
});

$('#btn-logout').addEventListener('click', async () => {
  await api('POST', '/auth/logout').catch(() => {});
  currentUser = null;
  showPage('page-login');
  $('#login-password').value = '';
});

// ─── App bootstrap ────────────────────────────────────────────────────────────
async function boot() {
  try {
    const { user } = await api('GET', '/auth/me');
    currentUser = user;
    initApp();
  } catch {
    showPage('page-login');
  }
}

function initApp() {
  showPage('page-app');
  buildNav();
  $('#user-badge').textContent = `${currentUser.email} · ${currentUser.role}`;
  showPanel('panel-documents');
  loadDocuments();
}

function buildNav() {
  const nav = $('#top-nav');
  nav.innerHTML = '';
  const panels = [
    { id: 'panel-documents', label: 'Documentos', roles: ['solicitante', 'analista', 'admin'] },
    { id: 'panel-users',     label: 'Usuários',   roles: ['admin'] },
    { id: 'panel-logs',      label: 'Auditoria',  roles: ['admin'] },
  ];
  panels.forEach(p => {
    if (!p.roles.includes(currentUser.role)) return;
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.textContent = p.label;
    btn.dataset.panel = p.id;
    btn.addEventListener('click', () => {
      showPanel(p.id);
      if (p.id === 'panel-documents') loadDocuments();
      if (p.id === 'panel-users')     loadUsers();
      if (p.id === 'panel-logs')      loadLogs();
    });
    nav.appendChild(btn);
  });
  // Mostrar/ocultar botão novo doc para analista (pode ver mas não criar pelo painel)
  const btnNew = $('#btn-new-doc');
  btnNew.style.display = currentUser.role === 'analista' ? 'none' : '';
}

// ─── DOCUMENTOS ───────────────────────────────────────────────────────────────
async function loadDocuments() {
  const list  = $('#doc-list');
  const filter = $('#filter-status').value;
  list.innerHTML = '<p class="empty">Carregando...</p>';
  try {
    let docs = await api('GET', '/documents');
    if (filter) docs = docs.filter(d => d.status === filter);
    if (!docs.length) { list.innerHTML = '<p class="empty">Nenhum documento encontrado.</p>'; return; }
    list.innerHTML = docs.map(doc => `
      <div class="doc-card" data-id="${doc.id}">
        <div class="doc-card-info">
          <div class="doc-card-title">${esc(doc.title)}</div>
          <div class="doc-card-meta">${esc(doc.category)} · enviado por ${esc(doc.owner_name)} · ${fmtDate(doc.created_at)}</div>
        </div>
        ${statusBadge(doc.status)}
      </div>
    `).join('');
    list.querySelectorAll('.doc-card').forEach(card => {
      card.addEventListener('click', () => openDocDetail(card.dataset.id, docs));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty">${err.message}</p>`;
  }
}

$('#filter-status').addEventListener('change', loadDocuments);

function openDocDetail(id, docs) {
  const doc = docs.find(d => d.id === id);
  if (!doc) return;

  const canChangeStatus = ['analista', 'admin'].includes(currentUser.role) &&
    !['aprovado', 'rejeitado'].includes(doc.status);
  const canEdit   = doc.owner_id === currentUser.id && doc.status === 'pendente';
  const canDelete = (doc.owner_id === currentUser.id && doc.status === 'pendente') ||
    currentUser.role === 'admin';

  const statusOptions = ['pendente','em_analise','aprovado','rejeitado']
    .map(s => `<option value="${s}" ${s === doc.status ? 'selected' : ''}>${s}</option>`)
    .join('');

  const statusForm = canChangeStatus ? `
    <div class="detail-row">
      <span class="detail-label">Alterar status</span>
      <select id="detail-status">${statusOptions}</select>
    </div>
    <div class="field">
      <label for="detail-comment">Comentário</label>
      <textarea id="detail-comment" rows="2" placeholder="Observações da análise...">${esc(doc.comment || '')}</textarea>
    </div>
  ` : '';

  openModal(
    doc.title,
    `
    <div class="detail-row"><span class="detail-label">Status</span><span>${statusBadge(doc.status)}</span></div>
    <div class="detail-row"><span class="detail-label">Categoria</span><span class="detail-value">${esc(doc.category)}</span></div>
    <div class="detail-row"><span class="detail-label">Descrição</span><span class="detail-value">${esc(doc.description || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Solicitante</span><span class="detail-value">${esc(doc.owner_name)}</span></div>
    <div class="detail-row"><span class="detail-label">Analista</span><span class="detail-value">${esc(doc.analyst_name || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Comentário</span><span class="detail-value">${esc(doc.comment || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Criado em</span><span class="detail-value mono">${fmtDate(doc.created_at)}</span></div>
    <div class="detail-row"><span class="detail-label">Atualizado</span><span class="detail-value mono">${fmtDate(doc.updated_at)}</span></div>
    ${statusForm}
    `,
    `
    ${canDelete ? `<button class="btn btn-danger btn-sm" id="btn-doc-delete">Excluir</button>` : ''}
    ${canEdit   ? `<button class="btn btn-ghost btn-sm" id="btn-doc-edit">Editar</button>` : ''}
    ${canChangeStatus ? `<button class="btn btn-primary btn-sm" id="btn-doc-status">Salvar status</button>` : ''}
    `
  );

  document.getElementById('btn-doc-status')?.addEventListener('click', async () => {
    const status  = $('#detail-status').value;
    const comment = $('#detail-comment').value;
    try {
      await api('PATCH', `/documents/${id}/status`, { status, comment });
      closeModal(); loadDocuments();
    } catch (err) { alert(err.message); }
  });

  document.getElementById('btn-doc-delete')?.addEventListener('click', async () => {
    if (!confirm('Excluir este documento?')) return;
    try {
      await api('DELETE', `/documents/${id}`);
      closeModal(); loadDocuments();
    } catch (err) { alert(err.message); }
  });

  document.getElementById('btn-doc-edit')?.addEventListener('click', () => {
    closeModal();
    openDocForm(doc);
  });
}

// ─── Novo / editar documento ──────────────────────────────────────────────────
$('#btn-new-doc').addEventListener('click', () => openDocForm(null));

function openDocForm(doc = null) {
  const categories = ['contrato','relatorio','termo','proposta','declaracao','outro'];
  const catOptions = categories.map(c =>
    `<option value="${c}" ${doc?.category === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  openModal(
    doc ? 'Editar documento' : 'Novo documento',
    `
    <div class="field"><label>Título *</label>
      <input id="f-title" type="text" value="${esc(doc?.title || '')}" placeholder="Título do documento" /></div>
    <div class="field"><label>Categoria *</label>
      <select id="f-category">${catOptions}</select></div>
    <div class="field"><label>Descrição</label>
      <textarea id="f-desc">${esc(doc?.description || '')}</textarea></div>
    `,
    `<button class="btn btn-ghost btn-sm" id="btn-form-cancel">Cancelar</button>
     <button class="btn btn-primary btn-sm" id="btn-form-save">${doc ? 'Salvar' : 'Enviar'}</button>`
  );

  $('#btn-form-cancel').addEventListener('click', closeModal);
  $('#btn-form-save').addEventListener('click', async () => {
    const body = {
      title:       $('#f-title').value.trim(),
      category:    $('#f-category').value,
      description: $('#f-desc').value.trim(),
    };
    try {
      if (doc) await api('PUT', `/documents/${doc.id}`, body);
      else     await api('POST', '/documents', body);
      closeModal(); loadDocuments();
    } catch (err) { alert(err.message); }
  });
}

// ─── USUÁRIOS (admin) ─────────────────────────────────────────────────────────
async function loadUsers() {
  const list = $('#user-list');
  list.innerHTML = '<p class="empty">Carregando...</p>';
  try {
    const users = await api('GET', '/admin/users');
    list.innerHTML = users.map(u => `
      <div class="user-card ${u.active ? '' : 'user-inactive'}">
        <div class="user-card-info">
          <div class="user-card-name">${esc(u.name)}</div>
          <div class="user-card-email">${esc(u.email)} · criado ${fmtDate(u.created_at)}</div>
        </div>
        ${roleBadge(u.role)}
        <button class="btn btn-ghost btn-sm" data-uid="${u.id}" data-active="${u.active}">
          ${u.active ? 'Desativar' : 'Ativar'}
        </button>
      </div>
    `).join('');
    list.querySelectorAll('[data-uid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`${btn.dataset.active === '1' ? 'Desativar' : 'Ativar'} este usuário?`)) return;
        try { await api('PATCH', `/admin/users/${btn.dataset.uid}/toggle`); loadUsers(); }
        catch (err) { alert(err.message); }
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty">${err.message}</p>`;
  }
}

$('#btn-new-user').addEventListener('click', () => {
  openModal(
    'Novo usuário',
    `
    <div class="field"><label>Nome *</label><input id="nu-name" type="text" /></div>
    <div class="field"><label>E-mail *</label><input id="nu-email" type="email" /></div>
    <div class="field"><label>Senha *</label><input id="nu-pass" type="password" /></div>
    <div class="field"><label>Perfil *</label>
      <select id="nu-role">
        <option value="solicitante">Solicitante</option>
        <option value="analista">Analista</option>
        <option value="admin">Admin</option>
      </select></div>
    `,
    `<button class="btn btn-ghost btn-sm" id="nu-cancel">Cancelar</button>
     <button class="btn btn-primary btn-sm" id="nu-save">Criar</button>`
  );
  $('#nu-cancel').addEventListener('click', closeModal);
  $('#nu-save').addEventListener('click', async () => {
    try {
      await api('POST', '/admin/users', {
        name:     $('#nu-name').value.trim(),
        email:    $('#nu-email').value.trim(),
        password: $('#nu-pass').value,
        role:     $('#nu-role').value,
      });
      closeModal(); loadUsers();
    } catch (err) { alert(err.message); }
  });
});

// ─── LOGS (admin) ─────────────────────────────────────────────────────────────
async function loadLogs() {
  const wrap   = $('#log-table-wrap');
  const action = $('#filter-log-action').value;
  const email  = $('#filter-log-email').value.trim();
  wrap.innerHTML = '<p class="empty">Carregando...</p>';
  try {
    const params = new URLSearchParams({ limit: 200 });
    if (action) params.set('action', action);
    if (email)  params.set('user_email', email);
    const logs = await api('GET', `/admin/logs?${params}`);
    if (!logs.length) { wrap.innerHTML = '<p class="empty">Nenhum log encontrado.</p>'; return; }
    wrap.innerHTML = `
      <table>
        <thead><tr>
          <th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Tipo</th><th>Detalhe</th><th>IP</th>
        </tr></thead>
        <tbody>
          ${logs.map(l => `<tr>
            <td>${fmtDate(l.created_at)}</td>
            <td>${esc(l.user_email || '—')}</td>
            <td>${esc(l.action)}</td>
            <td>${esc(l.target_type || '—')}</td>
            <td>${esc(l.detail || '—')}</td>
            <td>${esc(l.ip || '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrap.innerHTML = `<p class="empty">${err.message}</p>`;
  }
}

$('#btn-refresh-logs').addEventListener('click', loadLogs);
$('#btn-filter-logs').addEventListener('click', loadLogs);

// ─── Escape HTML ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
boot();
