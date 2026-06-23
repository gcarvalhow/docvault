# Funcionalidades - Gabriel Carvalho

## 0. Git

- **Branch:** `feature/004-documents`
- **Commit:** `feat(documents): document submission and approval flow`
- **Pull Request (título):** `feat(documents): document submission and approval flow`

Use exatamente esses valores ao criar a branch, commitar e abrir o PR. Ver `work-guide.md` para o passo a passo.

> Alem desta entrega, o Gabriel atua como **revisor/tech lead** do projeto: e o revisor designado nos Pull Requests dos demais modulos e responsavel por aprovar e mesclar na `master`.

---

## 1. Objetivo
Este documento define o escopo de implementacao do desenvolvedor Gabriel Carvalho na fase inicial do projeto.

Tema desta entrega:
- Modulo de **Documentos**: criacao (envio) de documentos por solicitantes e fluxo de aprovacao (mudanca de status) por analistas/admin.

Depende de:
- Autenticacao (spec `002-work-igor.md`) para identificar o usuario autenticado e seu `role`.

---

## 2. Escopo funcional

### Fluxo A — Envio de documento
1. Usuario autenticado (`solicitante` ou `admin`) informa titulo/descricao do documento.
2. A API cria o documento com status inicial `pendente`, vinculado ao autor (`owner`) e a organizacao.

### Fluxo B — Listagem e detalhe
1. `solicitante` ve apenas os proprios documentos.
2. `analista` ve os documentos pendentes/atribuidos.
3. `admin` ve todos os documentos da organizacao.

### Fluxo C — Mudanca de status (aprovacao)
1. `analista` ou `admin` altera o status de um documento (`aprovado` / `rejeitado`), opcionalmente com comentario.
2. A transicao de status respeita as regras (so a partir de `pendente`).

---

## 3. Regras de negocio obrigatorias
1. Documento criado nasce com status `pendente` e vinculado ao usuario autenticado (`owner_id`) e a sua organizacao (`organization_id`).
2. `title` obrigatorio e nao vazio (usar `NonEmptyStr`).
3. Regra de dono do recurso: `solicitante` so acessa/edita os proprios documentos.
4. So `analista` e `admin` podem alterar status; `solicitante` nao pode.
5. Status so transita a partir de `pendente` (nao reaprovar/reabrir nesta fase).
6. Edicao do conteudo do documento pelo dono so e permitida enquanto `pendente`.

Observacao:
- Validacoes de obrigatoriedade/formato ficam no schema.
- Regras de negocio e autorizacao por recurso ficam no use case.

---

## 4. Validacoes da API
A API deve:
- validar campos obrigatorios do documento;
- validar que o status informado e um valor valido do enum;
- aplicar autorizacao por `role` (criar/listar/alterar status) e por dono do recurso;
- retornar erros claros (403 para acesso indevido, 404 para documento inexistente, 409/422 para transicao invalida).

---

## 5. Estrutura de arquivos prevista

Seguir o mesmo padrao modular ja usado em `identity` e `organization` (DDD por modulo).

```
app/modules/documents/
├── domain/
│   ├── enumerations.py      # DocumentStatus (pendente, aprovado, rejeitado)
│   ├── aggregates.py        # Document (Create, change_status, ...)
│   └── __init__.py
├── infrastructure/
│   ├── document_repository.py
│   └── __init__.py
├── schemas/
│   ├── requests.py          # CreateDocumentRequest, ChangeStatusRequest
│   ├── responses.py         # DocumentResponse
│   └── __init__.py
├── usecases/
│   ├── document_usecases.py # DocumentUseCase
│   └── __init__.py
└── routers/
    ├── document_router.py   # prefix="/documents"
    └── __init__.py
```

### 5.1 Enumeration
Arquivo: `app/modules/documents/domain/enumerations.py`

```python
import enum

class DocumentStatus(str, enum.Enum):
    PENDING = "pendente"
    APPROVED = "aprovado"
    REJECTED = "rejeitado"
```

### 5.2 Aggregate
Arquivo: `app/modules/documents/domain/aggregates.py`

