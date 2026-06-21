# Work Guide

Guia rápido de como trabalhar no projeto: branch, commit, push e pull request.

---

## 1. Criar uma branch de trabalho

Sempre a partir da `master` atualizada:

```bash
git checkout master
git pull origin master
git checkout -b nome-da-branch
```

Sugestão de nome: `feature/nome-da-tarefa` ou `fix/nome-do-bug`.

---

## 2. Commitar

```bash
git add .
git commit -m "mensagem clara e objetiva"
```

Commits pequenos e frequentes, descrevendo o que foi feito.

---

## 3. Dar push

```bash
git push origin nome-da-branch
```

---

## 4. Abrir Pull Request

Ao finalizar a tarefa:

1. Abrir um Pull Request da sua branch para a `master`.
2. Descrever o que foi implementado.
3. **Não fazer merge.**
4. Aguardar a revisão de um revisor.

---

## 5. Revisão

- O revisor valida o que foi implementado.
- Só o revisor mescla (merge) o Pull Request na `master`.
- Se houver apontamentos, ajustar na mesma branch e dar push novamente — o PR é atualizado automaticamente.

---

## Resumo

```
master atualizada → nova branch → commits → push → Pull Request → aguardar revisão → revisor faz o merge
```
