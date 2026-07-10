# Sincronização na nuvem — configurar o Firebase (grátis, ~5 min)

O app já está pronto para sincronizar. Falta só criar um projeto Firebase (gratuito) e
colar a configuração. Enquanto não fizer isso, o app funciona normal, só que **local**.

> Modelo escolhido: **uma conta de família compartilhada** (um e-mail/senha que vocês dois
> usam nos dois celulares). Simples e seguro para um casal. Dá pra evoluir depois.

---

## 1) Criar o projeto
1. Acesse **https://console.firebase.google.com** e faça login com uma conta Google.
2. **Adicionar projeto** → dê um nome (ex.: `diario-bebe`) → pode desativar o Google Analytics → **Criar**.

## 2) Ativar o banco (Firestore)
1. No menu lateral: **Build → Firestore Database → Criar banco de dados**.
2. Escolha **Iniciar no modo de produção** → selecione a região (ex.: `southamerica-east1`) → **Ativar**.

## 3) Ativar o login (Authentication)
1. **Build → Authentication → Começar**.
2. Em **Sign-in method**, ative **E-mail/senha** → Salvar.

## 4) Pegar a configuração do app web
1. Na engrenagem ⚙️ (**Configurações do projeto**) → aba **Geral** → role até **Seus apps**.
2. Clique no ícone **`</>`** (Web) → dê um apelido (ex.: `bebe-web`) → **Registrar app**.
3. Vai aparecer um objeto `firebaseConfig` com `apiKey`, `authDomain`, etc.
4. Copie esses valores para o arquivo **`firebase-config.js`** deste projeto:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "diario-bebe.firebaseapp.com",
  projectId: "diario-bebe",
  storageBucket: "diario-bebe.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...:web:abc...",
};
```

## 5) Regras de segurança (importante)
No Firestore → aba **Regras**, cole exatamente isto e **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /accounts/{uid}/events/{eventId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Isso garante que só quem está logado acessa os próprios dados (ninguém mais lê/escreve).

## 6) Regerar e republicar
```
powershell -ExecutionPolicy Bypass -File build.ps1
```
Depois suba a pasta **`dist/`** de novo para a hospedagem (Netlify/GitHub).

## 7) Usar nos dois celulares
1. Abra o app (pelo link hospedado) no celular seu e no da sua esposa.
2. Em **⋯ → Sincronização**, na primeira vez clique em **Criar conta** com um e-mail e senha
   da família. No segundo celular, use **Entrar** com o **mesmo** e-mail e senha.
3. Pronto: o que um registrar aparece no outro em segundos, e tudo fica salvo na nuvem.

---

## Como funciona (resumo técnico)
- Cada evento tem um `id` único e um `updatedAt`. Conflitos resolvem por **última escrita vence**.
- Excluir é **exclusão lógica** (marca `deleted`), para o apagamento também sincronizar.
- Continua **offline-first**: registra sem internet e sincroniza quando reconecta (Firestore
  guarda a fila local automaticamente).
- Caminho dos dados: `accounts/{seu-uid}/events/{id}`.

## Custos
O plano gratuito (Spark) do Firebase cobre com folga o uso de uma família
(dezenas de milhares de leituras/gravações por dia). Sem cartão de crédito.
