# Vespucci Beach Tuners Manager — Firebase + Cloudinary

Versão final do frontend React/Vite, mantendo a identidade visual da versão anterior e substituindo o armazenamento local por serviços compartilhados na nuvem.

## Arquitetura

- React + Vite + react-router-dom
- Firebase Authentication: login por ID + senha (internamente `ID@vespucci.local`)
- Cloud Firestore: usuários, clientes, serviços, preços e avisos
- Cloudinary: fotos de perfil, V-Tuning e veículo
- Vercel: hospedagem do frontend

## Rodar localmente

1. Instale Node.js 20+.
2. Abra a pasta no VS Code.
3. Execute:

```bash
npm install
npm run dev
```

O arquivo `.env.local` já contém as configurações fornecidas para este projeto. Ele está no `.gitignore` e não deve ser enviado ao GitHub.

## Firebase já esperado

O projeto espera o Firebase `vespucci-beach-tuners` com:

- Authentication > E-mail/senha habilitado.
- Usuários iniciais já criados no Authentication e documentos correspondentes em `users/{uid}`:
  - Chico Divine — RP 194 — Dev
  - Tom Kenway — RP 3829 — Dono
  - Gael Kenway — RP 328 — Dono
- Firestore criado.

### Regras do Firestore

O arquivo `firestore.rules` na raiz contém as regras recomendadas desta versão. Copie todo o conteúdo para Firebase Console > Firestore > Regras e publique.

Essas regras impedem que um usuário altere o próprio cargo e fazem o controle de permissões no banco, além do controle visual do React.

## Cloudinary

Configuração esperada:

- Cloud name: `vzfpwybg`
- Upload preset: `vespucci_upload`
- Signing mode: `Unsigned`

O frontend nunca usa API Secret.

Recomendação adicional no painel do Cloudinary: limite o preset a imagens JPG/PNG/WebP e defina um tamanho máximo de arquivo. O React já valida formato e tamanho, mas restrições no preset adicionam uma camada extra contra uploads externos.

## Dados no Firestore

As coleções são criadas automaticamente conforme o sistema é usado:

- `users` — perfis e cargos
- `clients` — clientes
- `services` — cálculos finalizados
- `prices/config` — tabela compartilhada
- `notices` — quadro de avisos

A tabela inicial permanece como fallback no código. Quando Diretor/Dono/Dev abrir a página de preços pela primeira vez, `prices/config` é inicializado automaticamente caso ainda não exista.

## Vercel

O `vercel.json` já está configurado para SPA/React Router.

No projeto da Vercel, cadastre estas Environment Variables com os mesmos valores do `.env.local`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

Build command: `npm run build`

Output directory: `dist`

## Importante

Não há mais uso de `localStorage` para dados do sistema. A persistência de login é gerenciada pelo próprio Firebase Authentication. Usuários, clientes, serviços, preços e avisos são compartilhados entre computadores pelo Firestore.

### Domínio da Vercel no Firebase Authentication

Depois do primeiro deploy, abra Firebase Console > Authentication > Configurações > Domínios autorizados e confirme que o domínio final da Vercel está autorizado. Se não estiver, adicione, por exemplo `seu-projeto.vercel.app`.
