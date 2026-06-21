# Work Guide

Guia rápido de como trabalhar no projeto: branch, commit, push e pull request.

---

## 0. Antes de começar

Toda spec de desenvolvimento (documento de funcionalidades de cada desenvolvedor) já define:

- o **nome da branch** que deve ser criada;
- a **mensagem de commit** a ser usada;
- a **mensagem do Pull Request**.

Não invente nome de branch, commit ou PR — use exatamente o que está definido na sua spec.

---

## 1. Criar a branch de trabalho

Sempre a partir da `master` atualizada, usando o nome de branch definido na spec:

```bash
git checkout master
git pull origin master
git checkout -b nome-definido-na-spec
```

---

## 2. Commitar

Usando a mensagem de commit definida na spec:

```bash
git add .
git commit -m "mensagem definida na spec"
```

Se a tarefa precisar de mais de um commit, mantenha o mesmo padrão de mensagem da spec, ajustando o necessário para refletir cada etapa.

---

## 3. Dar push

```bash
git push origin nome-definido-na-spec
```

---

## 4. Abrir Pull Request

Ao finalizar a tarefa:

1. Abrir um Pull Request da sua branch para a `master`.
2. Usar o título/descrição do PR definido na spec.
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
spec define branch/commit/PR → master atualizada → criar branch → commits → push → Pull Request → aguardar revisão → revisor faz o merge
```