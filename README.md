# الكفيل لحلول الطاقة

نظام إدارة داخلي عربي باتجاه RTL لإدارة مخزن الطاقة الشمسية والمبيعات وعروض الأسعار والفواتير والتحصيل والمصروفات والعملاء والتقارير، مع إعدادات هوية المؤسسة ودخول مباشر بصلاحيات كاملة. العملة الافتراضية هي الدينار العراقي ويمكن تغيير رمزها من الإعدادات.

## Technologies

React 19 and Vite serve the frontend. A Hono Netlify Server handles `/api/*`. Netlify Database (Postgres), Drizzle ORM's beta Netlify adapter, and generated SQL migrations provide persistent storage. Lucide provides interface icons. The web manifest and service worker support installation on compatible phones and computers.

## Local development

Install Node.js 24 and dependencies with `npm install`. Link the project to its Netlify site, then run:

```sh
netlify dev --port 8889
```

Netlify Database credentials are supplied by the platform. Do not put database credentials in client code.

## Direct access

The application opens directly without a username, email, password, invitation, or Identity session. Every visitor with the site link has full administrator access to real inventory, sales, financial data, reports, settings, and logo uploads. This public administration mode was explicitly requested by the owner. The app does not depend on Identity availability.

Login, recovery, logout, and employee permission controls were removed. Existing Identity accounts and database membership records were not changed; they do not restrict access. New audit entries use the shared actor `وصول عام`, so actions cannot be attributed to individual employees. Historical audit records retain their original actors.

The initial view loads real database records automatically. Loading or network failures show a retry screen; sample figures are never shown as real business state. The sample module remains illustrative and only supplies category constants to the application. No sample data is inserted into the business database.

## Business rules

Invoices lock product rows and atomically reduce available stock, record the invoice, and record any initial receipt. Insufficient stock prevents the entire transaction. Quotes reserve no inventory. Quote conversion is locked and can happen only once, with current catalog prices. Additional invoice receipts lock the document and cannot exceed its outstanding amount. Posted documents retain item descriptions, prices, customer name, and currency. Catalog and customer edits do not rewrite historical invoices. Inventory increases use explicit stock receipts.

Cash flow means receipts minus expenses; gross profit means invoiced sale value minus captured product cost. These are operational reports, not a complete double-entry accounting ledger. The currency setting changes the label for new documents and does not convert historical balances. Do not mix currencies within a financial ledger; historical documents retain their currency labels.

The open page refreshes database data every 15 seconds while visible and online. Mutations refresh immediately, and reconnecting, focusing the window, or returning to the tab triggers a refresh. A repeatable-read transaction provides a consistent database snapshot per refresh. Writes require an internet connection. Business records, authentication endpoints, and API responses are never cached by the service worker. Browser installation steps are available from the sidebar.

Invoices and quotations can be printed or saved as PDF through the browser. Reports also support A4 printing with repeating table headers, multi-page tables, institution branding, filter context, and signature spaces. Tables export UTF-8 CSV with an Arabic-compatible byte order mark and spreadsheet formula escaping.

## Schema changes

Edit `db/schema.ts` and generate the accompanying migration:

```sh
npx drizzle-kit generate --name describe_schema_change
```

Commit schema and migration together through the hosting workflow. Migrations in `netlify/database/migrations` are applied at deployment. The platform performs build validation; no local build or test commands were run during initial implementation.

## Reports and access controls

The report center offers ten report types with full administrator visibility: a comprehensive overview, invoice details, quotations, item sales, customer account statements, receivable aging, current inventory, material movements, cash receipts and expenses, and the audit trail. Filters include date range, customer, product, document status, and document currency where applicable. Individual invoice and quote views remain printable. CSV exports preserve the selected report and filters.

Customer statements include opening balance, debits, credits, and closing balance using transaction dates, including collections against older invoices. Item reports use historical invoice names and prices. Inventory reports show current balances, not historical stock at a selected date. Receivable aging uses invoice creation dates rather than contractual due dates. Date boundaries and the on-screen clock use the device timezone. Invoice paid and outstanding figures reflect the latest snapshot, even when filtering old invoices. Cash-flow sections use the complete receipt/expense ledger for the selected dates and explicitly identify that scope; customer, product, document-status, and document-currency filters do not apply to those sections. Monetary reports do not convert currencies.

## Branding and shared workspace

Administrators can upload a PNG, JPEG, or WebP logo up to 512 KiB, use an HTTPS image URL, or clear the logo field to restore the default emblem. Binary logo uploads persist in Netlify Blobs; the active logo reference stays in the existing Netlify Database settings row. Logo reads and uploads use the same public access mode as the other APIs. Uploads use fresh identifiers, file-signature checks, and strong consistency so devices can display the new image immediately after synchronization. No schema changes or migrations were needed for this update.

A live clock and date appear in the header. The sidebar describes the shared direct-access mode. Internet access is required for loading, saving, and synchronization. Cross-origin writes are rejected, and API responses remain uncached. Business writes are sent once and never automatically replayed. The installed application uses the same deployed server and database as the browser; it does not maintain a separate offline business database. Production and deploy previews intentionally have separate database branches.

## Verification

`node --test tests/open-access.test.mjs tests/report-data.test.mjs` covers anonymous administrator access, the shared audit actor, cross-origin write rejection, uncached fetches, no write replay, and report calculations. JSX parsing and server syntax checks verify the changed source. Full builds and deployed database/Blob validation remain the hosting pipeline's responsibility; no local build was run. No schema or migration changes were required.

## Local typography and accessibility checks

Tajawal's five existing font weights are served from `public/fonts` with the SIL Open Font License included. The entry page no longer waits for a Google Fonts stylesheet or remote font downloads. This removes external font requests from page loading and from the accessibility plugin's direct-file scan, where a remote resource can exhaust Pa11y's 30-second timeout. Font signatures, weight references, local paths, and the license were checked without running a build. A subsequent deployment still hit the same Pa11y timeout, so local fonts alone did not resolve that failure.


## Accessibility audit deployment fix

The legacy UI-installed `netlify-plugin-a11y@0.0.12` uses Pa11y 5 to open build-output HTML files directly. Its timeout exception fails the build even with `resultMode = "warn"`, and its exposed inputs provide no timeout or HTTP-serving configuration. The application and server bundles succeeded in both failed deployment logs.

`netlify.toml` overrides that legacy plugin's default scan with an empty `checkPaths` list, explicitly skipping its incompatible direct-file audit. The already installed Lighthouse plugin is explicitly configured to audit `/` over HTTP after deployment; its reports include accessibility. This replaces the old blocking Pa11y check with Lighthouse reporting, not an equivalent predeployment accessibility gate. Other build checks remain configured as before. TOML syntax and the targeted plugin settings were checked; no build or deployment command was run locally. The next hosting pipeline run must confirm deployment and produce the Lighthouse report.

The HTML entry document uses an uppercase `DOCTYPE` and HTML-style void elements (`meta` and `link` without XML self-closing slashes), matching the deployment HTML validator. `html-validate@10.5.0 index.html` passed after fixing all 13 reported formatting errors. The application build was not run locally; the hosting pipeline validates the emitted document and remaining deployment plugins.
