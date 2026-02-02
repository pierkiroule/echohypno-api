# echohypno-api

API REST minimaliste en Node.js + TypeScript pour composer des scènes transmédiatiques à partir d'emojis et de métadonnées Supabase.

## Prérequis

- Node.js 18+
- Projet Supabase avec les tables `media_semantics` et `emoji_media`

## Installation

```bash
npm install
```

## Configuration

Copiez `.env.example` et remplissez les variables :

```bash
cp .env.example .env
```

- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : clé service role (serveur uniquement)
- `CACHE_TTL_MS` : durée de cache en ms (optionnel)

## Démarrage

```bash
npm run dev
```

## Endpoints

### POST /scene

Construit une scène à partir d'emojis.

```json
{
  "emojis": ["🌊", "🕯️", "🪶"],
  "seed": "optional"
}
```

### GET /diagnostics

Retourne l'état Supabase, l'accès au bucket et le décompte des médias.

### POST /admin/cache/clear

Nettoie le cache en mémoire.

## Notes

- Les routes restent fines, la logique se trouve dans `src/engine`.
- Les sélections sont seedées pour permettre la reproductibilité.
