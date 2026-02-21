// scripts/db/seed_questions.ts
// Seeds 15 sample Islamic quiz questions across 3 MVP themes.
// All text in French. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars.
// NOTE: Sample data — requires scholar review before production use.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// A placeholder admin user ID — replace with real seeder account ID
const SEEDER_USER_ID = process.env.SEEDER_USER_ID ?? '00000000-0000-0000-0000-000000000001';

interface SeedQuestion {
  text: string;
  theme: string;
  difficulty: string;
  type: string;
  options: { text: string; is_correct: boolean }[];
  explanation: string;
  status: string;
  language: string;
  sources: { type: string; reference: string; detail?: string }[];
}

const questions: SeedQuestion[] = [
  // ── Quran (5) ──────────────────────────────────────────────────────────
  {
    text: 'Quel est le nom de la première sourate du Coran ?',
    theme: 'quran', difficulty: 'easy', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: 'Al-Fatiha', is_correct: true },
      { text: 'Al-Baqarah', is_correct: false },
      { text: 'Al-Ikhlas', is_correct: false },
      { text: 'Al-Nas', is_correct: false },
    ],
    explanation: 'Al-Fatiha (L\'Ouverture) est la première sourate du Coran. Elle est composée de 7 versets et est récitée dans chaque rak\'a de la prière.',
    sources: [{ type: 'quran', reference: 'Al-Fatiha:1-7', detail: 'Première sourate du Coran' }],
  },
  {
    text: 'Combien de sourates contient le Coran ?',
    theme: 'quran', difficulty: 'easy', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: '114', is_correct: true },
      { text: '99', is_correct: false },
      { text: '124', is_correct: false },
      { text: '108', is_correct: false },
    ],
    explanation: 'Le Coran est composé de 114 sourates, organisées généralement par ordre décroissant de longueur. La première est Al-Fatiha et la dernière est An-Nas.',
    sources: [{ type: 'quran', reference: 'General — structure du Coran' }],
  },
  {
    text: 'La sourate Al-Baqarah est la plus longue sourate du Coran.',
    theme: 'quran', difficulty: 'easy', type: 'true_false', status: 'approved', language: 'fr',
    options: [
      { text: 'Vrai', is_correct: true },
      { text: 'Faux', is_correct: false },
    ],
    explanation: 'Al-Baqarah (La Vache) est effectivement la plus longue sourate du Coran avec 286 versets. Elle traite de nombreux sujets fondamentaux de l\'islam.',
    sources: [{ type: 'quran', reference: 'Al-Baqarah:1-286' }],
  },
  {
    text: 'Dans quelle sourate se trouve le verset du Trône (Ayat al-Kursi) ?',
    theme: 'quran', difficulty: 'medium', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: 'Al-Baqarah', is_correct: true },
      { text: 'Al-Imran', is_correct: false },
      { text: 'Al-Kahf', is_correct: false },
      { text: 'Ya-Sin', is_correct: false },
    ],
    explanation: 'Ayat al-Kursi est le verset 255 de la sourate Al-Baqarah. Il est considéré comme l\'un des versets les plus importants du Coran, décrivant la grandeur et l\'omniscience d\'Allah.',
    sources: [{ type: 'quran', reference: 'Al-Baqarah:255', detail: 'Verset du Trône' }],
  },
  {
    text: 'Quelle sourate est appelée "le cœur du Coran" selon les hadiths ?',
    theme: 'quran', difficulty: 'medium', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: 'Ya-Sin', is_correct: true },
      { text: 'Al-Fatiha', is_correct: false },
      { text: 'Al-Kahf', is_correct: false },
      { text: 'Al-Ikhlas', is_correct: false },
    ],
    explanation: 'La sourate Ya-Sin (chapitre 36) est appelée "le cœur du Coran" dans un hadith rapporté par At-Tirmidhi. Elle est fréquemment récitée pour les malades et les défunts.',
    sources: [{ type: 'hadith', reference: 'At-Tirmidhi:2812', detail: 'Hadith sur Ya-Sin comme cœur du Coran' }],
  },

  // ── Prophets (5) ────────────────────────────────────────────────────────
  {
    text: 'Quel prophète est surnommé "Khalilullah" (l\'ami d\'Allah) ?',
    theme: 'prophets', difficulty: 'easy', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: 'Ibrahim (Abraham)', is_correct: true },
      { text: 'Musa (Moïse)', is_correct: false },
      { text: 'Issa (Jésus)', is_correct: false },
      { text: 'Nuh (Noé)', is_correct: false },
    ],
    explanation: 'Ibrahim (paix sur lui) est appelé "Khalilullah", l\'ami intime d\'Allah. Ce titre lui est accordé en raison de sa foi totale et de sa soumission exemplaire à Allah.',
    sources: [{ type: 'quran', reference: 'An-Nisa:125', detail: 'Allah prit Ibrahim pour ami intime' }],
  },
  {
    text: 'Quel prophète fut envoyé au peuple de Thamoud ?',
    theme: 'prophets', difficulty: 'medium', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: 'Salih', is_correct: true },
      { text: 'Hud', is_correct: false },
      { text: 'Lut', is_correct: false },
      { text: 'Shu\'ayb', is_correct: false },
    ],
    explanation: 'Le prophète Salih (paix sur lui) fut envoyé au peuple de Thamoud. Allah lui accorda la chamelle comme signe miraculeux. Le peuple de Thamoud tua la chamelle et fut détruit par une grande clameur (As-Sayhah).',
    sources: [{ type: 'quran', reference: 'Al-Araf:73-79', detail: 'Histoire du prophète Salih et Thamoud' }],
  },
  {
    text: 'Yusuf (Joseph) avait combien de frères selon le Coran ?',
    theme: 'prophets', difficulty: 'medium', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: '11 frères', is_correct: true },
      { text: '10 frères', is_correct: false },
      { text: '12 frères', is_correct: false },
      { text: '9 frères', is_correct: false },
    ],
    explanation: 'Selon le Coran, Yusuf avait 11 frères (au total 12 fils de Ya\'qub). Dans sa vision, il vit 11 étoiles, le soleil et la lune se prosterner devant lui, symbolisant ses frères, son père et sa mère.',
    sources: [{ type: 'quran', reference: 'Yusuf:4', detail: 'Rêve de Yusuf avec 11 étoiles = 11 frères' }],
  },
  {
    text: 'Adam (paix sur lui) est le premier prophète envoyé par Allah.',
    theme: 'prophets', difficulty: 'easy', type: 'true_false', status: 'approved', language: 'fr',
    options: [
      { text: 'Vrai', is_correct: true },
      { text: 'Faux', is_correct: false },
    ],
    explanation: 'Adam (paix sur lui) est considéré comme le premier homme et le premier prophète selon l\'islam. Allah lui apprit les noms de toutes choses et en fit son khalife sur Terre.',
    sources: [{ type: 'quran', reference: 'Al-Baqarah:30-37', detail: 'Création d\'Adam et son statut de prophète' }],
  },
  {
    text: 'Quel prophète construisit la Ka\'ba avec son fils ?',
    theme: 'prophets', difficulty: 'easy', type: 'qcm', status: 'pending_review', language: 'fr',
    options: [
      { text: 'Ibrahim et Ismail', is_correct: true },
      { text: 'Adam et Hawa', is_correct: false },
      { text: 'Nuh et Shem', is_correct: false },
      { text: 'Sulayman et Dawud', is_correct: false },
    ],
    explanation: 'Ibrahim (Abraham) et son fils Ismail (Ismaël) élevèrent les fondations de la Ka\'ba à La Mecque, en invoquant Allah de l\'accepter. C\'est mentionné clairement dans le Coran.',
    sources: [{ type: 'quran', reference: 'Al-Baqarah:127', detail: 'Ibrahim et Ismail construisant la Ka\'ba' }],
  },

  // ── Prophet Muhammad ﷺ (5) ──────────────────────────────────────────────
  {
    text: 'En quelle année est né le Prophète Muhammad ﷺ ?',
    theme: 'prophet_muhammad', difficulty: 'medium', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: '570 après J.-C. (Année de l\'Éléphant)', is_correct: true },
      { text: '565 après J.-C.', is_correct: false },
      { text: '580 après J.-C.', is_correct: false },
      { text: '575 après J.-C.', is_correct: false },
    ],
    explanation: 'Le Prophète Muhammad ﷺ naquit en l\'an 570 après J.-C., connue comme l\'Année de l\'Éléphant (\'Am al-Fil), l\'année où Abraha tenta de détruire la Ka\'ba avec des éléphants.',
    sources: [{ type: 'quran', reference: 'Al-Fil:1-5', detail: 'Sourate de l\'Éléphant, contexte de la naissance du Prophète' }],
  },
  {
    text: 'Le Prophète Muhammad ﷺ reçut la première révélation coranique dans la grotte de Hira.',
    theme: 'prophet_muhammad', difficulty: 'easy', type: 'true_false', status: 'approved', language: 'fr',
    options: [
      { text: 'Vrai', is_correct: true },
      { text: 'Faux', is_correct: false },
    ],
    explanation: 'La première révélation fut reçue dans la grotte de Hira (Ghar Hira) sur le mont Nour, près de La Mecque. L\'ange Jibrîl (Gabriel) lui dit : "Lis !" (Iqra). Il avait alors 40 ans.',
    sources: [{ type: 'hadith', reference: 'Bukhari:3', detail: 'Récit du début de la Révélation' }],
  },
  {
    text: 'Quel était le surnom (laqab) du Prophète Muhammad ﷺ avant la prophétie ?',
    theme: 'prophet_muhammad', difficulty: 'easy', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: 'Al-Amin (Le Fidèle)', is_correct: true },
      { text: 'Al-Karim (Le Généreux)', is_correct: false },
      { text: 'As-Sadiq (Le Véridique)', is_correct: false },
      { text: 'Al-Hakim (Le Sage)', is_correct: false },
    ],
    explanation: 'Avant la prophétie, Muhammad ﷺ était connu à La Mecque sous le surnom d\'Al-Amin (Le Fidèle, le Digne de confiance) en raison de son honnêteté et de son intégrité exceptionnelles.',
    sources: [{ type: 'hadith', reference: 'Ibn Hisham — Sira An-Nabawiyya', detail: 'Biographie du Prophète avant la Révélation' }],
  },
  {
    text: 'En quelle année eut lieu l\'Hégire (migration vers Médine) ?',
    theme: 'prophet_muhammad', difficulty: 'medium', type: 'qcm', status: 'approved', language: 'fr',
    options: [
      { text: '622 après J.-C.', is_correct: true },
      { text: '615 après J.-C.', is_correct: false },
      { text: '630 après J.-C.', is_correct: false },
      { text: '610 après J.-C.', is_correct: false },
    ],
    explanation: 'L\'Hégire eut lieu en 622 après J.-C. Cette migration du Prophète ﷺ et des musulmans de La Mecque vers Médine marque le début du calendrier islamique (calendrier hégirien).',
    sources: [{ type: 'hadith', reference: 'Bukhari:3906', detail: 'Récit de l\'Hégire vers Médine' }],
  },
  {
    text: 'Quel est le dernier verset révélé du Coran selon la majorité des savants ?',
    theme: 'prophet_muhammad', difficulty: 'advanced', type: 'qcm', status: 'draft', language: 'fr',
    options: [
      { text: 'Al-Maidah:3 (Aujourd\'hui j\'ai parachevé votre religion)', is_correct: true },
      { text: 'Al-Baqarah:281 (Craignez un jour où vous serez ramenés à Allah)', is_correct: false },
      { text: 'An-Nasr:3 (Glorifie les louanges de ton Seigneur)', is_correct: false },
      { text: 'Al-Asr:3 (Sauf ceux qui croient et accomplissent de bonnes œuvres)', is_correct: false },
    ],
    explanation: 'Selon la majorité des savants, Al-Maidah:3 fut révélé lors du pèlerinage d\'adieu et est considéré comme l\'un des derniers versets à descendre, proclamant l\'achèvement de la religion.',
    sources: [
      { type: 'quran', reference: 'Al-Maidah:3', detail: 'Verset de l\'achèvement de la religion' },
      { type: 'hadith', reference: 'Bukhari:45', detail: 'Contexte de la révélation' },
    ],
  },
];

async function seed() {
  console.log(`Seeding ${questions.length} questions…`);

  for (const q of questions) {
    const { sources, ...questionData } = q;

    const { data: inserted, error: insertErr } = await supabase
      .from('questions')
      .insert({
        text: questionData.text,
        theme: questionData.theme,
        difficulty: questionData.difficulty,
        type: questionData.type,
        options: questionData.options,
        explanation: questionData.explanation,
        status: questionData.status,
        language: questionData.language,
        created_by: SEEDER_USER_ID,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error(`Failed to insert question "${q.text.slice(0, 40)}…":`, insertErr?.message);
      continue;
    }

    const { error: srcErr } = await supabase
      .from('question_sources')
      .insert(
        sources.map(s => ({
          question_id: inserted.id,
          type: s.type,
          reference: s.reference,
          detail: s.detail ?? null,
        })),
      );

    if (srcErr) {
      console.error(`Failed to insert sources for question ${inserted.id}:`, srcErr.message);
    } else {
      console.log(`✓ [${q.status}] ${q.theme}/${q.difficulty} — ${q.text.slice(0, 50)}…`);
    }
  }

  console.log('Seed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
