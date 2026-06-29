# Contrato de Integração — Módulo `documents`

---

## 1. Identificação da feature

- **Nome da feature**: Documents (Gestão e Aprovação de Documentos)
- **Módulo backend responsável**: `app.modules.documents`
- **Status atual**: `existente`
- **Data da última atualização**: 2026-06-29
- **Responsável técnico**: Grupo P06-A

---

## 2. Objetivo de negócio da feature

O módulo `documents` é o core do DocVault. Ele resolve o problema de **rastrear, revisar e aprovar documentos internos** de uma organização com controle de acesso baseado em papel.

Um documento representa um arquivo ou registro formal que precisa passar por um processo de análise antes de ser considerado válido. O ciclo começa quando um solicitante ou admin cria o documento (status `pendente`). Um analista ou admin então move o documento pela esteira de aprovação até `aprovado` ou `rejeitado`.

A feature existe para três tipos de usuário:
- **Solicitante**: cria documentos, acompanha o status dos seus próprios documentos
- **Analista**: revisa documentos pendentes e os que estão em análise pelo próprio analista
- **Admin**: visibilidade e controle total — cria, edita, muda status e deleta qualquer documento

O módulo entra na jornada do usuário como o fluxo principal da plataforma, após o onboarding (criação de organização e login).

---

## 3. Escopo atual versus escopo futuro

**O que já está implementado no backend hoje:**

- Criação de documento (admin e solicitante)
- Consulta e listagem de documentos (com visibilidade por papel)
- Edição de metadados do documento (título, categoria, descrição)
- Mudança de status do documento (analista e admin)
- Exclusão suave (soft delete) de documento

**O que ainda não está implementado:**

- Upload de arquivo binário — o documento é apenas metadado (título, categoria, descrição), sem conteúdo anexado
- Paginação e filtros na listagem (`GET /documents` retorna tudo de uma vez)
- Filtro por status, categoria ou período na listagem
- Histórico de mudanças de status
- Atribuição explícita de analista antes do início da análise

**O que existe no domínio mas não está exposto por endpoint:**

- `Document.is_active`: campo de soft delete — documentos com `is_active=false` não aparecem em nenhuma query

**O que ainda está em discussão:**

- Suporte a upload de arquivo (PDF, DOCX, etc.) ao documento
- Histórico de comentários por documento
- Isolamento por organização (ver seção 16 — gap crítico)

---

## 4. Contexto de produto e semântica da feature

Do ponto de vista do solicitante, o documento é uma solicitação formal esperando avaliação. Após criá-lo, ele aguarda mudança de status.

Do ponto de vista do analista, a fila de trabalho é a listagem de documentos `pendente` (disponíveis para qualquer analista) e `em_analise` (documentos que ele especificamente pegou para revisar).

**O que é considerado sucesso:**
- Solicitante: documento criado e aparecendo na sua lista com status `pendente`
- Analista: documento movido para `aprovado` ou `rejeitado` com comentário explicativo
- Admin: controle total sobre qualquer documento em qualquer estado

**O que é considerado erro funcional:**
- Analista tentando reverter um documento para `pendente` (bloqueado pelo backend)
- Solicitante tentando editar um documento que já saiu do status `pendente`
- Tentativa de editar ou deletar um documento inexistente ou desativado

**Mudança de status é assíncrona do ponto de vista do solicitante** — ele não é notificado em tempo real. O frontend deve oferecer mecanismo de polling ou atualização manual.

---

## 5. Dependências e relações com outras features

- Depende de `identity` para autenticação e autorização (`get_current_user`, `require_role`, políticas em `policies.py`)
- Grava em `audit` automaticamente em todas as operações (criação, edição, mudança de status, exclusão)
- Não depende de `organization` diretamente — **gap**: documentos não têm `organization_id` e não são filtrados por organização (ver seção 16)
- A listagem de documentos para analistas considera o `analyst_id` no documento — o campo `analyst_id` no modelo é preenchido pelo analista ao chamar `PATCH /.../status` passando seu próprio ID

---

## 6. Rotas públicas

| Método | Path | Tipo | Finalidade | Params de rota | Pronta para frontend? |
|---|---|---|---|---|---|
| POST | `/documents` | Mutation | Cria novo documento | — | Sim |
| GET | `/documents` | Query | Lista documentos visíveis ao usuário (filtro por papel) | — | Sim |
| GET | `/documents/{document_id}` | Query | Retorna documento por ID | `document_id: UUID` | Sim |
| PUT | `/documents/{document_id}` | Mutation | Edita título, categoria e descrição | `document_id: UUID` | Sim |
| PATCH | `/documents/{document_id}/status` | Mutation | Muda o status do documento (analista/admin) | `document_id: UUID` | Sim |
| DELETE | `/documents/{document_id}` | Mutation | Exclusão suave do documento | `document_id: UUID` | Sim |

