# الكفيل لحلول الطاقة

نظام إدارة داخلي عربي باتجاه RTL لإدارة مخزن الطاقة الشمسية والمبيعات وعروض الأسعار والفواتير والتحصيل والمصروفات والعملاء والتقارير، مع إعدادات هوية المؤسسة وسجل الفريق. العملة الافتراضية هي الدينار العراقي ويمكن تغيير رمزها من الإعدادات.

## Technologies

React 19 and Vite serve the frontend. A Hono Netlify Server handles `/api/*`. Netlify Database (Postgres), Drizzle ORM's beta Netlify adapter, and generated SQL migrations provide persistent storage. Lucide provides interface icons. The web manifest and service worker support installation on compatible phones and computers.

## Local development

Install Node.js 24 and dependencies with `npm install`. Link the project to its Netlify site, then run:

```sh
netlify dev --port 8889
```

Netlify Database credentials are supplied by the platform. Do not put database credentials in client code.

## Direct access without login

The application opens the real shared workspace immediately, without an account, password, invitation, or Identity session. Anyone who can open the link can read and modify inventory, customers, invoices, finances, reports, branding, settings, and the team directory. All requests use the shared admin business context. Team roles are descriptive directory information and do not limit access. Existing member rows and business records are preserved.

Startup loads `/api/state` directly and shows a loading state or a retry button on failure. Illustrative demo records are never displayed as real data or persisted. Requests do not refresh or verify Identity sessions. Operations are attributed to `وصول مشترك دون حساب`; existing historical attribution remains unchanged. Cross-origin writes remain rejected, and API responses remain uncached.

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

## Reports and team directory

The shared workspace offers all ten report types: a comprehensive overview, invoice details, quotations, item sales, customer account statements, receivable aging, current inventory, material movements, cash receipts and expenses, and the audit trail. Filters include date range, customer, product, document status, and document currency where applicable. Individual invoice and quote views remain printable. CSV exports preserve the selected report and filters.

Customer statements include opening balance, debits, credits, and closing balance using transaction dates, including collections against older invoices. All visitors can view financial reports and gross profit in the shared workspace. Item reports use historical invoice names and prices. Inventory reports show current balances, not historical stock at a selected date. Receivable aging uses invoice creation dates rather than contractual due dates. Date boundaries and the on-screen clock use the device timezone. Invoice paid and outstanding figures reflect the latest snapshot, even when filtering old invoices. Cash-flow sections use the complete receipt/expense ledger for the selected dates and explicitly identify that scope; customer, product, document-status, and document-currency filters do not apply to those sections. Monetary reports do not convert currencies.

The team screen stores employee names, email addresses, and organizational roles. Editing or removing an entry does not grant or revoke access in this public workspace.

## Branding

Visitors can upload a PNG, JPEG, or WebP logo up to 512 KiB, use an HTTPS image URL, or restore the default emblem. Binary uploads persist in Netlify Blobs; the active reference remains in Netlify Database. Upload validation, fresh identifiers, and strong consistency are retained. No schema changes or migrations were needed.

A live clock and date appear in the header. Account and sign-out controls have been removed. Internet access is still required for loading, saving, synchronization, and uploads. The installed application uses the same server and database as the browser. Production and deploy previews retain separate database branches.

## Verification

`node --test tests/report-data.test.mjs` checks report currency isolation, date ranges, historical snapshots, role-specific financial columns, customer opening balances and receipts, receivable ages, and current-stock semantics. Syntax checks cover the changed JavaScript and JSX. Full builds and deployed database/Blob validation remain the hosting pipeline's responsibility; no local build was run.

## Local typography and accessibility checks

Tajawal's five existing font weights are served from `public/fonts` with the SIL Open Font License included. The entry page no longer waits for a Google Fonts stylesheet or remote font downloads. This removes external font requests from page loading and from the accessibility plugin's direct-file scan, where a remote resource can exhaust Pa11y's 30-second timeout. Font signatures, weight references, local paths, and the license were checked without running a build. A subsequent deployment still hit the same Pa11y timeout, so local fonts alone did not resolve that failure.


## Accessibility audit deployment fix

The legacy UI-installed `netlify-plugin-a11y@0.0.12` uses Pa11y 5 to open build-output HTML files directly. Its timeout exception fails the build even with `resultMode = "warn"`, and its exposed inputs provide no timeout or HTTP-serving configuration. The application and server bundles succeeded in both failed deployment logs.

`netlify.toml` overrides that legacy plugin's default scan with an empty `checkPaths` list, explicitly skipping its incompatible direct-file audit. The already installed Lighthouse plugin is explicitly configured to audit `/` over HTTP after deployment; its reports include accessibility. This replaces the old blocking Pa11y check with Lighthouse reporting, not an equivalent predeployment accessibility gate. Other build checks remain configured as before. TOML syntax and the targeted plugin settings were checked; no build or deployment command was run locally. The next hosting pipeline run must confirm deployment and produce the Lighthouse report.

The HTML entry document uses an uppercase `DOCTYPE` and HTML-style void elements (`meta` and `link` without XML self-closing slashes), matching the deployment HTML validator. `html-validate@10.5.0 index.html` passed after fixing all 13 reported formatting errors. The application build was not run locally; the hosting pipeline validates the emitted document and remaining deployment plugins.

## Application entry protection

The public site returned HTTP 200 with an empty React root and no application script. The dashboard-installed `netlify-plugin-amp-server-side-rendering` had converted Vite's ordinary HTML to AMP and removed the JavaScript module that mounts the interface, explaining the blank page and Lighthouse's NO_FCP result.

The local `preserve-app-entry` build plugin is registered at the end of `netlify.toml`. It captures Vite's entry in `onBuild`, before AMP postprocessing, and restores it in `onPostBuild` if the HTML has an AMP marker. It validates both the module script reference and the actual nonempty JavaScript file under the publish directory's `assets` folder. A missing script or asset fails deployment, including when another plugin removes the asset after capture. Unconverted HTML remains untouched but is still validated. A failed capture clears the previous snapshot, and restoration requires the same publish directory. Keep this plugin after HTML postprocessors.

`node --test tests/app-entry.test.mjs` passed five regression tests covering AMP restoration, missing and empty assets, unconverted HTML preservation, postprocessing damage, missing scripts, and stale snapshot prevention. Plugin syntax and whitespace checks passed. No application build was run locally; the hosting pipeline performs full build and deployment validation.

## Direct-access verification

`node --test tests/workspace-access.test.mjs` covers access with no cookies, ignored stale Identity cookies, shared audit attribution, same-origin writes, cross-origin rejection, no-store responses, and direct client requests without write replay. JSX parsing and server syntax checks complement the regression tests. The hosting pipeline performs the full build and deployed database/Blob validation.

## Request error handling

Malformed JSON and non-object form payloads return an Arabic validation message with HTTP 400 before reaching business handlers. Multipart logo uploads remain supported. Duplicate unique values and invalid related records return HTTP 409; numeric overflow returns HTTP 400. Database query text and driver details are not exposed.

Client requests use a 15-second timeout, show Arabic connection feedback, and never replay writes automatically. Connection failures instruct users to verify the transaction state before retrying because the server may already have saved it. A synchronous save guard prevents overlapping business mutations from rapid submissions in the same interface. This guard is not a cross-device idempotency guarantee.

All 19 tests passed with `node --test tests/*.test.mjs`; JSX parsing and server syntax checks passed. A read-only request to `/api/state` returned HTTP 200 with the expected sections, and malformed product requests returned HTTP 400 without database writes. No local build was run; deployed validation remains with the hosting pipeline.
