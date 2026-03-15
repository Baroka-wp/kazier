# 📘 Guide CI/CD - Kazier (Pour l'équipe)

## 🎯 Résumé Exécutif

Kazier dispose maintenant d'un **pipeline CI/CD automatique** qui :

- ✅ Vérifie automatiquement la qualité du code à chaque push
- ✅ Build et teste l'application
- ✅ Déploie automatiquement sur le VPS de production (204.168.150.89)
- ✅ Utilise GitHub Container Registry (GHCR) pour stocker les images Docker

**Temps total du déploiement** : ~5-10 minutes après un push sur `main`

---

## 🔄 Comment ça fonctionne maintenant

### Workflow automatique

```
┌─────────────────┐
│  Developer      │
│  git push main  │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow                   │
│                                                        │
│  1️⃣ Quality Checks (ESLint + TypeScript + Prettier)  │
│         ↓                                              │
│  2️⃣ Build Next.js                                     │
│         ↓                                              │
│  3️⃣ Build Docker Image → Push to GHCR               │
│         ↓                                              │
│  4️⃣ Deploy to VPS (Pull + Restart)                   │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   VPS Running   │
│  Port 3000      │
└─────────────────┘
```

### Déclenchement automatique

Le workflow se déclenche automatiquement dans les cas suivants :

1. **Push sur `main`** → Déploiement complet
2. **Push sur d'autres branches** → Seulement quality checks + build (pas de déploiement)
3. **Pull Request** → Quality checks + build (pas de déploiement)

---

## 📋 Les 4 Étapes du Pipeline

### 1️⃣ Quality Checks (~2 min)

**Ce qui est vérifié :**

- **ESLint** : Détection des erreurs de code et mauvaises pratiques
- **TypeScript** : Vérification des types
- **Prettier** : Formatage du code

**Commande locale équivalente :**

```bash
npm run quality
```

**⚠️ Si cette étape échoue** : Le workflow s'arrête, aucun déploiement n'est effectué.

### 2️⃣ Build Next.js (~3 min)

**Ce qui est vérifié :**

- Compilation de l'application Next.js
- Génération du client Prisma
- Vérification que le code compile sans erreurs

**Commande locale équivalente :**

```bash
npm run build
```

**⚠️ Si cette étape échoue** : Le workflow s'arrête.

### 3️⃣ Build Docker & Push GHCR (~3-5 min)

**Ce qui se passe :**

- Construction de l'image Docker multi-stage
- Quality checks intégrés dans l'image
- Push de l'image vers GitHub Container Registry (ghcr.io)
- Tag de l'image : `ghcr.io/baroka-wp/kazier:latest`

**⚠️ Conditions :**

- **Uniquement sur la branche `main`**
- Nécessite que les étapes 1 et 2 aient réussi

**Commande locale équivalente :**

```bash
docker build -t kazier:test .
```

### 4️⃣ Deploy to VPS (~1-2 min)

**Ce qui se passe :**

1. Connexion SSH au VPS (204.168.150.89)
2. Création/mise à jour du fichier `.env` avec les variables d'environnement
3. Copie du `docker-compose.prod.yml`
4. Pull de la nouvelle image depuis GHCR
5. Redémarrage des conteneurs Docker
6. Nettoyage des anciennes images

**⚠️ Conditions :**

- **Uniquement sur la branche `main`**
- Nécessite que l'étape 3 ait réussi

---

## 👨‍💻 Workflow de Développement

### Scénario 1 : Développement sur une branche feature

```bash
# 1. Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# 2. Développer et tester localement
npm run dev

# 3. Avant de commit, vérifier la qualité
npm run quality

# 4. Commit (le hook pre-commit va s'exécuter automatiquement)
git add .
git commit -m "Feat: Ajout de la nouvelle fonctionnalité"

# 5. Push
git push origin feature/nouvelle-fonctionnalite

# 6. Créer une Pull Request sur GitHub
# → Les quality checks + build s'exécutent automatiquement
# → Pas de déploiement sur cette branche
```

### Scénario 2 : Merge sur main (Déploiement)

```bash
# 1. Merge de la PR sur GitHub
# → Le workflow complet s'exécute automatiquement

# 2. Surveiller le déploiement
# → Aller sur GitHub → Actions
# → Voir les logs en temps réel

# 3. Vérifier l'application
# → http://204.168.150.89:3000
```

### Scénario 3 : Hotfix urgent

