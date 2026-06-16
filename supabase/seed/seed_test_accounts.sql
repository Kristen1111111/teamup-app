-- =============================================================================
-- TeamUp — Seed des comptes de test (DevSwitcher)
-- =============================================================================
--
-- BUT
--   Recrée les 3 comptes auth stables consommés par src/lib/devAccounts.ts +
--   src/components/DevSwitcher.tsx (login email+password, sans magic-link), pour
--   exercer les interactions multi-utilisateurs en DEV/STAGING. RLS reste intacte :
--   ce sont de vrais users auth.users avec une identité `email` et un profil enrichi.
--
-- A N'EXECUTER QUE SUR STAGING / LOCAL — JAMAIS SUR LA PROD `yljskqyvqumvtmvptkxt`.
--   La prod n'utilise QUE le magic-link ; ces comptes mot-de-passe n'ont rien à y faire.
--
-- COMMENT L'EXECUTER (sur la cible staging UNIQUEMENT) :
--   psql "$STAGING_DB_URL" -f supabase/seed/seed_test_accounts.sql
--   ou Supabase Studio > SQL Editor (projet staging) > coller > Run
--   ou via la CLI : il sera joué automatiquement si on le pointe depuis
--                   supabase/seed.sql (\i 'seed/seed_test_accounts.sql').
--
-- IDEMPOTENT : ré-exécutable sans doublon. La stratégie est « delete-then-insert »
--   par email pour auth.users / auth.identities (FK ON DELETE CASCADE depuis
--   profiles.auth_id n'existe pas ici, donc on remet auth_id à NULL avant suppression),
--   puis upsert du profil. Le mot de passe est re-hashé à chaque run (bcrypt).
--
-- HYPOTHESES VERIFIEES SUR LE SCHEMA (list_tables, read-only) :
--   - public.profiles (id uuid pk, auth_id uuid unique -> auth.users.id, first_name,
--     last_initial, city, avatar_color, verified, open_to_meet, perfect_match,
--     matches_played, attendance_pct, late_cancels, notif_prefs jsonb, onboarded,
--     is_public, hidden_from_search, is_moderator, cgu_accepted_at, home_lat, home_lng).
--   - public.profile_sports (profile_id, sport_key -> sports.key, level).
--   - extension pgcrypto installée dans le schéma `extensions` (crypt / gen_salt).
--   - un trigger handle_new_user crée AUTOMATIQUEMENT un profil à l'insert dans
--     auth.users (README l.118). On laisse le trigger créer la ligne profiles,
--     PUIS on l'enrichit par UPDATE (idempotent).
-- =============================================================================

begin;

-- pgcrypto vit dans le schéma `extensions` sur Supabase : on l'expose pour crypt()/gen_salt().
set local search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- Fonction utilitaire locale : (re)crée un compte auth confirmé + identité email.
-- Retourne l'uuid du user auth. Délibérément en plpgsql anonyme via DO + table temp
-- pour rester un simple script (pas d'objet persistant créé).
-- -----------------------------------------------------------------------------

do $$
declare
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_password    text := 'teamup123';
  acct          record;
  v_uid         uuid;
begin
  for acct in
    select * from (values
      -- email,               first_name, last_initial, city,        avatar_color, matches_played, attendance_pct, late_cancels, open_to_meet, verified, perfect_match
      ('karim@teamup.app',    'Karim',    'L.',         'Paris 11e', '#5C2049', 18, 94, 1, true,  true,  'Foot à 5, mardi soir, niveau intermédiaire'),
      ('salome@teamup.app',   'Salomé',   'R.',         'Paris 11e', '#1F6F5C', 8,  100,0, true,  true,  'Tennis le week-end, simple ou double'),
      ('leo@teamup.app',      'Léo',      'D.',         'Paris 11e', '#2A3C6E', 14, 88, 2, false, false, 'Basket le dimanche, proche République')
    ) as t(email, first_name, last_initial, city, avatar_color, matches_played, attendance_pct, late_cancels, open_to_meet, verified, perfect_match)
  loop
    -- 1) Détacher tout profil existant (auth_id unique) puis purger l'ancien user/identité.
    update public.profiles set auth_id = null
      where auth_id in (select id from auth.users where email = acct.email);

    delete from auth.identities
      where provider = 'email'
        and user_id in (select id from auth.users where email = acct.email);

    delete from auth.users where email = acct.email;

    -- 2) (Re)créer le user auth, email CONFIRMÉ, mot de passe bcrypt.
    --    Le trigger handle_new_user créera la ligne public.profiles correspondante.
    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      v_instance_id, v_uid, 'authenticated', 'authenticated',
      acct.email, crypt(v_password, gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('email', acct.email, 'email_verified', true),
      now(), now(),
      '', '', '', ''
    );

    -- 3) Identité email correcte (provider_id = email pour le provider 'email' moderne,
    --    identity_data avec sub + email).
    insert into auth.identities (
      id, user_id, provider, provider_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, 'email', acct.email,
      jsonb_build_object('sub', v_uid::text, 'email', acct.email, 'email_verified', true),
      now(), now(), now()
    );

    -- 4) Enrichir le profil. Le trigger l'a créé avec auth_id = v_uid ; on UPSERT au cas
    --    où le trigger serait absent sur la cible (defensive : insert si manquant).
    insert into public.profiles (auth_id, first_name, last_initial, city, avatar_color,
                                 verified, open_to_meet, perfect_match,
                                 matches_played, attendance_pct, late_cancels,
                                 onboarded, is_public, hidden_from_search,
                                 cgu_accepted_at)
    values (v_uid, acct.first_name, acct.last_initial, acct.city, acct.avatar_color,
            acct.verified, acct.open_to_meet, acct.perfect_match,
            acct.matches_played, acct.attendance_pct, acct.late_cancels,
            true, true, false, now())
    on conflict (auth_id) do update set
      first_name        = excluded.first_name,
      last_initial      = excluded.last_initial,
      city              = excluded.city,
      avatar_color      = excluded.avatar_color,
      verified          = excluded.verified,
      open_to_meet      = excluded.open_to_meet,
      perfect_match     = excluded.perfect_match,
      matches_played    = excluded.matches_played,
      attendance_pct    = excluded.attendance_pct,
      late_cancels      = excluded.late_cancels,
      onboarded         = true,
      cgu_accepted_at   = coalesce(public.profiles.cgu_accepted_at, now());
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 5) Sports favoris des comptes (idempotent via ON CONFLICT sur la PK composite).
--    On ne référence que des clés présentes dans public.sports (6 lignes seedées).
--    Adapter les clés si nécessaire : select key from public.sports;
-- -----------------------------------------------------------------------------

insert into public.profile_sports (profile_id, sport_key, level)
select p.id, s.sport_key, s.level
from (values
  ('karim@teamup.app',  'foot',   'Intermédiaire'),
  ('salome@teamup.app', 'tennis', 'Avancé'),
  ('leo@teamup.app',    'basket', 'Intermédiaire')
) as s(email, sport_key, level)
join auth.users u on u.email = s.email
join public.profiles p on p.auth_id = u.id
where exists (select 1 from public.sports sp where sp.key = s.sport_key)
on conflict (profile_id, sport_key) do update set level = excluded.level;

commit;

-- -----------------------------------------------------------------------------
-- Vérification rapide (lecture seule) — décommenter au besoin :
-- select u.email, u.email_confirmed_at is not null as confirmed,
--        p.first_name, p.last_initial, p.matches_played,
--        (select count(*) from auth.identities i where i.user_id = u.id) as identities
-- from auth.users u
-- join public.profiles p on p.auth_id = u.id
-- where u.email in ('karim@teamup.app','salome@teamup.app','leo@teamup.app');
-- =============================================================================
