# 📋 Kazier — Rapport Quotidien

Système de rapport quotidien pour l'équipe Africa Samurai. Un bot Slack **(Groot Bot)** envoie un rappel à **17h00**, une relance aux absents à **18h00** et un bilan au boss à **00h00**. Les membres remplissent un formulaire et le boss reçoit les rapports en DM.

---

## ✨ Fonctionnalités

- **Rappel automatique** — Groot Bot envoie un message dans le canal Slack avec le lien du formulaire tous les jours de la semaine à 17h 00  sauf les week-end
- **Formulaire multi-étapes** — 7 questions avec navigation, animation et compteur de caractères
- **Autocomplete** — le champ nom cherche dans la table `teams` en temps réel
- **Blocage double soumission** — impossible de soumettre le rapport deux fois le même jour
- **Récap avant envoi** — l'utilisateur vérifie ses réponses avant de soumettre avec la possibilité de retourner modifier
- **DM au boss** — chaque rapport soumis est envoyé en DM privé au boss via Groot Bot
- **Relance individuelle** — à 18h, le bot DM chaque membre qui n'a pas encore soumis
- **Bilan nocturne** — à minuit, le bot DM le boss avec le bilan contenant les personnes qui ont soumis le rapport du jour et ceux qui ne l'ont pas soumis
- **Sauvegarde en base** — chaque rapport est sauvegardé dans Neon (PostgreSQL)

---

## 🛠️ Stack technique

| Outil               | Rôle                                  |
| ------------------- | ------------------------------------- |
| **Next.js 16**      | Framework frontend + API routes       |
| **Tailwind CSS v4** | Styles                                |
| **Neon**            | Base de données PostgreSQL serverless |
| **Slack API**       | Bot + envoi de messages               |
| **Vercel**          | Hébergement                           |
| **cron-job.org**    | Déclenchement automatique des crons   |

---

## 📁 Structure du projet

```
app/
├── page.tsx                        # Page principale
├── api/
│   └── cron/
│       ├── remind/route.ts         # Rappel quotidien dans le canal
│       ├── chase/route.ts          # Relance individuelle des absents
│       └── summary/route.ts        # Bilan nocturne au boss
components/
└── DailyForm/
    ├── index.tsx                   # Logique + états + routing
    ├── questions.ts                # Données des questions + couleur brand
    ├── Screen.tsx                  # Layout wrapper
    ├── Confetti.tsx                # Animation confetti
    ├── SubmitButton.tsx            # Bouton submit
    ├── WelcomeScreen.tsx           # Vue accueil
    ├── FormScreen.tsx              # Vue formulaire
    ├── ReviewScreen.tsx            # Vue récap avant envoi
    └── SuccessScreen.tsx           # Vue succès
lib/
└── actions.ts                      # Server actions (envoi Slack + requêtes BD)
public/
└── africa-samurai-logo.png         # Logo
```

---

## 🗄️ Base de données

### Table `teams` — les membres de l'équipe

```sql
CREATE TABLE teams (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  phone      TEXT,
  age        INTEGER,
  slack_id   TEXT,
  is_boss    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table `rapports` — les rapports quotidiens

```sql
CREATE TABLE rapports (
  id                 SERIAL PRIMARY KEY,
  full_name          TEXT,
  work_built         TEXT,
  working_built      TEXT,
  validated_learning TEXT,
  broken_features    TEXT,
  needed_learning    TEXT,
  tomorrow_build     TEXT,
  created_at         TIMESTAMP DEFAULT NOW()
);
```

---

## ⚙️ Variables d'environnement

Créez un fichier `.env.local` à la racine :

```bash
# Base de données
DATABASE_URL=postgresql://...

# Slack
SLACK_BOT_TOKEN=xoxb-...         # Token de Groot Bot
SLACK_CHANNEL_ID=C0XXXXXXX       # ID du canal pour le rappel
SLACK_BOSS_USER_ID=U0XXXXXXX     # ID Slack du boss pour les DMs

# App
NEXT_PUBLIC_FORM_URL=https://rapportjournalier.vercel.app
```

---

## 🤖 Le bot Slack (Groot Bot)

### Créer le bot

1. Allez sur [api.slack.com/apps](https://api.slack.com/apps)
2. **Create New App** → From scratch
3. Ajoutez les scopes ci-dessus dans **OAuth & Permissions**
4. Cliquez **Install to Workspace**
5. Copiez le **Bot Token** `xoxb-...`
6. Invitez le bot dans votre canal : `/invite @GrootBot`

### Permissions requises (OAuth Scopes)

Allez sur https://api.slack.com
*Dans le sidebar allez sur OAuth & Permissions
*Section Portées

- `chat:write` — envoyer des messages
- `im:write` — envoyer des DMs
- `users:read` — lire les profils
- `channels:read` — lire les profils

---

## ⏰ Crons (cron-job.org)

| Cron            | Endpoint            | Heure (UTC)     | Heure Bénin |
| --------------- | ------------------- | --------------- | ----------- |
| Rappel canal    | `/api/cron/remind`  | `0  17 * * 1-5` | 17h00       |
| Relance absents | `/api/cron/chase`   | `0 18 * * 1-5`  | 18h00       |
| Bilan boss      | `/api/cron/summary` | `0  0 * * 1-5`  | 00h00       |

> Le Bénin est en **WAT (UTC+1)**

---

## 🚀 Déploiement

```bash
# Installer les dépendances
npm install

# Lancer en local
npm run dev

# Déployer sur Vercel
git add .
git commit -m "votre message"
git push
```

---

## 🔄 Flux complet

```
17h00 → Groot Bot poste dans #canal avec lien formulaire
          ↓
        Membre clique le lien → remplit le formulaire
          ↓
        Rapport sauvegardé dans Neon
        Groot Bot envoie le rapport en DM au boss
          ↓
18h00 → Bot vérifie qui n'a pas soumis → DM individuel aux absents
          ↓
00h00 → Bot envoie bilan complet au boss (présents + absents)
```

---

## 🤝 Contribuer

1. Clonez le repo

```bash
   git clone https://github.com/votre-repo/kazier.git
```

2. Créez votre branche

```bash
   git checkout -b feature/votre-fonctionnalité
```

3. Committez vos changements

```bash
   git commit -m "ajout : votre fonctionnalité"
```

4. Pushez votre branche

```bash
   git push origin feature/votre-fonctionnalité
```

5. Ouvrez une **Pull Request** sur GitHub

---

## 👤 Auteur

Projet développé par l'équipe de **Africa Samurai** ⚔️