```bash
# 1. Créer une branche depuis main
git checkout main
git pull
git checkout -b hotfix/correction-urgente

# 2. Faire la correction

# 3. Tester localement
npm run quality
npm run dev

# 4. Commit et push
git add .
git commit -m "Fix: Correction urgente du bug XYZ"
git push origin hotfix/correction-urgente

# 5. Merge rapide sur main (ou via PR)
git checkout main
git merge hotfix/correction-urgente
git push origin main

# → Déploiement automatique en 5-10 minutes
```

---

## 🪝 Git Hooks Automatiques (Husky)

Un **hook pre-commit** s'exécute automatiquement avant chaque commit :

### Ce que fait le hook

1. **ESLint auto-fix** sur les fichiers modifiés
2. **Prettier auto-format** sur les fichiers modifiés
3. **TypeScript check** complet

### Que faire si le hook bloque le commit ?

```bash
# Option 1 : Corriger les erreurs (RECOMMANDÉ)
npm run lint:fix        # Corriger ESLint
npm run format          # Formater le code
npm run type-check      # Voir les erreurs TypeScript

# Option 2 : Bypass le hook (DÉCONSEILLÉ)
git commit -m "WIP" --no-verify
```

**⚠️ Important** : Si vous bypass le hook, le workflow GitHub Actions va échouer !

---

## 📊 Surveillance du Pipeline

### Voir les logs en temps réel

1. Aller sur **GitHub** → Onglet **Actions**
2. Cliquer sur le workflow en cours
3. Cliquer sur chaque job pour voir les logs détaillés

### Comprendre les statuts

| Icône | Statut   | Description                                    |
| ----- | -------- | ---------------------------------------------- |
| 🟡    | En cours | Le workflow est en train de s'exécuter         |
| ✅    | Succès   | Tout s'est bien passé                          |
| ❌    | Échec    | Une étape a échoué                             |
| ⏭️    | Skipped  | Étape ignorée (ex: deploy sur branche != main) |

### Notifications

GitHub envoie automatiquement des notifications si :

- ✅ Le déploiement réussit
- ❌ Le déploiement échoue

---

## 🔍 Commandes Utiles

### Développement Local

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev
npm run dev

# Vérifier la qualité du code
npm run quality

# Auto-corriger ESLint
npm run lint:fix

# Formater le code
npm run format

# Vérifier les types TypeScript
npm run type-check

# Build local
npm run build
```

### Docker Local

```bash
# Build l'image Docker localement
docker build -t kazier:test .

# Lancer avec Docker Compose
docker-compose up -d

# Voir les logs
docker-compose logs -f app

# Arrêter
docker-compose down
```

### VPS (SSH)

```bash
# Se connecter au VPS
ssh kazier@204.168.150.89

# Voir les conteneurs
docker ps

# Voir les logs de l'app
cd /opt/kazier
docker compose logs -f app

# Voir les logs de la DB
docker compose logs -f db

# Redémarrer l'app
docker compose restart app

# Vérifier l'espace disque
df -h
```

---

## 🚨 Résolution de Problèmes

### Le workflow GitHub Actions échoue

#### 1. Quality Checks échoue

**Problème** : ESLint, TypeScript ou Prettier erreurs

**Solution** :

```bash
# Voir les erreurs localement
npm run quality

# Auto-corriger
npm run lint:fix
npm run format

# Commit et push à nouveau
git add .
git commit -m "Fix: Correction des quality checks"
git push
```

#### 2. Build Next.js échoue

**Problème** : Erreur de compilation

**Solution** :

```bash
# Tester le build localement
npm run build

# Corriger les erreurs affichées
# Commit et push
```

#### 3. Docker Build échoue

**Problème** : Erreur lors de la construction de l'image Docker

**Solution** :

```bash
# Tester le build Docker localement
docker build -t kazier:test .

# Si package-lock.json désynchronisé
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Fix: Régénération package-lock.json"
git push
```

#### 4. Deploy échoue

**Problèmes possibles** :

- Secrets GitHub non configurés
- VPS inaccessible
- Erreur de démarrage de l'application

**Solutions** :

```bash
# Vérifier les secrets GitHub
# Settings → Secrets and variables → Actions

# Tester la connexion SSH
ssh kazier@204.168.150.89

# Voir les logs sur le VPS
ssh kazier@204.168.150.89
cd /opt/kazier
docker compose logs -f
```

### L'application ne démarre pas sur le VPS

**Diagnostic** :

```bash
# Se connecter au VPS
ssh kazier@204.168.150.89
cd /opt/kazier

# Vérifier les conteneurs
docker compose ps

# Voir les logs d'erreur
docker compose logs app

# Vérifier les variables d'environnement
cat .env

