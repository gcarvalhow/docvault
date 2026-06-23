# Papéis e responsabilidades do time

Este documento define **quem é dono de que** no DocVault. O objetivo é que cada
integrante trabalhe de forma independente, em sua própria branch e em arquivos/módulos
distintos, reduzindo conflitos de merge.

Cada papel tem uma **spec própria** em [`docs/specs/backend/`](specs/backend/) com escopo,
contrato e checklist. O passo a passo de branch → commit → push → PR está em
[`work-guide.md`](work-guide.md).

---

## Divisão por integrante

| Integrante       | GitHub             | Área / Módulo                          | Spec                                                  | Branch                          | Status        |
| ---------------- | ------------------ | -------------------------------------- | ----------------------------------------------------- | ------------------------------- | ------------- |
| Renato Colin     | `@rcolinneto`      | Primeiro acesso / Organização          | [001-work-renato](specs/backend/001-work-renato.md)   | `feature/001-first-access`      | Concluído (merge) |
| Igor Seberino    | `@igorSeberino`    | Autenticação / Identity (login + JWT)  | [002-work-igor](specs/backend/002-work-igor.md)       | `feature/002-authentication`    | Em desenvolvimento |
| Adrian Cesar     | `@adrian-cesar`    | Sessão / Gestão de tokens (refresh, logout) | [003-work-adrian](specs/backend/003-work-adrian.md) | `feature/003-token-management`  | Em revisão (PR aberto) |
| Gabriel Carvalho | `@gabrielcarvallho`| Documentos (envio + aprovação) · revisor/tech lead | [004-work-gabriel](specs/backend/004-work-gabriel.md) | `feature/004-documents`         | A iniciar     |

---

## Detalhamento dos papéis

### Renato Colin — Primeiro acesso / Organização
Dono do módulo `organization` e do fluxo de onboarding: criação da organização e do
usuário administrador inicial, em transação única. É a porta de entrada do sistema.

### Igor Seberino — Autenticação / Identity
Dono do fluxo de login no módulo `identity`: validação de credenciais, emissão do
access token (JWT) no corpo da resposta e do refresh token via cookie HttpOnly.
Base sobre a qual os fluxos de sessão (Adrian) e os endpoints autenticados (Gabriel) se apoiam.

### Adrian Cesar — Sessão / Gestão de tokens
Dono do ciclo de vida da sessão no módulo `identity`: renovação do access token via
refresh token (com rotação) e logout (revogação de todos os tokens + regeneração do
`security_stamp`). Estende `AuthUseCase`/`auth_router` criados pelo Igor — coordenar ordem de merge.

### Gabriel Carvalho — Documentos + revisor
Dono do novo módulo `documents`: envio de documentos por solicitantes e fluxo de
aprovação (mudança de status) por analistas/admin. Também atua como **revisor/tech lead**:
é o revisor designado nos Pull Requests e responsável por aprovar e mesclar na `master`.

---

## Como trabalhamos em paralelo

- **Fronteiras por módulo.** Cada um trabalha primariamente em seu módulo/área. O núcleo
  compartilhado (`app/core/...`) e arquivos transversais (`main.py`, `database.py`) são
  alterados com cuidado e comunicados ao time.
- **Uma spec por dono.** Não invente nome de branch, commit ou PR — use exatamente o que
  está definido na sua spec (ver seção 0 de cada documento).
- **Dependências conhecidas.** Identity (Igor) é base para Sessão (Adrian) e para os
  endpoints autenticados de Documentos (Gabriel). Alinhar a ordem de merge quando dois
  trabalhos tocam os mesmos arquivos.
- **Revisão.** Todo PR vai para a `master` com o **Gabriel** como revisor. Só o revisor
  faz o merge. Ninguém mescla o próprio PR.

---

*Alterações de papel/escopo devem ser acordadas pelo time e registradas aqui e na spec correspondente.*
