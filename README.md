# DocVault — Sistema de Gestão e Aprovação de Documentos

> Avaliação N3 — Segurança da Informação · Católica SC · Prof. Edson Vaz Lopes
> Projeto **P06-A** — Gestão de Documentos: Envio e Aprovação

---

## Visão geral

DocVault é um sistema web para envio, análise e aprovação de documentos fictícios internos. Usuários enviam documentos, analistas analisam e alteram status, administradores gerenciam usuários e auditam todo o fluxo via logs de auditoria.

O sistema foi desenvolvido com foco em segurança aplicada: autenticação via JWT, autorização por perfil (RBAC), regra de dono do recurso, hash de senhas com bcrypt, validação no servidor, logs de auditoria e gestão de segredos fora do repositório.

---

## Stack

| Camada    | Tecnologia                             |
| --------- | -------------------------------------- |
| Back-end  | Node.js + Express                      |
| Banco     | SQLite via `better-sqlite3`            |
| Auth      | JWT (`jsonwebtoken`) + cookie httpOnly |
| Senhas    | `bcryptjs` (custo 12)                  |
| Front-end | HTML + CSS + JS (sem framework)        |

---

## Perfis de usuário

| Perfil        | Descrição                                                                   |
| ------------- | --------------------------------------------------------------------------- |
| `solicitante` | Cria e visualiza apenas os próprios documentos                              |
| `analista`    | Visualiza documentos pendentes e atribuídos, altera status e comenta        |
| `admin`       | Gerencia usuários, visualiza todos os documentos e acessa logs de auditoria |

---

## Pré-requisitos

- Node.js v18+
- npm v9+

---

## Instalação e execução

```
# 1. Clone o repositório
git clone https://github.com/gcarvalhow/docvault.git
cd docvault

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env e defina JWT_SECRET com uma string longa e aleatória

# 4. Popule o banco com dados fictícios
npm run seed

# 5. Inicie o servidor
npm start
# Acesse: http://localhost:3000
```

---

## Usuários de teste (após seed)

| E-mail                        | Senha          | Perfil      |
| ----------------------------- | -------------- | ----------- |
| admin@docvault.dev            | Admin@2026!    | admin       |
| ana.analista@docvault.dev     | Analista@2026! | analista    |
| bruno.analista@docvault.dev   | Analista@2026! | analista    |
| carlos@docvault.dev           | Carlos@2026!   | solicitante |
| diana@docvault.dev            | Diana@2026!    | solicitante |
| eduardo@docvault.dev          | Eduardo@2026!  | solicitante |

> As senhas são armazenadas **exclusivamente como hash bcrypt** no banco de dados. Nunca em texto puro.

---

## Estrutura do repositório

```
docvault/
├── src/
│   ├── server.js           # Ponto de entrada do servidor Express
│   ├── db/
│   │   ├── database.js     # Inicialização do SQLite e definição do schema
│   │   └── seed.js         # Dados fictícios para demonstração
│   ├── routes/
│   │   ├── auth.js         # Login, logout, /me
│   │   ├── documents.js    # CRUD de documentos com autenticação e autorização
│   │   └── admin.js        # Gestão de usuários e logs (admin only)
│   ├── middleware/
│   │   └── auth.js         # authenticate (JWT) e authorize (RBAC)
│   └── utils/
│       └── audit.js        # Log de auditoria (todos os eventos relevantes)
├── public/
│   ├── index.html          # SPA — shell HTML
│   ├── css/style.css       # Estilos
│   └── js/app.js           # Lógica do front-end
├── .env.example            # Modelo de variáveis de ambiente
├── .gitignore              # Exclui .env, data/, node_modules/
└── package.json
```

---

## Segurança implementada

