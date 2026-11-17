# Project architecture

This is Al-Kafeel Energy Solutions, an Arabic RTL internal solar inventory and sales management application. It is a React/Vite client with a Hono Netlify Server, not a full-stack framework template.

- `src/main.jsx`: application layout, dashboard, department screens, forms, chart components, direct API fetch flow, and print view.
- `src/styles.css`: responsive layout and RTL design system; muted evergreen, warm gold, white panels; Tajawal typography. Desktop navigation is on the right. Includes print and reduced-motion styles.
- `src/demo.js`: explicitly illustrative, read-only sample data; never persisted or mixed into real business state.
- `netlify/server/index.mjs`: sole server entrypoint. All request-driven APIs live here under `/api/*`.
- `db/schema.ts`, `db/index.mjs`: Drizzle schema and native Netlify Database adapter.
- `netlify/database/migrations`: deployment-applied migration SQL and schema snapshots.
- `public`: install manifest, service worker, and brand application icons.

## Conventions and constraints

Use Arabic user-facing copy and RTL logical positioning; document IDs are LTR. Store monetary values as Postgres numeric and quantities as integer. Preserve historical document snapshots. Update inventory and invoice collections inside transactions with row locks, and keep lock ordering stable. Never silently convert a quotation twice. Never allow a receipt above an invoice's remaining balance. Stock cannot be directly rewritten by the catalog editing endpoint.

Access is intentionally public with full administrator privileges for every visitor, as explicitly requested by the owner. Do not reintroduce login, password, or membership gates. All APIs use the shared audit actor `وصول عام`; never attribute anonymous actions to an employee. Reject cross-origin writes and keep business responses uncached. Legacy membership records remain preserved but do not control access.

Persistence must use Netlify Database. Use `drizzle-orm@beta` and `drizzle-kit@beta` for the Netlify adapter. Any schema change requires a generated migration. Node 24 is required for Netlify Server and direct import of the plain TypeScript schema. Static files win over server routing; server is explicitly limited to `/api/*`. Do not add a catch-all SPA rewrite that captures API requests.

The PWA requires network access for business operations. Do not cache private API data or Identity responses, and do not imply that unsent transactions are saved offline. Currency customization only changes new-document labels; it does not perform exchange-rate conversions. Operational cash flow and gross profit reports are distinct from double-entry accounting.

Do not expose secrets. Do not create commits or pull requests manually. Build and runtime validation are performed by the hosting pipeline; respect run-specific restrictions on local validation commands. Keep README and the run result summary current when behavior changes.
