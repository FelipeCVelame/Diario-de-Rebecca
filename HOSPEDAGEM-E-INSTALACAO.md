# Diário do Bebê — Hospedar e instalar

O que hospedar: a pasta **`dist/`** (gerada pelo `build.ps1`). Ela contém o PWA completo
(`index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`).

> Precisa ser **HTTPS** — é obrigatório para instalar como app e para notificações.
> Abrir o arquivo direto (file://) NÃO habilita instalação nem notificação.

---

## 1) Hospedar (grátis)

### Opção A — Netlify Drop (mais fácil, recomendado)
1. Acesse **https://app.netlify.com/drop**
2. Arraste a pasta **`dist`** para a área indicada.
3. Em segundos você recebe um link HTTPS (ex.: `https://algo-aleatorio.netlify.app`).
4. Para manter o link fixo e renomear: crie uma conta grátis e clique em "Claim".

### Opção B — GitHub Pages (link estável que você controla)
1. Crie um repositório no GitHub (ex.: `bebe`).
2. Suba o conteúdo da pasta `dist` para o repositório.
3. Em **Settings → Pages**, selecione a branch `main` e a pasta raiz `/`.
4. O app fica em `https://SEU-USUARIO.github.io/bebe/`.

---

## 2) Instalar no celular

### Android (Chrome)
1. Abra o link HTTPS no **Chrome**.
2. Menu **⋮ → "Instalar app"** (ou "Adicionar à tela inicial").
3. Vira um ícone na tela inicial e abre em tela cheia.
4. No app, abra **⋯ → Permitir notificações** e aceite.
   *(Opcional, com root/sideload: dá para gerar um APK em https://www.pwabuilder.com a partir do
   seu link e instalar o APK — mas o PWA instalado já funciona igual.)*

### iPhone (Safari — iOS 16.4 ou superior)
1. Abra o link HTTPS no **Safari** (precisa ser o Safari).
2. Toque em **Compartilhar** (quadrado com seta) **→ "Adicionar à Tela de Início"**.
3. Abra o app **pelo ícone** da tela inicial (não pelo Safari).
4. Em **⋯ → Permitir notificações**, aceite. *(No iOS, a notificação só funciona
   com o app aberto pelo ícone da tela inicial, nunca pela aba do Safari.)*

---

## 3) O que já funciona vs. o que falta (notificação em segundo plano)

| Situação | Status |
|---|---|
| Banner de lembrete dentro do app | ✅ Sempre |
| Notificação com o app aberto (inclusive minimizado/tela bloqueada, app vivo) | ✅ Sim (via service worker) |
| Notificação com o app **totalmente fechado** | ⏳ Precisa da **fase Web Push** (abaixo) |

### Fase Web Push (próximo passo — para notificar com o app fechado)
O `sw.js` já está **preparado** (tem o `push` handler). Falta a peça que **envia** o push
na hora certa. Opções gratuitas:
- **Cloudflare Worker** (você é dono, nada de terceiros vê os dados) — recomendado.
- **OneSignal** (free tier, mais fácil de configurar, porém é serviço de terceiro).

Quando você escolher, eu escrevo o código do lado do app (assinatura/subscription) e o do
remetente, com o passo a passo de deploy.

---

## Regerar os arquivos
Depois de qualquer alteração no código-fonte, rode:

```
powershell -ExecutionPolicy Bypass -File build.ps1
```

Isso atualiza o `DiarioDoBebe.html` (arquivo único para teste offline) e a pasta `dist/`.
