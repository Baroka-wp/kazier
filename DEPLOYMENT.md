# Guide de Déploiement sur VPS

Ce guide explique comment configurer le déploiement automatique de Kazier sur votre VPS (204.168.150.89).

## 🚀 Comment ça marche

Le déploiement se fait **directement sur le VPS** sans utiliser de registry Docker:

```
Push sur main → Quality Checks → Copy vers VPS → Build sur VPS → Start Containers
     ↓               ↓                  ↓               ↓               ↓
  GitHub         lint+tsc+fmt        SCP/SSH      docker build   docker-compose up
```

**Avantages:**

- ✅ Pas besoin de registry Docker (GHCR, Docker Hub, etc.)
- ✅ Build optimisé pour le CPU du VPS
- ✅ Fichiers .env restent sur le VPS (sécurité)
- ✅ Plus simple et direct

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration du VPS](#configuration-du-vps)
3. [Configuration GitHub](#configuration-github)
4. [Déploiement](#déploiement)
5. [Maintenance](#maintenance)

---

## 🔧 Prérequis

- Un VPS avec Ubuntu 20.04+ ou Debian 11+
- Accès SSH root au VPS
- Un compte GitHub avec accès au repository
- Docker et Docker Compose (installés automatiquement)

---

## 🖥️ Configuration du VPS

### Méthode 1: Script automatique (Recommandé)

Connectez-vous à votre VPS via SSH:

```bash
ssh root@204.168.150.89
```

Puis exécutez le script de configuration:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/kazier/main/scripts/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
sudo bash setup-vps.sh
```

Le script va:

- ✅ Installer Docker et Docker Compose
- ✅ Créer l'utilisateur de déploiement
- ✅ Configurer le firewall
- ✅ (Optionnel) Installer et configurer Nginx
- ✅ Générer une clé SSH pour GitHub Actions

⚠️ **IMPORTANT**: Copiez la clé SSH privée affichée à la fin du script!

### Méthode 2: Configuration manuelle

Si vous préférez configurer manuellement:

```bash
# Mise à jour du système
apt-get update && apt-get upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Installation de Docker Compose
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Créer l'utilisateur de déploiement
useradd -m -s /bin/bash kazier
usermod -aG docker kazier

# Créer le répertoire de l'application
mkdir -p /home/kazier/kazier
chown -R kazier:kazier /home/kazier/kazier

# Générer la clé SSH pour GitHub Actions
sudo -u kazier ssh-keygen -t ed25519 -f /home/kazier/.ssh/github_actions -N ""
cat /home/kazier/.ssh/github_actions.pub >> /home/kazier/.ssh/authorized_keys
chmod 600 /home/kazier/.ssh/authorized_keys

# Afficher la clé privée (à copier dans GitHub Secrets)
sudo -u kazier cat /home/kazier/.ssh/github_actions
```

---

## ⚙️ Configuration GitHub

### 1. Configurer les Secrets GitHub

Allez dans **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Ajoutez les secrets suivants:

#### Secrets VPS

| Secret            | Valeur                                   | Description                          |
| ----------------- | ---------------------------------------- | ------------------------------------ |
| `VPS_HOST`        | `204.168.150.89`                         | Adresse IP du VPS                    |
| `VPS_USER`        | `kazier`                                 | Utilisateur SSH (créé par le script) |
| `VPS_PORT`        | `22`                                     | Port SSH (optionnel, défaut: 22)     |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Clé SSH privée copiée depuis le VPS  |

#### Secrets Application

| Secret                 | Valeur                                        | Comment générer              |
| ---------------------- | --------------------------------------------- | ---------------------------- |
| `DATABASE_URL`         | `postgresql://kazier:PASSWORD@db:5432/kazier` | Remplacer PASSWORD           |
| `AUTH_SECRET`          | `...`                                         | `openssl rand -base64 32`    |
| `AUTH_URL`             | `https://team.irotoribaroka.com`              | URL publique de l'app        |
| `SLACK_BOT_TOKEN`      | `xoxb-...`                                    | Depuis Slack API             |
| `SLACK_CHANNEL_ID`     | `C0XXXXXXX`                                   | ID du channel Slack          |
| `SLACK_BOSS_USER_ID`   | `U0XXXXXXX`                                   | ID Slack du boss             |
| `NEXT_PUBLIC_FORM_URL` | `https://team.irotoribaroka.com`              | URL publique du formulaire   |
| `POSTGRES_PASSWORD`    | `...`                                         | Mot de passe PostgreSQL fort |

**⚠️ IMPORTANT - NextAuth v5:**

NextAuth v5 utilise de nouvelles variables d'environnement :

- ✅ `AUTH_SECRET` (remplace `NEXTAUTH_SECRET`)
- ✅ `AUTH_URL` (remplace `NEXTAUTH_URL`)
- ✅ `AUTH_TRUST_HOST=true` (automatiquement défini dans le workflow pour les déploiements derrière proxy)

**Générer AUTH_SECRET:**

```bash
openssl rand -base64 32
```

### 2. Vérifier le workflow

Le workflow est configuré dans `.github/workflows/ci.yml` (job `deploy`) et se déclenche:

- ✅ Automatiquement à chaque push sur `main` (après les quality checks)
- ✅ Ne se déclenche PAS sur les autres branches (develop, feature, etc.)

---

## 🚀 Déploiement

### Premier déploiement

1. **Commitez vos changements:**

   ```bash
   git add .
   git commit -m "Setup: Configuration déploiement VPS"
   git push origin main
   ```

2. **Surveillez le déploiement:**
   - Allez dans l'onglet **Actions** sur GitHub
   - Cliquez sur le workflow en cours
   - Suivez les logs en temps réel

3. **Vérifiez l'application:**
   - Application: http://204.168.150.89:3000
   - Adminer: http://204.168.150.89:8080

### Déploiements suivants

Le déploiement est **automatique** à chaque push sur `main`!

### Déploiement manuel

Vous pouvez aussi déclencher un déploiement manuel:

1. Allez dans **Actions** → **CI - Quality Checks**
2. Cliquez sur **Run workflow**
3. Sélectionnez la branche `main`
4. Cliquez sur **Run workflow**

Le job `deploy` se lancera automatiquement si les quality checks passent.

---

## 🔍 Vérification et Tests

### Sur le VPS

Connectez-vous au VPS et vérifiez:

```bash
ssh kazier@204.168.150.89

# Vérifier les containers
cd ~/kazier
docker-compose ps

# Vérifier les logs
docker-compose logs -f app

# Vérifier la base de données
docker-compose logs -f db
```

### Depuis votre navigateur

- **Application:** http://204.168.150.89:3000
- **Adminer:** http://204.168.150.89:8080
  - Système: PostgreSQL
  - Serveur: db
  - Utilisateur: kazier
  - Mot de passe: (celui dans POSTGRES_PASSWORD)
  - Base de données: kazier

---

## 🔧 Maintenance

### Voir les logs

```bash
ssh kazier@204.168.150.89
cd ~/kazier

# Logs de l'application
docker-compose logs -f app

# Logs de la base de données
docker-compose logs -f db

# Tous les logs
docker-compose logs -f
```

### Redémarrer l'application

```bash
ssh kazier@204.168.150.89
cd ~/kazier
docker-compose restart app
```

### Mettre à jour manuellement

```bash
ssh kazier@204.168.150.89
cd ~/kazier

# Pull la dernière image
docker pull ghcr.io/YOUR_USERNAME/kazier:latest

# Redémarrer
docker-compose down
docker-compose up -d
```

### Nettoyer les images inutilisées

```bash
ssh kazier@204.168.150.89
docker system prune -af
```

### Sauvegarder la base de données

```bash
ssh kazier@204.168.150.89
cd ~/kazier

# Créer une sauvegarde
docker-compose exec db pg_dump -U kazier kazier > backup-$(date +%Y%m%d-%H%M%S).sql

# Restaurer une sauvegarde
docker-compose exec -T db psql -U kazier kazier < backup-YYYYMMDD-HHMMSS.sql
```

---

## 🔐 Sécurité

### Configurer HTTPS avec Let's Encrypt (Recommandé)

```bash
ssh root@204.168.150.89

# Installer Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtenir un certificat (remplacer par votre domaine)
certbot --nginx -d votre-domaine.com

# Le renouvellement est automatique via cron
```

### Configurer le firewall

```bash
ssh root@204.168.150.89

# Vérifier le statut
ufw status

# Autoriser uniquement les ports nécessaires
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

---

## 🐛 Dépannage

### Le déploiement échoue

1. **Vérifiez les secrets GitHub:**
   - Tous les secrets sont bien configurés?
   - La clé SSH est correcte?

2. **Vérifiez la connexion SSH:**

   ```bash
   ssh kazier@204.168.150.89
   ```

3. **Vérifiez les logs GitHub Actions:**
   - Allez dans Actions → cliquez sur le workflow échoué
   - Lisez les logs d'erreur

### L'application ne démarre pas

1. **Vérifiez les logs:**

   ```bash
   ssh kazier@204.168.150.89
   cd ~/kazier
   docker-compose logs app
   ```

2. **Vérifiez les variables d'environnement:**

   ```bash
   cat .env
   ```

3. **Redémarrez les containers:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Problème de connexion à la base de données

1. **Vérifiez que PostgreSQL est démarré:**

   ```bash
   docker-compose ps db
   ```

2. **Vérifiez les logs:**

   ```bash
   docker-compose logs db
   ```

3. **Testez la connexion:**
   ```bash
   docker-compose exec db psql -U kazier -d kazier
   ```

---

## 📚 Ressources

- [Documentation Docker](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

## 🎉 Félicitations!

Votre application Kazier est maintenant déployée automatiquement sur votre VPS!

Chaque fois que vous pushez sur `main`, une nouvelle version est automatiquement:

1. ✅ Testée (lint, type-check, format)
2. ✅ Buildée avec Next.js
3. ✅ Copiée vers le VPS via SCP
4. ✅ Buildée avec Docker sur le VPS
5. ✅ Déployée (containers redémarrés)

**Temps de déploiement:** 3-7 minutes
**Happy coding! 🚀**