```python
# Document(Model):
#   title, description, owner_id (FK users), organization_id (FK organizations),
#   status: DocumentStatus = PENDING
#   @classmethod Create(title, description, owner_id, organization_id) -> Document
#   def change_status(self, new_status: DocumentStatus) -> None  # so a partir de PENDING
```

Observacao:
- Seguir o padrao do aggregate `User`/`Organization` (heranca de `Model`, `id`/`created_at` no `__init__`, relacoes por identificador).
- Relacoes sempre por `owner_id`/`organization_id`, nunca por objeto relacionado.

### 5.3 Schemas
Arquivo: `app/modules/documents/schemas/requests.py`

```python
# CreateDocumentRequest: title: NonEmptyStr, description: str | None
# ChangeStatusRequest: status: DocumentStatus, comment: str | None
```

Arquivo: `app/modules/documents/schemas/responses.py`

```python
# DocumentResponse: id, title, status, owner_id, created_at
```

### 5.4 Usecase
Arquivo: `app/modules/documents/usecases/document_usecases.py`

```python
# DocumentUseCase(session):
#   - constroi DocumentRepository internamente (mesmo padrao de UserUseCase/OrganizationUseCase)
#   - create(request, owner_id, organization_id) -> IdentifierResponse
#   - list_for(user) -> list[DocumentResponse]   # filtra por role/dono
#   - change_status(document_id, request, actor) -> DocumentResponse
#   - levanta HTTPException diretamente (403/404/409) seguindo o padrao do projeto
```

### 5.5 Router
Arquivo: `app/modules/documents/routers/document_router.py`

```python
# router = APIRouter(prefix="/documents", tags=["Documents"])
# POST   ""                 -> criar (solicitante/admin)
# GET    ""                 -> listar (filtrado por role)
# GET    "/{document_id}"   -> detalhe (regra de dono)
# PATCH  "/{document_id}/status" -> alterar status (analista/admin)
```

Observacao:
- O usuario autenticado vem de uma dependencia de autenticacao (a partir do access token emitido na spec 002). Definir/alinhar essa dependencia com o time antes da implementacao.
- O router so passa `session` + identidade do usuario; o `DocumentUseCase` monta o repositorio internamente.
- Registrar o router no `app/main.py`.

---

## 6. Contrato sugerido para endpoints

Criar documento — `POST /documents` (201):
```json
{ "id": "UUID" }
```

Listar — `GET /documents` (200): lista de `DocumentResponse`.

Alterar status — `PATCH /documents/{id}/status` (200):
```json
{ "status": "aprovado", "comment": "ok" }
```

---

## 7. Criterios de pronto (DoD)
A tarefa sera considerada pronta quando:
1. Modulo `documents` criado no padrao DDD do projeto.
2. Criacao de documento com status inicial `pendente` e vinculo a owner/organizacao.
3. Listagem filtrada por `role` (solicitante/analista/admin).
4. Alteracao de status restrita a analista/admin, com transicao valida.
5. Autorizacao por dono do recurso aplicada.
6. Router registrado no `main.py`.
7. Testes minimos de sucesso e falha implementados.

---

## 8. Checklist de implementacao
- [ ] Criar `DocumentStatus`.
- [ ] Criar aggregate `Document` (`Create`, `change_status`).
- [ ] Criar `DocumentRepository`.
- [ ] Criar `CreateDocumentRequest`, `ChangeStatusRequest`, `DocumentResponse`.
- [ ] Implementar `DocumentUseCase` (create/list/change_status) com autorizacao.
- [ ] Implementar `document_router.py` e registrar no `main.py`.
- [ ] Aplicar regra de dono do recurso e autorizacao por role.
- [ ] Criar testes de integracao dos quatro endpoints.

---

## 9. Observacoes para o time
- Este documento define apenas o escopo do Gabriel Carvalho.
- A dependencia de "usuario autenticado" precisa estar disponivel (derivada da spec 002); alinhar a interface antes de comecar.
- Alteracoes de escopo devem ser aprovadas e registradas neste arquivo.