# Redémarrer
docker compose restart app
```

---

## 🔐 Variables d'Environnement

### Où sont-elles stockées ?

1. **GitHub Secrets** : Pour le CI/CD (12 secrets configurés)
2. **VPS `.env`** : Généré automatiquement lors du déploiement depuis les secrets GitHub
3. **Local `.env.local`** : Pour le développement local (à créer manuellement)

### Liste des variables requises

| Variable               | Description     | Exemple                                 |
| ---------------------- | --------------- | --------------------------------------- |
| `DATABASE_URL`         | URL PostgreSQL  | `postgresql://user:pass@db:5432/kazier` |
| `NEXTAUTH_SECRET`      | Secret NextAuth | Généré avec `openssl rand -base64 32`   |
| `NEXTAUTH_URL`         | URL publique    | `http://204.168.150.89:3000`            |
| `SLACK_BOT_TOKEN`      | Token Slack     | `xoxb-...`                              |
| `SLACK_CHANNEL_ID`     | ID channel      | `C0XXXXXXX`                             |
| `SLACK_BOSS_USER_ID`   | ID user boss    | `U0XXXXXXX`                             |
| `NEXT_PUBLIC_FORM_URL` | URL formulaire  | `http://204.168.150.89:3000`            |
| `SKIP_SLACK_SIGNATURE` | Skip signature  | `true`                                  |
| `POSTGRES_PASSWORD`    | Mot de passe DB | Strong password                         |

---

## 📦 Architecture du Déploiement

### GitHub Container Registry (GHCR)

Toutes les images Docker sont stockées sur GHCR :

- **URL** : https://github.com/Baroka-wp/kazier/pkgs/container/kazier
- **Tag latest** : Toujours la dernière version de `main`
- **Visibilité** : Privée (nécessite authentification)

### Structure VPS

```
/opt/kazier/
├── docker-compose.yml     # Config production
├── .env                   # Variables d'environnement (auto-généré)
└── postgres-data/         # Volume persistant PostgreSQL
```

### Services Docker

| Service          | Port           | Description         |
| ---------------- | -------------- | ------------------- |
| `kazier-app`     | 3000           | Application Next.js |
| `kazier-db`      | 5432 (interne) | PostgreSQL 15       |
| `kazier-adminer` | 8080           | Interface DB web    |

**URLs publiques** :

- Application : http://204.168.150.89:3000
- Adminer : http://204.168.150.89:8080

---

## 📝 Bonnes Pratiques

### ✅ À FAIRE

1. **Toujours tester localement** avant de push

   ```bash
   npm run quality
   npm run build
   ```

2. **Utiliser des branches feature** pour le développement

   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```

3. **Écrire des messages de commit clairs**

   ```bash
   git commit -m "Feat: Ajout du système de notifications"
   git commit -m "Fix: Correction du bug de connexion"
   git commit -m "Refactor: Amélioration des performances"
   ```

4. **Surveiller les GitHub Actions** après un push sur main

5. **Vérifier l'application** après déploiement
   - Tester les fonctionnalités principales
   - Vérifier les logs VPS si problème

### ❌ À ÉVITER

1. **Ne pas bypass le hook pre-commit** (--no-verify) sans raison valable

2. **Ne pas push directement sur main** sans avoir testé
   - Utiliser des branches et des Pull Requests

3. **Ne pas modifier directement les fichiers sur le VPS**
   - Toujours passer par Git et le CI/CD

4. **Ne pas exposer les secrets** dans le code
   - Utiliser les variables d'environnement

5. **Ne pas ignorer les erreurs du workflow**
   - Si le workflow échoue, corriger avant de continuer

---

## 🎓 Pour aller plus loin

### Documentation Détaillée

- **Déploiement complet** : Voir `DEPLOYMENT_SIMPLE.md`
- **Docker** : Voir `DOCKER_README.md`
- **Architecture projet** : Voir `.claude/CLAUDE.md`

### Ressources Externes

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

## 🆘 Support

### En cas de problème

1. **Vérifier les logs GitHub Actions** : GitHub → Actions → Workflow échoué
2. **Consulter ce guide** : Section "Résolution de Problèmes"
3. **Vérifier les logs VPS** : `ssh kazier@204.168.150.89 && cd /opt/kazier && docker compose logs`

### Contact

- **Administrateur système** : [Votre email]
- **Repository GitHub** : https://github.com/Baroka-wp/kazier
- **VPS** : 204.168.150.89

---

## 📅 Historique des Modifications

| Date       | Version | Changement                                                     |
| ---------- | ------- | -------------------------------------------------------------- |
| 2026-03-15 | 1.0     | Mise en place du CI/CD avec GHCR + déploiement VPS automatique |

---

**Dernière mise à jour** : 15 mars 2026
**Auteur** : Équipe Kazier
**Status** : ✅ Opérationnel