| Controle                      | Onde                         | Risco reduzido                               |
| ----------------------------- | ---------------------------- | -------------------------------------------- |
| Hash de senha (bcrypt, c=12)  | `db/seed.js`, `routes/admin` | Vazamento de senha em texto puro             |
| JWT httpOnly cookie           | `routes/auth.js`             | XSS roubando token                           |
| Autorização por perfil (RBAC) | `middleware/auth.js`         | Acesso indevido a rotas restritas            |
| Regra de dono do recurso      | `routes/documents.js`        | Solicitante acessando dados de outro usuário |
| Validação no servidor         | Todas as rotas               | Entrada inválida ou maliciosa                |
| Secrets fora do Git           | `.env` + `.gitignore`        | Vazamento de chaves no repositório           |
| Logs de auditoria             | `utils/audit.js`             | Falta de rastreabilidade de ações            |

### Eventos auditados

- `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `LOGOUT`
- `ACCESS_DENIED` (token ausente, perfil insuficiente, acesso a recurso de outro usuário)
- `DOC_CREATED` / `DOC_EDITED` / `DOC_DELETED`
- `DOC_STATUS_CHANGED`
- `USER_CREATED` / `USER_ACTIVATED` / `USER_DEACTIVATED`

---

## Endpoints da API

### Autenticação

| Método | Rota             | Perfil      | Descrição              |
| ------ | ---------------- | ----------- | ---------------------- |
| POST   | /api/auth/login  | público     | Login                  |
| POST   | /api/auth/logout | autenticado | Logout                 |
| GET    | /api/auth/me     | autenticado | Dados do usuário atual |

### Documentos

| Método | Rota                      | Perfil             | Descrição                    |
| ------ | ------------------------- | ------------------ | ---------------------------- |
| GET    | /api/documents            | todos              | Listar (filtrado por perfil) |
| GET    | /api/documents/:id        | todos              | Detalhe (com regra de dono)  |
| POST   | /api/documents            | solicitante, admin | Criar documento              |
| PUT    | /api/documents/:id        | dono (se pendente) | Editar (apenas pendente)     |
| PATCH  | /api/documents/:id/status | analista, admin    | Alterar status               |
| DELETE | /api/documents/:id        | dono ou admin      | Excluir                      |

### Admin

| Método | Rota                        | Perfil | Descrição         |
| ------ | --------------------------- | ------ | ----------------- |
| GET    | /api/admin/users            | admin  | Listar usuários   |
| POST   | /api/admin/users            | admin  | Criar usuário     |
| PATCH  | /api/admin/users/:id/toggle | admin  | Ativar/desativar  |
| GET    | /api/admin/logs             | admin  | Logs de auditoria |

---

## Matriz de permissões

| Funcionalidade          | Solicitante           | Analista | Admin |
| ----------------------- | --------------------- | -------- | ----- |
| Criar documento         | ✓                     | —        | ✓     |
| Ver próprios documentos | ✓                     | ✓        | ✓     |
| Ver todos os documentos | ✗                     | Parcial  | ✓     |
| Editar documento        | Só próprio (pendente) | ✗        | ✓     |
| Excluir documento       | Só próprio (pendente) | ✗        | ✓     |
| Alterar status          | ✗                     | ✓        | ✓     |
| Gerenciar usuários      | ✗                     | ✗        | ✓     |
| Visualizar logs         | ✗                     | ✗        | ✓     |

---

## O que não foi implementado (limitações conhecidas)

- Upload real de arquivo (arquivo é gerado como buffer fictício)
- HTTPS (requer configuração de certificado no ambiente de produção)
- Rate limiting no login (recomendado para produção)
- Refresh token (sessão expira em 8h sem renovação automática)
- Testes automatizados

---

## Integrantes do grupo

| Nome                     | GitHub                                            |
| ------------------------ | ------------------------------------------------- |
| Igor Thiago Seberino     | [@igorSeberino](https://github.com/igorSeberino)  |
| Adrian Cesar Gonçalves   | [@adrian-cesar](https://github.com/adrian-cesar)  |
| Renato Colin Neto        | [@RenatoColin](https://github.com/RenatoColin)    |
| Gabriel da Silva Carvalho | [@gabrielcarvallho](https://github.com/gabrielcarvallho) |

---

*Dados de demonstração são todos fictícios. Nenhum dado real de pessoa foi utilizado.*
