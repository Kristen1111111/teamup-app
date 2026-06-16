import { C, FONT } from '../lib/tokens'
import { navigate } from '../lib/router'
import { ChevronLeft, Heart } from '../components/icons'

export type LegalDoc = 'cgu' | 'confidentialite'

// Static legal pages (F11 / RGPD). Served on /cgu and /confidentialite, no
// account required — they are linked from the login screen and the onboarding
// consent checkbox. Plain, MVP-grade text; have it reviewed before scaling.
const UPDATED = '15 juin 2026'

type Section = { h: string; p: string[] }

const CGU: Section[] = [
  {
    h: '1. Objet',
    p: [
      "TeamUp est un service en ligne qui met en relation des joueurs amateurs pour compléter des activités sportives (trouver des partenaires de jeu, organiser une session, rester en contact). Les présentes Conditions Générales d'Utilisation (« CGU ») encadrent l'accès et l'usage du service.",
      "En créant un compte ou en utilisant TeamUp, tu acceptes les présentes CGU.",
    ],
  },
  {
    h: '2. Compte et accès',
    p: [
      "L'accès se fait par lien de connexion sécurisé envoyé à ton adresse e-mail (« lien magique ») — sans mot de passe. Tu es responsable de la confidentialité de ta boîte mail et des activités réalisées depuis ton compte.",
      "Tu dois avoir l'âge légal requis dans ton pays pour t'inscrire et fournir des informations exactes.",
    ],
  },
  {
    h: '3. Règles de bonne conduite',
    p: [
      "TeamUp repose sur la confiance entre joueurs. Tu t'engages à te présenter aux activités que tu as rejointes, à prévenir en cas d'annulation, et à adopter un comportement respectueux.",
      "Sont interdits : le harcèlement, les propos haineux ou discriminatoires, l'usurpation d'identité, le spam, et toute activité illégale. Les comportements abusifs peuvent être signalés depuis l'application et entraîner la suspension du compte.",
    ],
  },
  {
    h: '4. Activités et responsabilité',
    p: [
      "TeamUp est un outil de mise en relation : nous n'organisons pas les activités et ne sommes pas partie aux rencontres entre joueurs. La pratique sportive se fait sous ta seule responsabilité.",
      "Vérifie ta condition physique et assure-toi d'être couvert par une assurance adaptée. TeamUp ne saurait être tenu responsable des dommages survenus à l'occasion d'une activité.",
    ],
  },
  {
    h: '5. Indicateur de fiabilité',
    p: [
      "Le service calcule un indicateur de présence à partir de faits (présences confirmées, annulations tardives). Il vise à favoriser des activités fiables et n'a pas vocation à porter un jugement sur les personnes.",
    ],
  },
  {
    h: '6. Disponibilité et évolutions',
    p: [
      "Le service est fourni « en l'état », sans garantie de disponibilité continue. Nous pouvons faire évoluer les fonctionnalités et mettre à jour ces CGU ; la version applicable est celle publiée sur cette page.",
    ],
  },
  {
    h: '7. Contact',
    p: ["Pour toute question relative aux présentes CGU : contact@teamup.app."],
  },
]

const PRIVACY: Section[] = [
  {
    h: '1. Responsable du traitement',
    p: [
      "TeamUp traite tes données personnelles dans le cadre de la mise en relation entre joueurs. La présente politique explique quelles données sont collectées, pourquoi, et quels sont tes droits (conformément au RGPD).",
    ],
  },
  {
    h: '2. Données collectées',
    p: [
      "Compte : adresse e-mail (pour le lien de connexion).",
      "Profil : prénom, zone/ville, sports pratiqués et niveau, préférences, et les informations que tu choisis d'ajouter.",
      "Usage : activités créées ou rejointes, présences, messages échangés, signalements et blocages.",
      "Aucune donnée bancaire n'est collectée. Aucun numéro de téléphone n'est requis.",
    ],
  },
  {
    h: '3. Finalités',
    p: [
      "Tes données servent à : te connecter, afficher ton profil aux autres joueurs, te proposer des activités pertinentes près de chez toi, calculer ton indicateur de présence, t'envoyer les notifications liées à tes activités, et assurer la sécurité du service (modération).",
    ],
  },
  {
    h: '4. Visibilité et partage',
    p: [
      "Certaines informations de profil sont visibles par les autres joueurs (prénom, sports, fiabilité). Tu peux passer ton profil en privé ou te masquer de la recherche depuis tes réglages.",
      "L'adresse exacte d'une activité n'est révélée qu'aux joueurs acceptés. Nous ne vendons pas tes données et ne les partageons qu'avec nos sous-traitants techniques (hébergement) strictement nécessaires au service.",
    ],
  },
  {
    h: '5. Géolocalisation',
    p: [
      "Le tri « près de moi » utilise ta position uniquement si tu l'autorises dans ton navigateur. Tu peux refuser ou révoquer cette autorisation à tout moment ; l'application reste utilisable sans.",
    ],
  },
  {
    h: '6. Conservation',
    p: [
      "Tes données sont conservées tant que ton compte est actif. À la suppression du compte, elles sont effacées, sous réserve des obligations légales de conservation éventuelles.",
    ],
  },
  {
    h: '7. Tes droits',
    p: [
      "Tu peux accéder à tes données, les rectifier et les supprimer. Depuis « Paramètres & sécurité », tu peux à tout moment exporter l'ensemble de tes données (format JSON) et supprimer ton compte.",
      "Pour exercer tes autres droits ou poser une question : privacy@teamup.app.",
    ],
  },
]

export default function Legal({ doc }: { doc: LegalDoc }) {
  const isCgu = doc === 'cgu'
  const title = isCgu ? "Conditions Générales d'Utilisation" : 'Politique de confidentialité'
  const sections = isCgu ? CGU : PRIVACY

  return (
    <div style={{ minHeight: '100dvh', background: C.paper, color: C.ink }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 22px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/')} style={backBtn} title="Retour">
            <ChevronLeft />
          </button>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(150deg,#5C2049,#8A3A6F)',
            }}
          >
            <Heart size={18} />
          </span>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>
            Team<span style={{ color: C.prune }}>Up</span>
          </div>
        </div>

        <h1
          style={{
            fontFamily: FONT.serif,
            fontSize: 34,
            fontWeight: 500,
            letterSpacing: '-.01em',
            lineHeight: 1.1,
            marginTop: 28,
          }}
        >
          {title}
        </h1>
        <div
          style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: '1px', color: C.muted, marginTop: 10 }}
        >
          DERNIÈRE MISE À JOUR · {UPDATED.toUpperCase()}
        </div>

        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {sections.map((s) => (
            <section key={s.h}>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>{s.h}</h2>
              {s.p.map((para, i) => (
                <p
                  key={i}
                  style={{ marginTop: 8, fontSize: 14.5, color: C.ink, fontWeight: 450, lineHeight: 1.6 }}
                >
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p style={{ marginTop: 32, fontSize: 12.5, color: C.faint, fontWeight: 500, lineHeight: 1.5 }}>
          Document fourni à titre informatif pour le MVP. À faire valider juridiquement avant un lancement à
          grande échelle.
        </p>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: C.card,
  border: `1px solid ${C.line}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: C.ink,
}
