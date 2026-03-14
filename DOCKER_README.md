# 🐳 Docker Setup - Kazier

Ce document explique comment utiliser Docker pour développer et déployer l'application Kazier.

## 📋 Prérequis

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Node.js 20+ (pour le développement local)

## 🚀 Démarrage rapide

### 1. Installation des dépendances

```bash
npm install
```

### 2. Build avec Docker

```bash
# Build de l'image Docker
docker build -t kazier:latest .

# Ou utiliser Docker Compose
docker-compose build
```

### 3. Lancer l'application

```bash
# Avec Docker Compose (recommandé)
docker-compose up -d

# Ou avec Docker directement
docker run -p 3000:3000 --env-file .env kazier:latest
```

L'application sera accessible sur http://localhost:3000

## 🔍 Quality Checks

Avant chaque build Docker, les checks suivants sont automatiquement exécutés :

### 1. **ESLint** - Vérification du code
```bash
npm run lint
```

### 2. **TypeScript** - Vérification des types
```bash
npm run type-check
```

### 3. **Prettier** - Vérification du formatage
```bash
npm run format:check
```

### 4. **Tous les checks ensemble**
```bash
npm run quality
```

## 🔧 Commandes utiles

### Développement

```bash
# Lancer en mode dev (sans Docker)
npm run dev

# Formater le code
npm run format

# Corriger les erreurs ESLint automatiquement
npm run lint:fix
```

### Docker

```bash
# Voir les logs
docker-compose logs -f app

# Arrêter les conteneurs
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Reconstruire l'image
docker-compose build --no-cache
```

### Prisma

```bash
# Générer le client Prisma
npx prisma generate

# Push du schéma vers la DB
npx prisma db push

# Ouvrir Prisma Studio
npx prisma studio
```

## 📦 Structure Docker

### Dockerfile (Multi-stage)

1. **Stage deps** : Installation des dépendances
2. **Stage builder** :
   - Génération Prisma Client
   - Exécution des quality checks
   - Build de l'application
3. **Stage runner** : Image de production optimisée

### docker-compose.yml

Services inclus :
- **app** : Application Next.js
- **db** : PostgreSQL (optionnel pour dev local)
- **adminer** : Interface web DB (http://localhost:8080)

## 🔄 CI/CD - GitHub Actions

Le workflow `.github/workflows/ci.yml` s'exécute automatiquement sur :
- Chaque Pull Request vers `main` ou `develop`
- Chaque push sur `main` ou `develop`

### Jobs CI

1. **quality-checks**
   - ESLint
   - TypeScript check
   - Prettier check

2. **build**
   - Build de l'application Next.js

3. **docker-build**
   - Test du build Docker

## ⚙️ Variables d'environnement

Créez un fichier `.env` à la racine avec :

```env
# Database
DATABASE_URL=postgresql://...

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C0XXXXXXX
SLACK_BOSS_USER_ID=U0XXXXXXX

# App
NEXT_PUBLIC_FORM_URL=https://rapportjournalier.vercel.app
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

## 🐛 Dépannage

### Problème : "Quality checks failed"

```bash
# Corriger automatiquement les problèmes de formatage
npm run format

# Corriger les erreurs ESLint
npm run lint:fix

# Vérifier les erreurs TypeScript
npm run type-check
```

### Problème : "Prisma Client not generated"

```bash
npx prisma generate
```

### Problème : "Port 3000 already in use"

```bash
# Tuer le processus sur le port 3000
lsof -ti:3000 | xargs kill -9

# Ou changer le port dans docker-compose.yml
ports:
  - "3001:3000"
```

## 📚 Ressources

- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Docker](https://docs.docker.com/)
- [Documentation Prisma](https://www.prisma.io/docs)
- [ESLint](https://eslint.org/docs/latest/)
- [Prettier](https://prettier.io/docs/en/)

## 🎯 Bonnes pratiques

1. ✅ Toujours exécuter `npm run quality` avant de commit
2. ✅ Utiliser `npm run format` pour formater le code
3. ✅ Tester le build Docker localement avant de push
4. ✅ Vérifier que les tests CI passent sur GitHub
5. ✅ Garder les images Docker légères (utiliser .dockerignore)
