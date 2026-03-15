# 🚀 Guide de Déploiement VPS - Version Simplifiée

Ce guide explique le déploiement automatique de Kazier sur votre VPS en utilisant GitHub Container Registry (GHCR).

## 📋 Configuration requise

### Sur le VPS

1. **Docker et Docker Compose installés**
2. **Un utilisateur avec accès Docker** (exemple: `kazier`)
3. **SSH configuré**

### Sur GitHub

**12 Secrets à configurer dans Settings → Secrets and variables → Actions:**

| Secret                 | Valeur exemple                                | Description          |
| ---------------------- | --------------------------------------------- | -------------------- |
| `VPS_HOST`             | `204.168.150.89`                              | Adresse IP du VPS    |
| `VPS_USER`             | `kazier`                                      | Utilisateur SSH      |
| `VPS_SSH_KEY`          | `-----BEGIN...`                               | Clé SSH privée       |
| `DATABASE_URL`         | `postgresql://kazier:password@db:5432/kazier` | URL PostgreSQL       |
| `NEXTAUTH_SECRET`      | `(32+ chars)`                                 | Secret NextAuth      |
| `NEXTAUTH_URL`         | `http://204.168.150.89:3000`                  | URL publique         |
| `SLACK_BOT_TOKEN`      | `xoxb-...`                                    | Token Slack          |
| `SLACK_CHANNEL_ID`     | `C0XXXXXXX`                                   | ID channel Slack     |
| `SLACK_BOSS_USER_ID`   | `U0XXXXXXX`                                   | ID user Slack        |
| `NEXT_PUBLIC_FORM_URL` | `http://204.168.150.89:3000`                  | URL formulaire       |
| `SKIP_SLACK_SIGNATURE` | `true`                                        | Skip signature Slack |
| `POSTGRES_PASSWORD`    | `(strong password)`                           | Mot de passe DB      |

**Générer NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

---

## 🎯 Comment ça marche

### Workflow automatique

```
Push sur main → Build Docker → Push GHCR → Deploy VPS
     ↓               ↓              ↓            ↓
  GitHub         Build image    ghcr.io   Pull + Restart
```

**Étapes:**

1. **Build:** Construction de l'image Docker sur GitHub Actions
2. **Push:** Envoi de l'image vers GitHub Container Registry (ghcr.io)
3. **Deploy:** Connexion SSH au VPS, pull de l'image, redémarrage

**Temps total:** 5-10 minutes

---

## 🔧 Configuration initiale du VPS

### 1. Installer Docker

```bash
# Connectez-vous au VPS
ssh root@204.168.150.89

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installer Docker Compose
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. Créer l'utilisateur et configurer SSH

```bash
# Créer l'utilisateur
useradd -m -s /bin/bash kazier
usermod -aG docker kazier

# Créer le répertoire de l'application
mkdir -p /opt/kazier
chown -R kazier:kazier /opt/kazier

# Générer la clé SSH pour GitHub Actions
sudo -u kazier ssh-keygen -t ed25519 -f /home/kazier/.ssh/github_actions -N ""

# Ajouter la clé publique aux authorized_keys
cat /home/kazier/.ssh/github_actions.pub >> /home/kazier/.ssh/authorized_keys
chmod 600 /home/kazier/.ssh/authorized_keys