---

## 7. Contrato de request

### Request — Criar documento

```
POST /documents
Authorization: Bearer <access_token>
Content-Type: application/json
```

Corpo:
- `title`: string, obrigatório, 3–200 caracteres (whitespace removido automaticamente), descrição curta do documento
- `description`: string ou `null`, opcional — descrição longa ou contextual
- `category`: enum obrigatório — categoria do documento (ver valores na seção 9)

Transformações obrigatórias no frontend:
- `title`: strip de espaços antes/depois já é feito pelo backend, mas validar min. 3 chars no frontend

---

### Request — Editar documento

```
PUT /documents/{document_id}
Authorization: Bearer <access_token>
Content-Type: application/json
```

Corpo idêntico ao de criação:
- `title`: string, obrigatório, 3–200 caracteres
- `description`: string ou `null`, opcional
- `category`: enum obrigatório

O backend substitui todos os campos — é uma atualização completa, não parcial. O frontend deve enviar todos os campos mesmo que apenas um tenha mudado.

---

### Request — Mudar status

```
PATCH /documents/{document_id}/status
Authorization: Bearer <access_token>
Content-Type: application/json
```

Requer papel `admin` ou `analista`.

Corpo:
- `status`: enum obrigatório — novo status do documento
- `analyst_id`: UUID ou `null`, opcional — UUID do analista que está fazendo a revisão (normalmente o ID do próprio usuário autenticado)
- `comment`: string ou `null`, opcional — comentário sobre a decisão (recomendado ao rejeitar)

Transformações obrigatórias no frontend:
- Ao mover para `em_analise` ou ao aprovar/rejeitar, passar `analyst_id` com o UUID do usuário logado para registrar quem fez a ação

---

### Request — Deletar documento

```
DELETE /documents/{document_id}
Authorization: Bearer <access_token>
```

Sem corpo. Retorna 204.

---

## 8. Contrato de response

### Response — Criar documento (201)

```json
{
  "id": "uuid-do-documento"
}
```

### Response — Documento (GET por ID e listagem)

```json
{
  "id": "uuid",
  "title": "Contrato de Prestação de Serviços",
  "description": "Contrato referente ao projeto X, vigência 2026",
  "category": "contrato",
  "status": "pendente",
  "owner_id": "uuid-do-criador",
  "analyst_id": null,
  "comment": null,
  "created_at": "2026-06-01T10:00:00Z",
  "updated_at": "2026-06-15T14:30:00Z"
}
```

Campos:
- `id`: UUID estável do documento
- `title`: string
- `description`: string ou `null` — ausente quando não preenchido
- `category`: enum (ver seção 9)
- `status`: enum (ver seção 9)
- `owner_id`: UUID do usuário que criou o documento
- `analyst_id`: UUID ou `null` — preenchido quando um analista inicia ou conclui a revisão
- `comment`: string ou `null` — comentário do analista ao mudar status
- `created_at`: ISO 8601 UTC
- `updated_at`: ISO 8601 UTC — atualizado a cada save (criação, edição, mudança de status)

### 8.1. Formato canônico versus formato de exibição

- `category` e `status` chegam em português (valores do enum) — prontos para exibição direta ou mapeamento para labels de UI
- `analyst_id` e `owner_id` chegam como UUIDs — o frontend deve resolver para nome/email buscando `GET /identity/users/{id}` se precisar exibir o nome

### 8.2. Nullabilidade e ausência de campo

- `description`: pode ser `null` se não preenchida
- `analyst_id`: `null` enquanto nenhum analista pegou o documento; preenchido quando `status` muda para `em_analise`, `aprovado` ou `rejeitado`
- `comment`: `null` enquanto nenhuma revisão foi feita; pode ser `null` mesmo em `aprovado`/`rejeitado` se o analista não forneceu comentário

---

## 9. Estados de negócio e transições

### Status do documento

| Valor (API) | Significado |
|---|---|
| `pendente` | Aguardando análise — visível a qualquer analista |
| `em_analise` | Em revisão por um analista específico |
| `aprovado` | Aprovado — fluxo concluído |
| `rejeitado` | Rejeitado — fluxo concluído |

### Fluxo de transições

