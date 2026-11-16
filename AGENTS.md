# Project architecture

This is Al-Kafeel Energy Solutions, an Arabic RTL internal solar inventory and sales management application. It is a React/Vite client with a Hono Netlify Server, not a full-stack framework template.

- `src/main.jsx`: application layout, dashboard, department screens, forms, chart components, authenticated fetch flow, and print view.
- `src/styles.css`: responsive layout and RTL design system; muted evergreen, warm gold, white panels; Tajawal typography. Desktop navigation is on the right. Includes print and reduced-motion styles.
- `src/demo.js`: explicitly illustrative, read-only sample data; never persisted or mixed into real business state.
- `netlify/server/index.mjs`: sole server entrypoint. All request-driven APIs live here under `/api/*`.
- `db/schema.ts`, `db/index.mjs`: Drizzle schema and native Netlify Database adapter.
- `netlify/database/migrations`: deployment-applied migration SQL and schema snapshots.
- `public`: install manifest, service worker, and brand application icons.

## Conventions and constraints

Use Arabic user-facing copy and RTL logical positioning; document IDs are LTR. Store monetary values as Postgres numeric and quantities as integer. Preserve historical document snapshots. Update inventory and invoice collections inside transactions with row locks, and keep lock ordering stable. Never silently convert a quotation twice. Never allow a receipt above an invoice's remaining balance. Stock cannot be directly rewritten by the catalog editing endpoint.

All private reads and writes require a remotely verified Netlify Identity JWT from the `nf_jwt` cookie. Never decode a JWT and trust its claims without verification. Confirmed email maps to team membership in the database; Identity's server-controlled `admin` role takes precedence. New registrations do not gain access automatically. First owner bootstrap happens in Netlify's Identity dashboard. Client navigation visibility is convenience; enforce every permission on the server. Sales responses omit product and document item costs. Cross-origin writes are rejected.

Persistence must use Netlify Database. Use `drizzle-orm@beta` and `drizzle-kit@beta` for the Netlify adapter. Any schema change requires a generated migration. Node 24 is required for Netlify Server and direct import of the plain TypeScript schema. Static files win over server routing; server is explicitly limited to `/api/*`. Do not add a catch-all SPA rewrite that captures API requests.

The PWA requires network access for business operations. Do not cache private API data or Identity responses, and do not imply that unsent transactions are saved offline. Currency customization only changes new-document labels; it does not perform exchange-rate conversions. Operational cash flow and gross profit reports are distinct from double-entry accounting.

Do not expose secrets. Do not create commits or pull requests manually. Build and runtime validation are performed by the hosting pipeline; respect run-specific restrictions on local validation commands. Keep README and the run result summary current when behavior changes.