# Afficher la clé PRIVÉE (à copier dans GitHub Secrets > VPS_SSH_KEY)
cat /home/kazier/.ssh/github_actions
```

⚠️ **Copiez la clé privée complète** (incluant `-----BEGIN` et `-----END`)

### 3. Ouvrir les ports du firewall

```bash
# Autoriser les ports nécessaires
ufw allow 22/tcp    # SSH
ufw allow 3000/tcp  # Application
ufw allow 8080/tcp  # Adminer
ufw enable
```

---

## 🚀 Déploiement

### Premier déploiement

1. **Vérifiez les secrets GitHub** (Settings → Secrets → Actions)
2. **Push sur main:**
   ```bash
   git add .
   git commit -m "Setup: Deploy to VPS"
   git push origin main
   ```
3. **Surveillez:** GitHub → Actions → Build & Deploy
4. **Vérifiez:**
   - Application: http://204.168.150.89:3000
   - Adminer: http://204.168.150.89:8080

### Déploiements suivants

Chaque push sur `main` déclenche automatiquement le déploiement!

### Déploiement manuel

1. GitHub → **Actions**
2. **Build & Deploy** → Run workflow
3. Sélectionner `main` → Run workflow

---

## 📂 Structure sur le VPS

```
/opt/kazier/
├── docker-compose.yml    # Copié depuis docker-compose.prod.yml
├── .env                  # Variables d'environnement
└── postgres-data/        # Volume PostgreSQL (persistant)
```

---

## 🔍 Commandes utiles

### Voir les logs

```bash
ssh kazier@204.168.150.89
cd /opt/kazier

# Logs de l'application
docker compose logs -f app

# Logs de la base de données
docker compose logs -f db

# Tous les logs
docker compose logs -f
```

### Redémarrer l'application

```bash
ssh kazier@204.168.150.89
cd /opt/kazier
docker compose restart app
```

### Vérifier le statut

```bash
ssh kazier@204.168.150.89
cd /opt/kazier
docker compose ps
```

### Mettre à jour manuellement

```bash
ssh kazier@204.168.150.89
cd /opt/kazier

# Pull la dernière image
docker compose pull

# Redémarrer
docker compose up -d
```

---

## 🗄️ Adminer (Interface DB)

Accédez à Adminer: **http://204.168.150.89:8080**

**Connexion:**

- Système: `PostgreSQL`
- Serveur: `db`
- Utilisateur: `kazier`
- Mot de passe: `(votre POSTGRES_PASSWORD)`
- Base de données: `kazier`

---

## 🐛 Dépannage

### Le déploiement échoue

1. **Vérifiez les secrets GitHub** (12 secrets requis)
2. **Vérifiez la connexion SSH:**
   ```bash
   ssh kazier@204.168.150.89
   ```
3. **Vérifiez les logs GitHub Actions**

### L'application ne démarre pas

```bash
ssh kazier@204.168.150.89
cd /opt/kazier

# Vérifiez les logs
docker compose logs app

# Vérifiez le fichier .env
cat .env
```

### Erreur "Permission denied" Docker

```bash
ssh root@204.168.150.89
usermod -aG docker kazier
# Déconnectez et reconnectez l'utilisateur kazier
```

---

## 🔐 Sécurité

### Configurer HTTPS (optionnel)

```bash
# Installer Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Obtenir un certificat SSL
certbot --nginx -d votre-domaine.com
```

### Sauvegarder la base de données

```bash
ssh kazier@204.168.150.89
cd /opt/kazier

# Créer une sauvegarde
docker compose exec db pg_dump -U kazier kazier > backup-$(date +%Y%m%d).sql
```

---

## ✨ Avantages de cette approche

- ✅ **Build sur GitHub Actions** (pas sur le VPS = plus rapide)
- ✅ **Image optimisée** stockée sur GHCR
- ✅ **Déploiement instantané** (juste un pull + restart)
- ✅ **Rollback facile** (en changeant la version de l'image)
- ✅ **Pas de conflits** avec d'autres Docker sur le VPS
- ✅ **Isolation complète** (réseau, volumes séparés)

---

## 📊 Différence avec le déploiement local

| Aspect              | Déploiement GHCR (Production) | Build local (Dev) |
| ------------------- | ----------------------------- | ----------------- |
| Build location      | GitHub Actions                | VPS               |
| Image source        | ghcr.io                       | Build local       |
| Temps déploiement   | ~5-10 min                     | ~3-7 min          |
| Utilisation CPU VPS | Faible                        | Élevée (build)    |
| Rollback            | Facile                        | Difficile         |
| Multi-environnement | Oui                           | Non               |

---

**Happy deploying! 🚀**
