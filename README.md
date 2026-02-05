# echohypno-api-public

API publique EchoHypno déployée sur Vercel via **Node.js Functions** (sans Next.js).

## Architecture

Structure attendue et livrée :

```
/api
  compose.ts
package.json
vercel.json
README.md
```

- Runtime Vercel : `@vercel/node@3.2.16`
- Endpoint public : `POST /api/compose`
- Source de données : Supabase (`emoji_climate_weights`, `media_assets`)

## Variables d’environnement (obligatoires)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Aucune autre variable n’est requise côté API.

## Endpoint

### `POST /api/compose`

Payload attendu :

```json
{
  "emojis": ["🌊", "🌑", "🕯️"]
}
```

Contraintes :
- `emojis` doit contenir exactement 3 chaînes non vides.

Réponse (format strict) :

```json
{
  "emojis": ["🌊", "🌑", "🕯️"],
  "climate": "mystic",
  "media": {
    "music": "...",
    "video": "...",
    "shader": "...",
    "text": "...",
    "voices": ["...", "...", "..."]
  },
  "oracle": {
    "text": "🌊 · 🌑 · 🕯️"
  }
}
```

## CORS

L’API renvoie les headers CORS publics (`Access-Control-Allow-Origin: *`) et gère `OPTIONS`, pour éviter les erreurs front de type `Failed to fetch`.

## Déploiement Vercel

1. Importer ce repo dans Vercel.
2. Définir `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
3. Vérifier que **Vercel Authentication / Deployment Protection** est désactivée pour cet environnement afin de rendre l’API accessible publiquement.

## Vérifications curl

```bash
curl -i https://echohypno-api-public.vercel.app/api/compose \
  -H "Content-Type: application/json" \
  -d '{"emojis":["🌊","🌑","🕯️"]}'

curl -i https://echohypno-api-public.vercel.app/api/compose \
  -H "Content-Type: application/json" \
  -d '{"emojis":["🌱","🌬️","🌸"]}'
```

## Frontend (ajustements minimaux)

Dans le front React/Vite :
- utiliser la clé **ANON** pour `fetchEmojiCatalog`
- ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY`
- définir `VITE_ECHOHYPNO_API_URL` vers l’URL publique de cette API

Aucun fichier frontend n’est inclus ni modifié dans ce repository API.