```
pendente
  → em_analise  (analista ou admin)
  → aprovado    (analista ou admin)
  → rejeitado   (analista ou admin)

em_analise
  → aprovado    (analista ou admin)
  → rejeitado   (analista ou admin)
  → pendente    (somente admin)

aprovado / rejeitado
  → qualquer    (somente admin)
```

**Regra crítica**: analistas **não podem** reverter status para `pendente`. O backend retorna 403 se tentarem. O frontend deve ocultar a opção de reverter para `pendente` quando o usuário for analista.

### Categorias de documento

| Valor (API) | Exibição sugerida |
|---|---|
| `contrato` | Contrato |
| `relatorio` | Relatório |
| `termo` | Termo |
| `proposta` | Proposta |
| `declaracao` | Declaração |
| `outro` | Outro |

### 9.1. Visibilidade por papel na listagem

O backend filtra automaticamente o que cada papel vê em `GET /documents`:

- **Admin**: todos os documentos ativos, de qualquer status
- **Analista**: documentos com status `pendente` (qualquer analista pode pegar) + documentos `em_analise` onde `analyst_id` é o ID do analista logado
- **Solicitante**: apenas documentos onde `owner_id` é o ID do usuário logado

O frontend não precisa implementar esse filtro — o backend já aplica. Mas deve saber disso para montar a UI corretamente (ex: analista vê "fila de trabalho", não "meus documentos").

---

## 10. Erros esperados e edge cases

| Status | Quando acontece | O que comunicar ao usuário |
|---|---|---|
| 403 | Solicitante tentando editar documento de outro usuário | "Sem permissão para editar este documento" |
| 403 | Solicitante tentando editar documento que não está mais em `pendente` | "Este documento não pode mais ser editado" |
| 403 | Solicitante tentando deletar documento que não está em `pendente` | "Este documento não pode ser excluído" |
| 403 | Analista tentando mover status para `pendente` | "Analistas não podem reverter o status para pendente" |
| 403 | Solicitante tentando mudar status | "Permissão insuficiente" |
| 404 | Documento não existe ou foi deletado (soft delete) | "Documento não encontrado" |
| 422 | `title` com menos de 3 chars, `category` ou `status` com valor inválido | Exibir mensagem inline por campo |

**Edge case de edição**: o frontend deve verificar o status antes de mostrar o botão de editar/deletar. Se o status não for `pendente` e o usuário não for admin, os botões devem estar desabilitados ou ocultos — o backend retornará 403.

**Edge case de `analyst_id` no PATCH**: o backend aceita qualquer UUID em `analyst_id` sem validar se o UUID corresponde a um analista real ou ao usuário autenticado. O frontend é responsável por enviar o UUID correto (o do usuário logado).

---

## 11. Semântica de autenticação e autorização

- Todas as rotas de documentos exigem **Bearer token** válido
- `PATCH /documents/{id}/status`: exige papel **admin** ou **analista** (verificado no router via `require_role`)
- Criação: `admin` e `solicitante` podem criar; **analista não pode criar documento**
- Edição e deleção: verificação combinada — o backend checa se o usuário é `admin` OU se é o `owner` do documento E o status permite

### Matriz de permissões por operação

| Operação | Admin | Analista | Solicitante |
|---|---|---|---|
| Criar | ✅ | ❌ | ✅ |
| Listar | Todos | Pendentes + em_analise (próprios) | Próprios |
| Ver por ID | ✅ | ✅ (qualquer ativo) | Apenas próprios |
| Editar | ✅ | ❌ | ✅ (apenas pendente) |
| Mudar status | ✅ | ✅ (não volta para pendente) | ❌ |
| Deletar | ✅ | ❌ | ✅ (apenas pendente) |

---

## 12. Impacto de UX que o frontend precisa saber

- **Criação**: retorna apenas `{ "id": "uuid" }`. Para exibir o documento na UI, chamar `GET /documents/{id}` após a criação, ou adicioná-lo otimisticamente à lista local
- **Mudança de status (204)**: o backend não retorna o documento atualizado. O frontend deve reler `GET /documents/{id}` para atualizar o status exibido
- **Edição (204)**: idem — deve reler o documento após PUT bem-sucedido
- **Deleção (204)**: o documento some das listagens. O frontend deve remover da lista local e redirecionar para a listagem
- **`analyst_id` e `owner_id`**: chegam como UUIDs — se o frontend precisar exibir nomes, deve resolver com `GET /identity/users/{id}` separadamente
- **Listagem sem paginação**: a API retorna todos os documentos visíveis de uma vez. Para listas grandes, considerar scroll infinito com cache local

