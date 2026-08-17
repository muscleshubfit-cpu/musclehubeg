# Force Deploy Trigger

This file was created to trigger a new Vercel deployment after the
GitHub-Vercel webhook connection was lost.

Current state:
- Local git HEAD: 98a5ac9
- GitHub main HEAD: 67b7e69
- Live Vercel: serving OLD deploy from e843b0b (before price updates)

Action needed: Vercel must rebuild from latest main branch (67b7e69)
which contains the new membership pricing:
- Premium: $14.99/mo or $119/yr
- Pro: $29.99/mo or $239/yr
- Coaching: $39.99/mo or $359/yr
