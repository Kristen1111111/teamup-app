# TeamUp — MVP web (React + Supabase)

Application qui implémente le **PRD TeamUp v0.2** sur la base du design system
`TeamUp.dc.html` (Hinge × Linear × Strava). Mobile-first : sur petit écran l'app
remplit l'écran comme une vraie web-app mobile ; sur grand écran elle s'affiche
dans le cadre téléphone du design (393×852).

> **État du projet (2026-06-15).** Blocs 1 à 4 du MVP livrés et fonctionnels.
> Le build de production passe (`npm run build`) et le backend Supabase est
> entièrement provisionné (12 tables, RLS partout, fonctions + données de démo).
> Il reste **3 étapes de configuration** pour mettre en ligne — voir
> [Déploiement](#déploiement). Bloc 5 reporté (voir plus bas).

## Stack

- **Vite + React 18 + TypeScript** (styles inline portés 1:1 depuis le prototype → fidélité pixel)
- **Supabase** : Postgres + Auth (magic-link e-mail) + RLS + PostgREST
- **Netlify** pour l'hébergement (config dans `netlify.toml`)
- Polices : Hanken Grotesk (UI), Newsreader (titres serif), JetBrains Mono (data)

## Écrans implémentés

L'app couvre les 4 écrans du design **plus** tout le parcours nécessaire pour
qu'ils soient utilisables de bout en bout.

### Bloc 1 — Cœur du produit (les 4 écrans du design)

| Écran | Fichier | Données |
|-------|---------|---------|
| **Près de toi** (feed) | `src/screens/Feed.tsx` | Activités actives, filtres par sport, bannière « se revoir », demande à rejoindre |
| **Créer une activité** | `src/screens/Create.tsx` | Insère une activité (sport, créneau, lieu, niveau, places, poste, mode) |
| **Profil & fiabilité** | `src/screens/Profile.tsx` | Ring de présence, stats, badges, sports, historique, toggle « ouvert à se revoir » |
| **Ouvert à se revoir** | `src/screens/Revoir.tsx` | Co-joueurs du dernier match, intentions, **match réciproque** |
| Connexion | `src/screens/Login.tsx` | Magic-link e-mail (Supabase Auth) |

### Bloc 2 — Cycle de vie d'une activité

| Écran | Fichier | Rôle |
|-------|---------|------|
| **Mes activités** | `src/screens/MyActivities.tsx` | Activités organisées et rejointes du joueur |
| **Gérer (organisateur)** | `src/screens/Manage.tsx` | Accepter/refuser les demandes, check-in, joueurs réguliers, liste d'attente |
| **Notifications** | `src/screens/Notifications.tsx` | Demandes, acceptations, rappels (`generate_reminders`), matchs réciproques |
| **Page publique d'activité** | `src/screens/PublicActivity.tsx` | `/a/:id` — consultable **sans compte**, partageable ; l'adresse exacte reste masquée jusqu'à acceptation |

### Bloc 3 — Compte & confidentialité

| Écran | Fichier | Rôle |
|-------|---------|------|
| **Onboarding** | `src/screens/Onboarding.tsx` | 2 étapes (sports + niveau, puis zone + acceptation CGU), bascule `profile.onboarded` |
| **Éditer le profil** | `src/screens/EditProfile.tsx` | Identité, zone, sports/niveau, profil public/privé, « me cacher des recherches » |
| **Réglages** | `src/screens/Settings.tsx` | Préférences, **export de mes données** (`export_my_data`), **suppression de compte** (`delete_my_account`) |

### Bloc 4 — Social & sécurité

| Écran | Fichier | Rôle |
|-------|---------|------|
| **Messagerie** | `src/screens/Messages.tsx` | Conversations d'activité + messages directs (`conversations`, `messages`) |
| **Modération** | `src/screens/Moderation.tsx` | File de signalements + blocages, réservée aux modérateurs (`is_moderator()`) |

## Démarrer

```bash
cd teamup-app
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de prod (sort dans dist/)
```

Les variables d'environnement sont dans `.env` (voir `.env.example`) :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...   # clé publishable
```

### Connexion

L'app utilise un **lien magique par e-mail**. Saisis ton e-mail → tu reçois un
lien → clique-le sur le même appareil. La redirection se fait sur
`window.location.origin`, donc le même code fonctionne en local comme en prod
(à condition que le domaine soit autorisé côté Supabase — voir Déploiement).

> ⚠️ **Contenu de démo injecté à chaque connexion.** À la connexion,
> `useSession` appelle `bootstrap_demo`, `bootstrap_bloc2`, `generate_reminders`
> et `bootstrap_bloc4` (voir `src/lib/useSession.ts`). Ces fonctions enrichissent
> le compte avec de la réputation, des sports, des activités, des co-joueurs, des
> messages et une file de modération **fictifs** pour que tous les écrans soient
> vivants immédiatement. C'est voulu pour une **démo**. Pour un **vrai lancement**,
> il faut désactiver/gater ces appels (sinon chaque inscrit reçoit du contenu
> fictif). Voir [Avant un lancement réel](#avant-un-lancement-réel-décision-produit).

### QA design (dev uniquement)

En mode dev, on peut afficher un écran avec le profil de démo sans se connecter :
`/?preview=feed` · `/?preview=create` · `/?preview=profile` · `/?preview=revoir`
· `/?preview=onboarding`.

## Schéma Supabase

Projet `yljskqyvqumvtmvptkxt`. **12 tables, RLS activée partout :**

`sports`, `profiles`, `profile_sports`, `activities`, `activity_participants`,
`meet_intents`, `notifications`, `conversations`, `conversation_members`,
`messages`, `blocks`, `reports`.

Principes RLS :

- lecture publique des activités / profils / sports (page partageable sans compte) ;
- chaque utilisateur n'écrit que **ses** données (`my_profile_id() = auth.uid()`) ;
- `meet_intents` n'est lisible que par les deux parties → la réciprocité « se revoir »
  reste invisible tant qu'elle n'est pas mutuelle (sécurité by design du PRD) ;
- l'**adresse exacte** d'une activité (`exact_address`) est révoquée du `SELECT`
  anon/authenticated et n'est servie qu'à un joueur accepté via le RPC
  `activity_exact_address` ;
- messages/conversations lisibles uniquement par leurs membres (`is_conv_member`) ;
- file de modération réservée aux modérateurs (`is_moderator`).

Le profil est créé automatiquement à l'inscription (trigger `handle_new_user`).
La logique métier vit dans des fonctions Postgres (`respond_request`,
`recompute_profile_stats`, `fn_backfill_waitlist`, triggers de notification, etc.).

## Déploiement

L'app est prête à déployer sur **Netlify** (`netlify.toml` : `npm run build` →
`dist`, fallback SPA configuré). Trois étapes restent à faire :

1. **Variables d'env Netlify** — déclarer `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` dans le dashboard Netlify (le `.env` local n'est pas
   déployé, il est gitignored).
2. **URLs d'authentification Supabase** — dans Authentication → URL Configuration,
   mettre le domaine de prod en **Site URL** et l'ajouter aux **Redirect URLs**.
   Sans ça, le lien magique renvoie vers `localhost` ou est rejeté → connexion
   impossible en prod.
3. **Brancher le déploiement** — connecter le dépôt à Netlify (ou
   `netlify deploy --prod`).

### Avant un lancement réel (décision produit)

- **Seed de démo : désactivé par défaut.** ✅ Les appels `bootstrap_*` ne tournent
  plus qu'avec `VITE_DEMO_SEED=true` (voir `src/lib/useSession.ts` et
  `.env.example`). En production, laisse la variable absente → chaque vrai compte
  démarre vierge. Pour un déploiement de démo, mets `VITE_DEMO_SEED=true`.

### Durcissement (fait le 2026-06-15)

- ✅ `REVOKE EXECUTE` sur `bootstrap_demo` / `bootstrap_bloc2` / `bootstrap_bloc4`
  pour le rôle `anon` (migration `harden_bootstrap_revoke_and_geocode_search_path`).
- ✅ `search_path` figé (`public, pg_temp`) sur `tg_activity_geocode`.
- ✅ Pages **CGU** (`/cgu`) et **confidentialité** (`/confidentialite`) créées
  (`src/screens/Legal.tsx`), consultables sans compte et liées depuis le login et
  l'onboarding. Textes MVP, **à faire valider juridiquement** avant montée en charge.

> Reste seulement (advisors Supabase, non bloquant) : activer la *Leaked Password
> Protection* dans Auth ; les autres warnings « SECURITY DEFINER exécutable »
> concernent des fonctions appelées en session authentifiée et sont sans risque ici.

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
- Pas encore de tests automatisés ; le bundle JS est servi en un seul chunk
  (~496 kB / ~133 kB gzip) — optimisation possible mais non bloquante.
