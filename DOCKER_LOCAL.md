# 🐳 Docker - Développement Local

## ⚠️ Important

Le fichier `docker-compose.yml` est configuré pour **Coolify (production)**.

Pour le développement local, utilisez : **`docker-compose.local.yml`**

---

## 🚀 Démarrage Rapide (Local)

### 1. Démarrer les Services

```bash
docker-compose -f docker-compose.local.yml up -d
```

Cela démarre :

- **App** (Next.js) → `http://localhost:3000`
- **PostgreSQL** → `localhost:5432`
- **Adminer** (DB UI) → `http://localhost:8080`

### 2. Voir les Logs

```bash
docker-compose -f docker-compose.local.yml logs -f app
```

### 3. Arrêter les Services

```bash
docker-compose -f docker-compose.local.yml down
```

---

## 🔧 Configuration

### Variables d'Environnement

Créez un fichier `.env.local` :

```bash
# Database locale (PostgreSQL dans Docker)
DATABASE_URL=postgresql://kazier:kazier_password@db:5432/kazier

# Auth
AUTH_SECRET=your-local-secret
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Slack (utilisez vos vrais tokens)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_ID=C0XXXXXXX
SLACK_BOSS_USER_ID=U0XXXXXXX

# App
NEXT_PUBLIC_FORM_URL=http://localhost:3000
NODE_ENV=development
```

### Base de Données Locale

**Connexion :**

- Host: `localhost`
- Port: `5432`
- User: `kazier`
- Password: `kazier_password`
- Database: `kazier`

**Adminer (Interface Web) :**

- URL: `http://localhost:8080`
- System: `PostgreSQL`
- Server: `db`
- Username: `kazier`
- Password: `kazier_password`

---

## 📝 Commandes Utiles

### Reconstruire l'Image

```bash
docker-compose -f docker-compose.local.yml build --no-cache
```

### Exécuter des Migrations

```bash
docker-compose -f docker-compose.local.yml exec app npx prisma migrate dev
```

### Ouvrir un Shell

```bash
docker-compose -f docker-compose.local.yml exec app sh
```

### Nettoyer les Volumes

```bash
docker-compose -f docker-compose.local.yml down -v
```

---

## 🆚 docker-compose.yml vs docker-compose.local.yml

| Fichier                    | Usage                    | Ports                     | Services           |
| -------------------------- | ------------------------ | ------------------------- | ------------------ |
| `docker-compose.yml`       | **Production (Coolify)** | Expose uniquement         | App                |
| `docker-compose.local.yml` | **Développement local**  | Mappés (3000, 5432, 8080) | App + DB + Adminer |

---

## 🐛 Troubleshooting

### Port 3000 déjà utilisé

```bash
# Trouver le processus
lsof -ti:3000

# Tuer le processus
kill -9 $(lsof -ti:3000)
```

### Base de données corrompue

```bash
# Supprimer les volumes
docker-compose -f docker-compose.local.yml down -v

# Redémarrer
docker-compose -f docker-compose.local.yml up -d
```

---

## 🔄 Workflow Recommandé

### Développement Local

```bash
# Option 1 : Docker (avec DB locale)
docker-compose -f docker-compose.local.yml up -d

# Option 2 : npm dev (avec DB Neon)
npm run dev
```

### Tests avant Déploiement

```bash
# Quality checks
npm run quality

# Build de production
npm run build

# Test Docker
docker-compose -f docker-compose.local.yml build
docker-compose -f docker-compose.local.yml up
```

---

## 📚 Plus d'Informations

- **Déploiement Coolify :** Voir `COOLIFY_DEPLOY.md`
- **Architecture :** Voir `QWEN.md`
- **Schéma DB :** Voir `prisma/schema.prisma`
