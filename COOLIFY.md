# 🚀 Déploiement sur Coolify

Ce guide explique comment déployer l'application Kazier sur **Coolify**, une plateforme self-hosted alternative à Vercel/Netlify.

## 📋 Prérequis

- Un serveur Coolify configuré et fonctionnel
- Accès à Coolify (interface web)
- Une base de données PostgreSQL (Neon ou hébergée sur Coolify)
- Les variables d'environnement configurées

---

## 🎯 Options de Déploiement

Coolify supporte deux méthodes de déploiement pour cette application :

### **Option 1 : Docker Compose (Recommandé)**

Utilise `docker-compose.coolify.yml` pour déployer l'application

### **Option 2 : Dockerfile Simple**

Utilise `Dockerfile.coolify` pour un déploiement minimaliste

---

## 🔧 Configuration Coolify

### 1️⃣ Créer un Nouveau Projet

1. Connectez-vous à votre interface Coolify
2. Cliquez sur **"New Resource"** → **"Application"**
3. Choisissez votre source :
   - **GitHub/GitLab** : Connectez votre dépôt
   - **Docker Compose** : Si vous utilisez `docker-compose.coolify.yml`

### 2️⃣ Configuration de Base

**Type de Build :**

- Pour Option 1 : Sélectionnez **"Docker Compose"**
- Pour Option 2 : Sélectionnez **"Dockerfile"**

**Fichiers à spécifier :**

```
Option 1 (Compose) : docker-compose.coolify.yml
Option 2 (Docker)  : Dockerfile.coolify
```

**Branche de déploiement :** `main`

**Port de l'application :** `3000`

---

## 🔐 Variables d'Environnement

Allez dans **Settings → Environment Variables** et ajoutez :

### Variables Obligatoires

```bash
# Base de données (Neon ou autre)
DATABASE_URL=postgresql://user:password@host:5432/kazier

# NextAuth
AUTH_SECRET=your-super-secret-key-min-32-chars
AUTH_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
AUTH_TRUST_HOST=true

# Slack Bot
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=C0XXXXXXX
SLACK_BOSS_USER_ID=U0XXXXXXX

# Application
NEXT_PUBLIC_FORM_URL=https://your-domain.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Variables Optionnelles

```bash
# Port personnalisé (par défaut: 3000)
PORT=3000

# Pour debugging
DEBUG=true
```

---

## 🚀 Déploiement

### Méthode 1 : Via Interface Coolify

1. Après avoir configuré le projet et les variables d'environnement
2. Cliquez sur **"Deploy"**
3. Coolify va :
   - Cloner votre dépôt
   - Builder l'image Docker
   - Exécuter les migrations Prisma
   - Démarrer le container

### Méthode 2 : Via Git Push (Auto-deploy)

Si vous avez activé **"Auto Deploy"** dans Coolify :

```bash
git add .
git commit -m "Deploy to Coolify"
git push origin main
```

Coolify détectera automatiquement le push et déploiera.

---

## 🔄 Processus de Build

Le déploiement suit ces étapes :

### Stage 1 : Installation des Dépendances

```dockerfile
# Installation de node_modules
npm ci
```

### Stage 2 : Quality Checks & Build

```dockerfile
# Génération du client Prisma
npx prisma generate

# Vérifications de qualité
npm run lint
npm run type-check
npm run format:check

# Build Next.js
npm run build
```

### Stage 3 : Exécution en Production

```dockerfile
# Migrations Prisma (via docker-entrypoint.sh)
npx prisma migrate deploy || npx prisma db push

# Démarrage du serveur Next.js
node server.js
```

---

## 🏥 Health Check

L'application inclut un endpoint de santé :

**URL :** `/api/ping`

Coolify vérifie automatiquement la santé du container :

- Intervalle : 30s
- Timeout : 10s
- Retries : 3
- Délai de démarrage : 40s

---

## 🌐 Configuration du Domaine

### Dans Coolify :

1. Allez dans **Settings → Domains**
2. Ajoutez votre domaine : `kazier.yourdomain.com`
3. Activez **"Generate SSL Certificate"** (Let's Encrypt)
4. Coolify configurera automatiquement le reverse proxy (Traefik)

### Vérifiez vos variables :

Assurez-vous que `AUTH_URL` et `NEXTAUTH_URL` correspondent au domaine :

```bash
AUTH_URL=https://kazier.yourdomain.com
NEXTAUTH_URL=https://kazier.yourdomain.com
```

---

## 📊 Base de Données

### Option A : Base de Données Neon (Recommandé)

Utilisez votre base de données Neon existante :

```bash
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/kazier?sslmode=require
```

### Option B : PostgreSQL sur Coolify

1. Dans Coolify, créez une nouvelle **Database** → **PostgreSQL**
2. Connectez-la à votre application
3. Coolify générera automatiquement `DATABASE_URL`

---

## 🔧 Scripts de Maintenance

### Exécuter des Commandes dans le Container

Via l'interface Coolify ou SSH :

```bash
# Accéder au container
docker exec -it kazier-app sh

