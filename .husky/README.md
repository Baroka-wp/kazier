# Git Hooks - Husky

Ce dossier contient les hooks Git automatiques pour garantir la qualité du code avant chaque commit.

## Pre-commit Hook

Le hook `pre-commit` s'exécute automatiquement **avant chaque commit** et effectue les vérifications suivantes :

### 1. **Lint-Staged**

Exécute ESLint et Prettier **uniquement sur les fichiers modifiés** :

- `*.{js,jsx,ts,tsx}` → ESLint auto-fix + Prettier
- `*.{json,md,css}` → Prettier

### 2. **TypeScript Check**

Vérifie les types TypeScript sur **tout le projet** :

```bash
npm run type-check
```

## Comment ça fonctionne ?

```bash
# 1. Vous modifiez des fichiers
git add .

# 2. Vous créez un commit
git commit -m "Mon message"

# 3. Le hook s'exécute automatiquement :
#    ✅ ESLint auto-fix sur les fichiers modifiés
#    ✅ Prettier auto-format sur les fichiers modifiés
#    ✅ TypeScript check sur tout le projet

# 4a. Si tout passe ✅
#     → Le commit est créé

# 4b. Si une erreur est détectée ❌
#     → Le commit est annulé
#     → Vous devez corriger les erreurs
```

## Contourner le hook (déconseillé)

Si vous devez vraiment bypasser le hook (urgence, WIP, etc.) :

```bash
# Méthode 1 : Utiliser --no-verify
git commit -m "WIP: work in progress" --no-verify

# Méthode 2 : Désactiver temporairement
git config core.hooksPath /dev/null
git commit -m "Mon commit"
git config --unset core.hooksPath
```

⚠️ **Attention** : Contourner le hook peut introduire du code de mauvaise qualité dans le repository !

## Désactiver complètement les hooks

```bash
# Supprimer le dossier .husky
rm -rf .husky

# OU modifier package.json et supprimer le script "prepare"
```

## Réinstaller les hooks

```bash
# Après un clone ou si les hooks ne fonctionnent pas
npm install
npx husky install
```

## Commandes utiles

```bash
# Formater tout le code
npm run format

# Corriger automatiquement les erreurs ESLint
npm run lint:fix

# Vérifier les types TypeScript
npm run type-check

# Exécuter tous les checks manuellement
npm run quality
```

## Configuration

- **Husky config** : `.husky/` (ce dossier)
- **Lint-staged config** : `package.json` → `lint-staged`
- **ESLint config** : `eslint.config.mjs`
- **Prettier config** : `.prettierrc.json`
- **TypeScript config** : `tsconfig.json`
