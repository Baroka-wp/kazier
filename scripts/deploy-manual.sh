#!/bin/bash

# Script de déploiement manuel vers le VPS
# Usage: ./scripts/deploy-manual.sh

set -e

echo "🚀 Déploiement manuel vers VPS"
echo "================================"

# Variables
VPS_HOST="${VPS_HOST:-204.168.150.89}"
VPS_USER="${VPS_USER:-kazier}"
VPS_PORT="${VPS_PORT:-22}"
VPS_PATH="/home/$VPS_USER/kazier"

echo "📋 Configuration:"
echo "  Host: $VPS_HOST"
echo "  User: $VPS_USER"
echo "  Port: $VPS_PORT"
echo "  Path: $VPS_PATH"
echo ""

# Vérifier la connexion SSH
echo "🔐 Test de connexion SSH..."
if ! ssh -p $VPS_PORT -o ConnectTimeout=10 $VPS_USER@$VPS_HOST "echo 'Connexion réussie!'" 2>/dev/null; then
  echo "❌ Impossible de se connecter au VPS"
  echo "Vérifiez:"
  echo "  1. Le VPS est accessible: ping $VPS_HOST"
  echo "  2. Le port SSH est correct: $VPS_PORT"
  echo "  3. Vous avez accès: ssh -p $VPS_PORT $VPS_USER@$VPS_HOST"
  exit 1
fi

# Créer le répertoire sur le VPS
echo "📁 Création du répertoire $VPS_PATH..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"

# Copier les fichiers (excluant node_modules, .git, etc.)
echo "📦 Copie des fichiers vers le VPS..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude '.env' \
  --exclude 'postgres-data' \
  --exclude '.husky' \
  -e "ssh -p $VPS_PORT" \
  ./ $VPS_USER@$VPS_HOST:$VPS_PATH/

# Créer le docker-compose.yml
echo "🐳 Création du docker-compose.yml..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "cat > $VPS_PATH/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: kazier-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    networks:
      - kazier-network

  db:
    image: postgres:15-alpine
    container_name: kazier-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-kazier}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB:-kazier}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - kazier-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-kazier}"]
      interval: 10s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    container_name: kazier-adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    networks:
      - kazier-network
    depends_on:
      - db

networks:
  kazier-network:
    driver: bridge

volumes:
  postgres-data:
EOF

# Créer le fichier .env si nécessaire
echo "⚙️  Vérification du fichier .env..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'ENVSCRIPT'
cd kazier
if [ ! -f .env ]; then
  echo "⚠️  Le fichier .env n'existe pas!"
  echo "Créez-le avec: nano ~/kazier/.env"
  echo "Ou copiez .env.example et remplissez les valeurs"
  exit 1
fi
ENVSCRIPT

# Build et démarrer les containers
echo "🏗️  Build des containers Docker..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'BUILDSCRIPT'
cd kazier

# Arrêter les anciens containers
docker-compose down

# Build l'image
docker-compose build --no-cache

# Démarrer les containers
docker-compose up -d

# Attendre que l'app démarre
echo "⏳ Attente du démarrage..."
sleep 10

# Vérifier le statut
docker-compose ps

# Nettoyage
docker image prune -af
BUILDSCRIPT

echo ""
echo "✅ Déploiement terminé avec succès!"
echo ""
echo "🌐 URLs:"
echo "  Application: http://$VPS_HOST:3000"
echo "  Adminer: http://$VPS_HOST:8080"
echo ""
echo "📝 Logs:"
echo "  ssh -p $VPS_PORT $VPS_USER@$VPS_HOST 'cd kazier && docker-compose logs -f app'"