---

## 13. Impacto de dados no frontend

- Após `POST /documents`: invalidar cache de `GET /documents`
- Após `PUT /documents/{id}`: invalidar cache de `GET /documents/{id}` e `GET /documents`
- Após `PATCH /documents/{id}/status`: invalidar cache de `GET /documents/{id}` e `GET /documents`
- Após `DELETE /documents/{id}`: remover do cache local e invalidar `GET /documents`

**UI otimista é segura para DELETE**: se falhar, o documento pode ser re-adicionado à lista. Para mudanças de status, UI otimista é aceitável mas deve ser revertida em caso de erro (especialmente 403).

### 13.1. Identificadores estáveis

- `id` do documento: UUID estável, nunca muda — usar como chave de cache
- `owner_id`: não muda após criação
- `analyst_id`: pode ser `null` e depois preenchido — não usar como chave de cache separada

### 13.2. Compatibilidade e evolução

Sem contratos legados. Este é o contrato inicial.

---

## 14. Observabilidade e suporte

- Sem `traceId` nas respostas
- Todas as operações geram entradas em `audit_logs`:
  - Criação: `DOC_CREATED`
  - Edição: `DOC_EDITED`
  - Mudança de status: `DOC_STATUS_CHANGED` com `detail: "status=<novo_status>"`
  - Deleção: `DOC_DELETED`
- Para rastrear o histórico de um documento específico, filtrar audit logs por `target_id=<document_id>` (quando o endpoint de filtro por `target_id` for implementado — ver seção 16 do módulo audit)

---

## 15. Exemplos reais de payload

```json
// Request — Criar documento
{
  "title": "Proposta Comercial Cliente ABC",
  "description": "Proposta referente ao projeto de automação 2026",
  "category": "proposta"
}

// Response — Criar (201)
{
  "id": "d1e2f3a4-0000-4000-8000-000000000099"
}

// Response — Documento (200)
{
  "id": "d1e2f3a4-0000-4000-8000-000000000099",
  "title": "Proposta Comercial Cliente ABC",
  "description": "Proposta referente ao projeto de automação 2026",
  "category": "proposta",
  "status": "pendente",
  "owner_id": "8c0ea16f-1234-4abc-9def-000000000001",
  "analyst_id": null,
  "comment": null,
  "created_at": "2026-06-20T09:00:00Z",
  "updated_at": "2026-06-20T09:00:00Z"
}

// Request — Mudar status para em_analise
{
  "status": "em_analise",
  "analyst_id": "b2c3d4e5-0000-4000-8000-000000000002",
  "comment": null
}

// Request — Rejeitar com comentário
{
  "status": "rejeitado",
  "analyst_id": "b2c3d4e5-0000-4000-8000-000000000002",
  "comment": "Documentação incompleta. Falta assinatura na página 3."
}

// Erro de permissão (403)
{
  "detail": "Insufficient permissions"
}

// Erro — analista tentando reverter (403)
{
  "detail": "Analysts cannot revert status to pending"
}

// Erro de validação (422)
{
  "detail": [
    { "field": "title", "message": "Minimum 3 characters" },
    { "field": "category", "message": "Invalid value. Options: contrato, relatorio, termo, proposta, declaracao, outro" }
  ]
}
```

---

## 16. Gaps, limitações e decisões abertas

- **Sem isolamento por organização (gap crítico de segurança)**: o modelo `Document` não possui `organization_id`. Na prática, um admin de uma organização enxerga documentos de todas as organizações no sistema. Isso é um gap multi-tenant que precisa ser endereçado antes de produção.
- **Sem upload de arquivo**: o documento é apenas metadado. A feature de armazenar o arquivo binário (PDF, DOCX, etc.) não existe.
- **Sem paginação na listagem**: `GET /documents` retorna todos os documentos visíveis de uma vez. Para volumes maiores, isso será um problema de performance.
- **Sem filtros na listagem**: não é possível filtrar por status, categoria ou período via query params.
- **Sem histórico de status**: só o status atual é armazenado. O histórico de transições (quem mudou, quando, de qual status para qual) só existe nos audit logs, não em um endpoint de histórico dedicado.
- **`analyst_id` não validado**: o backend aceita qualquer UUID válido em `analyst_id` sem verificar se é um analista real. O frontend deve controlar isso.
- **Analista não pode criar documento**: se um analista precisar também submeter documentos, isso não é possível no modelo de papéis atual.
