# Fase 0 — Setup do ambiente (Android) e início do projeto Flutter

Objetivo desta fase: ter o **Flutter rodando**, um **projeto criado** e a **lógica de domínio
portada com testes passando** (`flutter test`). iOS fica para depois (exige Mac).

Você tem: `git` ✅, `winget` ✅. Falta: Flutter SDK, Android Studio (traz o Android SDK + emulador + JDK).
O `java8` que aparece no PATH pode ser ignorado — o Flutter usa o JDK do Android Studio.

---

## 1) Instalar o Flutter SDK
No PowerShell:
```
git clone https://github.com/flutter/flutter.git -b stable C:\src\flutter
```
Depois adicione **`C:\src\flutter\bin`** ao PATH do usuário:
- Iniciar → "Editar as variáveis de ambiente do sistema" → **Variáveis de Ambiente** →
  em *Variáveis de usuário*, edite **Path** → **Novo** → `C:\src\flutter\bin` → OK.
- **Feche e reabra** o PowerShell e teste: `flutter --version`.

## 2) Instalar o Android Studio (traz Android SDK + emulador + JDK)
```
winget install -e --id Google.AndroidStudio
```
Abra o Android Studio e conclua o **Setup Wizard** (baixa o Android SDK, platform-tools e emulador).
Depois:
- **More Actions → SDK Manager**: confirme um "Android SDK Platform" recente instalado.
- **More Actions → Virtual Device Manager → Create Device**: escolha um **Pixel** com imagem
  de sistema recente (ex.: API 34) → Finish. Isso cria o emulador.

## 3) Aceitar licenças e checar
```
flutter doctor --android-licenses
flutter doctor
```
Resolva o que aparecer em **[✓] Android toolchain**. Pode **ignorar** os itens de iOS/Xcode
(estamos só no Android). Se reclamar de "cmdline-tools", instale por SDK Manager → SDK Tools →
"Android SDK Command-line Tools".

## 4) Editor (escolha um)
- **VS Code**: `winget install -e --id Microsoft.VisualStudioCode` e instale as extensões
  **Flutter** e **Dart**. (Recomendado — leve.)
- ou use o **Android Studio** direto (instale o plugin Flutter em Settings → Plugins).

---

## 5) Criar o projeto
Na pasta do projeto:
```
cd C:\Users\felipe.velame\Desktop\Claude
flutter create --org com.velame --project-name diario_crianca app
```
Isso cria a pasta **`app/`** com o projeto Flutter (nome do pacote `diario_crianca`,
applicationId `com.velame.diario_crianca`).
> O `applicationId` é difícil de trocar depois de publicar — se quiser outro nome de marca,
> me avise **antes** de publicar. Para desenvolver, esse serve.

## 6) Rodar o app padrão (confirma que o ambiente está ok)
Ligue o emulador (Virtual Device Manager → ▶) ou conecte um celular com **depuração USB**. Então:
```
cd app
flutter devices        # deve listar o emulador/aparelho
flutter run
```
Se abrir o app de contador padrão, **o ambiente está 100%**. 🎉

---

## 7) Adicionar nossa lógica de domínio + testes (1º código de verdade)
Na pasta `flutter_starter/` (que eu criei aqui no projeto) estão os arquivos Dart.
Copie para dentro de `app/`:
- `flutter_starter/lib/domain/`  → `app/lib/domain/`
- `flutter_starter/test/domain/` → `app/test/domain/`

Depois rode os testes (não precisa de emulador):
```
cd app
flutter test
```
**Checkpoint da Fase 0:** todos os testes verdes = a lógica que validamos no PWA
(sono cruzando meia-noite, lembrete de 3h com exceção do sono noturno, resumo do dia)
está portada e correta em Dart.

---

## Próximos passos (depois do checkpoint acima)
Assim que os testes passarem, seguimos (em incrementos que você compila/roda):
1. **Design system** (tema Material 3 + cor #7c6cf0) e navegação (`go_router` + Riverpod).
2. **Firebase** no app: `dart pub global activate flutterfire_cli` e
   `flutterfire configure --project=diario-de-rebecca` (usa o projeto atual como **dev**);
   depois criamos um projeto **prod** separado.
3. **Onboarding** (login + criar criança) e a tela **Hoje/Registrar** (grade de 1 toque).

Me avise quando o `flutter test` estiver verde (ou cole o erro) que eu sigo.
