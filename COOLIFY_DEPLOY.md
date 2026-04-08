# 🚀 Guide de Déploiement Coolify - Kazier

## ⚠️ Problème Résolu : Conflit de Port 3000

Le déploiement échouait avec l'erreur :

```
failed to bind host port 0.0.0.0:3000/tcp: address already in use
```

**Solution :** Optimiser `docker-compose.yml` pour Coolify

---

## 📁 Fichiers Docker Compose

### `docker-compose.yml` (Production - Coolify) ✅

- **Usage :** Déploiement sur Coolify
- **Ports :** Expose uniquement (pas de mapping)
- **Services :** App uniquement (DB sur Neon)
- **Reverse Proxy :** Géré par Coolify (Traefik)

### `docker-compose.local.yml` (Développement Local)

- **Usage :** Développement et tests en local
- **Ports :** Mappés (`3000:3000`, `5432:5432`, `8080:8080`)
- **Services :** App + PostgreSQL + Adminer
- **Commande :** `docker-compose -f docker-compose.local.yml up`

---

## 🔧 Configuration Coolify

### 1. Créer un Nouveau Projet

1. **Coolify Dashboard** → **New Resource** → **Application**
2. **Source :** Connectez votre dépôt GitHub
3. **Build Pack :** `Docker Compose`
4. **Compose File :** `docker-compose.yml` (par défaut)
5. **Branche :** `main`
6. **Port :** `3000`

> **Note :** Coolify utilise automatiquement `docker-compose.yml`. Le fichier a été optimisé pour la production.

### 2. Variables d'Environnement

Dans **Settings → Environment Variables**, ajoutez :

```bash
# Database (Neon)
DATABASE_URL=postgresql://user:password@host.neon.tech/db?sslmode=require

# Auth
AUTH_SECRET=your-secret-key-min-32-chars
AUTH_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
AUTH_TRUST_HOST=true

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C0XXXXXXX
SLACK_BOSS_USER_ID=U0XXXXXXX
SKIP_SLACK_SIGNATURE=true
SLACK_INVITE_LINK=https://join.slack.com/t/workspace/shared_invite/xxx

# Gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Brevo
BREVO_API_KEY=xkeysib-your-key
BREVO_SMTP_PASSWORD=xsmtpsib-your-password
BREVO_SMTP_USER=your-email@example.com

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx

# App
NEXT_PUBLIC_FORM_URL=https://your-domain.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**⚠️ Remplacez toutes les valeurs par vos vraies credentials depuis votre fichier `.env` local !**

### 3. Domaine et SSL

1. **Settings → Domains**
2. Ajoutez : `your-domain.com`
3. Activez **"Generate SSL Certificate"** (Let's Encrypt)

---

## 🚀 Déploiement

### Étape 1 : Vérifier en Local

```bash
# Quality checks
npm run quality

# Commit
git add .
git commit -m "Deploy: Coolify configuration"
git push origin main
```

### Étape 2 : Déployer sur Coolify

1. **Coolify Dashboard** → **Deploy**
2. Attendez 2-3 minutes
3. Vérifiez les logs

### Logs Attendus

```
🚀 Starting Kazier Application...
📊 Running database migrations...
✅ Database ready
🎯 Starting Next.js server...
```

---

## ✅ Vérification Post-Déploiement

### 1. Tester l'Application

```bash
curl https://your-domain.com/api/ping
# Devrait retourner: {"status":"ok"}
```

### 2. Tester le Formulaire

Visitez : `https://your-domain.com`

---

## 🆘 Troubleshooting

### ❌ Erreur : "address already in use"

**Solution :** ✅ Résolu ! Le fichier `docker-compose.yml` a été mis à jour :

- Utilise `expose: 3000` au lieu de `ports: 3000:3000`
- Coolify gère le reverse proxy automatiquement

### ❌ Erreur : "Cannot connect to database"

**Solution :**

1. Vérifiez `DATABASE_URL` dans les variables d'environnement
2. Format : `postgresql://user:pass@host:5432/db?sslmode=require`

### ❌ Services `db` et `adminer` démarrent

**Solution :** ✅ Résolu ! Les services DB et Adminer ont été supprimés de `docker-compose.yml`.

---

## 🔄 Déploiements Futurs

### Auto-Deploy

Activez **"Auto Deploy"** dans Coolify :

```bash
npm run quality
git add .
git commit -m "Feature: ..."
git push origin main  # Auto-deploy
```

---

## 📊 Différences Clés

| Aspect       | docker-compose.local.yml | docker-compose.yml      |
| ------------ | ------------------------ | ----------------------- |
| **Ports**    | `3000:3000` (mappés)     | `expose: 3000` (expose) |
| **Services** | App + DB + Adminer       | App uniquement          |
| **Usage**    | Local (dev/test)         | Production (Coolify)    |

---

## 📝 Checklist Finale

- [ ] Coolify configuré avec docker-compose.yml
- [ ] Toutes les variables d'env ajoutées
- [ ] Domaine configuré avec SSL
- [ ] Application accessible
- [ ] `/api/ping` retourne OK
- [ ] Migrations DB exécutées

---

Pour plus de détails sur le développement local, voir `DOCKER_LOCAL.md`.
