# Ironman Lab V1.6 Clean Build

Clean repo version. Upload only these files/folders to GitHub:

- src
- netlify
- index.html
- package.json
- package-lock.json
- README.md
- supabase.sql / supabase_v1_1.sql if needed

Do NOT upload node_modules or dist.

## V1.6 adds

- Clean build structure for a new repo
- Editable Race Setup page
- Custom race name
- Custom race date
- Custom dashboard subtitle
- Countdown updates from your selected race
- Generic Race Predictor instead of Maryland-only wording
- V1.5 AI Screenshot backend still included at netlify/functions/analyze-garmin.js

## Netlify environment variables

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- OPENAI_API_KEY
- NODE_VERSION = 22

Netlify settings for clean repo:

- Base directory: leave blank
- Build command: npm run build
- Publish directory: dist
- Functions directory: netlify/functions
