# TeamUp — MVP web (React + Supabase)

Application qui implémente le **PRD TeamUp v0.2** sur la base du design system
`TeamUp.dc.html` (Hinge × Linear × Strava). Mobile-first : sur petit écran l'app
remplit l'écran comme une vraie web-app mobile ; sur grand écran elle s'affiche
dans le cadre téléphone du design (393×852).

## Écrans implémentés (les 4 du design)

| Écran | Fichier | Données |
|-------|---------|---------|
| **Près de toi** (feed) | `src/screens/Feed.tsx` | Active, filtres par sport, bannière « se revoir », demande à rejoindre |
| **Créer une activité** | `src/screens/Create.tsx` | Insère une activité (sport, créneau, lieu, niveau, places, poste, mode) |
| **Profil & fiabilité** | `src/screens/Profile.tsx` | Ring de présence, stats, badges, sports, historique, toggle « ouvert à se revoir » |
| **Ouvert à se revoir** | `src/screens/Revoir.tsx` | Co-joueurs du dernier match, intentions, **match réciproque** |
| Connexion | `src/screens/Login.tsx` | Magic-link e-mail (Supabase Auth) |

## Stack

- **Vite + React 18 + TypeScript** (styles inline portés 1:1 depuis le prototype → fidélité pixel)
- **Supabase** : Postgres + Auth (magic-link e-mail) + RLS + PostgREST
- Polices : Hanken Grotesk (UI), Newsreader (titres serif), JetBrains Mono (data)

## Démarrer

```bash
cd teamup-app
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de prod
```

Les variables d'environnement sont dans `.env` (voir `.env.example`) :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...   # clé publishable
```

### Connexion

L'app utilise un **lien magique par e-mail**. Saisis ton e-mail → tu reçois un
lien → clique-le sur le même appareil. À la première connexion, une fonction
`bootstrap_demo()` enrichit ton compte (réputation, sports, un match « d'hier »
avec des co-joueurs et des intentions entrantes) pour que les écrans Profil et
« Se revoir » soient vivants immédiatement.

> Auth téléphone + SMS (demandée au PRD) : reportée car elle nécessite un
> fournisseur SMS payant (Twilio…). Le magic-link couvre le même besoin sans coût.

### QA design (dev uniquement)

En mode dev, on peut afficher un écran avec le profil de démo sans se connecter :
`/?preview=feed` · `/?preview=create` · `/?preview=profile` · `/?preview=revoir`.

## Schéma Supabase

`sports`, `profiles`, `profile_sports`, `activities`, `activity_participants`,
`meet_intents`. RLS activée partout :

- lecture publique des activités / profils / sports (page partageable sans compte) ;
- chaque utilisateur n'écrit que **ses** données (`my_profile_id() = auth.uid()`) ;
- `meet_intents` n'est lisible que par les deux parties → la réciprocité « se revoir »
  reste invisible tant qu'elle n'est pas mutuelle (sécurité by design du PRD).

Le profil est créé automatiquement à l'inscription (trigger `handle_new_user`).

## Bloc 5 — Hors MVP (reporté)

Le PRD signale lui-même ce bloc comme « ambitieux et reportable ». Décision prise
avec la porteuse du projet le **2026-06-15** : **les deux features sont reportées**,
aucun code livré. Elles sont consignées ici pour ne pas être perdues, avec la
condition qui lèverait le report.

| Réf | Feature | Pourquoi reporté | Condition de levée |
|-----|---------|------------------|--------------------|
| **F12** | Auth téléphone + SMS (US1 strict, remplace le magic-link) | L'OTP par SMS exige un **fournisseur payant** (Twilio / Vonage / MessageBird) : compte + credentials que seule la porteuse peut ouvrir. Le **magic-link e-mail couvre le même besoin sans coût** et reste l'auth de production. | Ouvrir un compte fournisseur SMS, le configurer dans Supabase Auth → Providers (Phone), puis brancher le parcours `signInWithOtp({ phone })` + écran de saisie du code côté `Login.tsx`. |
| **F13** | Apps natives iOS / Android | Chantier **multi-plateforme** lourd ; publication store = comptes Apple/Google payants + Xcode/Android Studio. Jugé hors périmètre MVP par le PRD. | Depuis l'app web existante, deux chemins : **PWA installable** (manifest + service worker, sans store) — le plus rapide ; ou **wrapper Capacitor** pour empaqueter en projet natif et viser les stores. |

> Tant que ces conditions ne sont pas réunies, le périmètre de production reste :
> auth **magic-link e-mail** + **web app mobile-first** (installable manuellement
> via le navigateur, sans build natif).

## Notes

- `total_slots` = joueurs déjà confirmés **+** places encore à compléter ;
  `slots_left = total_slots − confirmés`.
- Contenu de démo (organisateurs, lieux, stats) fictif et illustratif.
- Reste à faire (hors périmètre de cette livraison) : gestion organisateur /
  check-in, page publique d'activité partagée, notifications, messagerie.