# Exécuter une migration manuelle
npx prisma migrate deploy

# Synchroniser la base de données
npx prisma db push

# Ouvrir Prisma Studio (si port exposé)
npx prisma studio
```

---

## 🐛 Troubleshooting

### ❌ Erreur : "Cannot find module 'server.js'"

**Solution :** Vérifiez que `output: 'standalone'` est activé dans `next.config.ts`

```typescript
// next.config.ts
const config = {
  output: "standalone", // ✅ Requis pour Docker
  // ...
};
```

### ❌ Erreur : Prisma Client non généré

**Solution :** Le Dockerfile exécute déjà `prisma generate`. Si l'erreur persiste :

```bash
# Dans le container
npx prisma generate
```

### ❌ Erreur : "P1001: Can't reach database server"

**Solution :** Vérifiez :

1. `DATABASE_URL` est correct
2. La base de données est accessible depuis le container
3. Les credentials sont valides

### ❌ Logs du Container

Dans Coolify, allez dans **Logs** pour voir les erreurs en temps réel.

---

## 🔄 Mise à Jour de l'Application

### Auto-Deploy Activé

Chaque push sur `main` déclenchera un nouveau déploiement :

```bash
git add .
git commit -m "Update feature X"
git push origin main
```

### Déploiement Manuel

Dans Coolify, cliquez sur **"Redeploy"** pour forcer un nouveau build.

---

## 📈 Performance & Scaling

### Ressources Recommandées

```yaml
CPU: 1 vCPU minimum
RAM: 2GB minimum (4GB recommandé)
Disque: 10GB minimum
```

### Configuration dans Coolify

Allez dans **Settings → Resources** pour ajuster :

- CPU limits
- Memory limits
- Replicas (pour load balancing)

---

## 🔐 Sécurité

### Variables Sensibles

❌ **NE JAMAIS** commiter :

- `.env`
- `.env.local`
- `.env.production`

✅ **Toujours** utiliser les variables d'environnement Coolify

### SSL/TLS

Coolify génère automatiquement des certificats Let's Encrypt. Assurez-vous que :

- `AUTH_TRUST_HOST=true` est défini
- Votre domaine pointe vers l'IP du serveur Coolify

---

## 📝 Commandes Utiles

### Dans le Container

```bash
# Voir les logs
docker logs -f kazier-app

# Redémarrer le container
docker restart kazier-app

# Voir les processus
docker ps | grep kazier

# Exécuter une commande
docker exec kazier-app npx prisma studio
```

### Sur le Serveur Coolify

```bash
# Voir tous les containers Coolify
docker ps

# Nettoyer les images inutilisées
docker system prune -a
```

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Consultez les logs** dans Coolify → Logs
2. **Vérifiez les variables** d'environnement
3. **Testez localement** avec Docker Compose :
   ```bash
   docker-compose -f docker-compose.coolify.yml up
   ```
4. **Ouvrez une issue** sur GitHub

---

## 🎯 Checklist de Déploiement

- [ ] Serveur Coolify configuré
- [ ] Dépôt Git connecté à Coolify
- [ ] Base de données PostgreSQL accessible
- [ ] Toutes les variables d'environnement définies
- [ ] Domaine configuré avec SSL
- [ ] Webhook Slack configuré (si applicable)
- [ ] Cron jobs configurés (remind, chase, summary)
- [ ] Test de l'application après déploiement
- [ ] Vérification des logs (pas d'erreurs)

---

## 🔗 Ressources

- [Documentation Coolify](https://coolify.io/docs)
- [Next.js Docker Deployment](https://nextjs.org/docs/app/building-your-application/deploying#docker-image)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/deployment/deployment-guides)

---

**Note :** Ce guide suppose que vous utilisez Coolify v4+. Les anciennes versions peuvent avoir une interface différente.
