#!/bin/bash

# Script de configuration initiale du VPS pour Kazier
# Usage: bash <(curl -s https://raw.githubusercontent.com/YOUR_USERNAME/kazier/main/scripts/setup-vps.sh)

set -e

echo "🚀 Configuration du VPS pour Kazier"
echo "======================================"

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté en tant que root"
  echo "Utilisez: sudo bash setup-vps.sh"
  exit 1
fi

# Mise à jour du système
echo "📦 Mise à jour du système..."
apt-get update
apt-get upgrade -y

# Installation de Docker
echo "🐳 Installation de Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
  systemctl enable docker
  systemctl start docker
else
  echo "✅ Docker déjà installé"
fi

# Installation de Docker Compose
echo "📦 Installation de Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
  curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
else
  echo "✅ Docker Compose déjà installé"
fi

# Création de l'utilisateur pour le déploiement (si nécessaire)
DEPLOY_USER=${1:-kazier}
if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "👤 Création de l'utilisateur $DEPLOY_USER..."
  useradd -m -s /bin/bash $DEPLOY_USER
  usermod -aG docker $DEPLOY_USER
else
  echo "✅ Utilisateur $DEPLOY_USER existe déjà"
fi

# Création du répertoire de l'application
APP_DIR="/home/$DEPLOY_USER/kazier"
echo "📁 Création du répertoire $APP_DIR..."
mkdir -p $APP_DIR
chown -R $DEPLOY_USER:$DEPLOY_USER $APP_DIR

# Configuration du firewall (UFW)
echo "🔥 Configuration du firewall..."
if command -v ufw &> /dev/null; then
  ufw --force enable
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP
  ufw allow 443/tcp   # HTTPS
  ufw allow 3000/tcp  # App Next.js
  ufw allow 8080/tcp  # Adminer
  echo "✅ Firewall configuré"
else
  echo "⚠️  UFW n'est pas installé, installation..."
  apt-get install -y ufw
  ufw --force enable
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 3000/tcp
  ufw allow 8080/tcp
fi

# Installation de Nginx (optionnel, pour reverse proxy)
read -p "🌐 Voulez-vous installer Nginx comme reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📦 Installation de Nginx..."
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx

  # Configuration basique de Nginx
  cat > /etc/nginx/sites-available/kazier << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $http_x_forwarded_for;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /adminer {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/kazier /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo "✅ Nginx configuré"
fi

# Génération de la clé SSH pour GitHub Actions
echo ""
echo "🔑 Configuration SSH pour GitHub Actions"
echo "========================================"
SSH_KEY_PATH="/home/$DEPLOY_USER/.ssh/github_actions"

if [ ! -f "$SSH_KEY_PATH" ]; then
  echo "Génération d'une nouvelle clé SSH..."
  sudo -u $DEPLOY_USER mkdir -p /home/$DEPLOY_USER/.ssh
  sudo -u $DEPLOY_USER ssh-keygen -t ed25519 -f $SSH_KEY_PATH -N "" -C "github-actions@kazier"

  # Ajouter la clé publique aux authorized_keys
  cat ${SSH_KEY_PATH}.pub >> /home/$DEPLOY_USER/.ssh/authorized_keys
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
  chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh/authorized_keys
fi

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📋 Étapes suivantes:"
echo "==================="
echo ""
echo "1. Copiez cette clé SSH privée et ajoutez-la dans GitHub Secrets (SSH_PRIVATE_KEY):"
echo "---"
sudo -u $DEPLOY_USER cat $SSH_KEY_PATH
echo "---"
echo ""
echo "2. Configurez les secrets GitHub:"
echo "   - VPS_HOST: 204.168.150.89"
echo "   - VPS_USER: $DEPLOY_USER"
echo "   - VPS_PORT: 22"
echo "   - DATABASE_URL: postgresql://user:password@db:5432/kazier"
echo "   - NEXTAUTH_SECRET: (générez avec: openssl rand -base64 32)"
echo "   - NEXTAUTH_URL: http://204.168.150.89:3000"
echo "   - SLACK_BOT_TOKEN: xoxb-..."
echo "   - SLACK_CHANNEL_ID: C0XXXXXXX"
echo "   - SLACK_BOSS_USER_ID: U0XXXXXXX"
echo "   - NEXT_PUBLIC_FORM_URL: http://204.168.150.89:3000"
echo "   - POSTGRES_PASSWORD: (générez un mot de passe fort)"
echo ""
echo "3. URLs de l'application:"
echo "   - Application: http://204.168.150.89:3000"
echo "   - Adminer: http://204.168.150.89:8080"
echo ""
echo "🎉 Le VPS est prêt pour le déploiement automatique!"
