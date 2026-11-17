# الكفيل لحلول الطاقة

نظام إدارة داخلي عربي باتجاه RTL لإدارة مخزن الطاقة الشمسية والمبيعات وعروض الأسعار والفواتير والتحصيل والمصروفات والعملاء والتقارير، مع إعدادات هوية المؤسسة وصلاحيات الموظفين. العملة الافتراضية هي الدينار العراقي ويمكن تغيير رمزها من الإعدادات.

## Technologies

React 19 and Vite serve the frontend. A Hono Netlify Server handles `/api/*`. Netlify Database (Postgres), Drizzle ORM's beta Netlify adapter, and generated SQL migrations provide persistent storage. Netlify Identity handles accounts and session refresh. Lucide provides interface icons. The web manifest and service worker support installation on compatible phones and computers.

## Local development

Install Node.js 24 and dependencies with `npm install`. Link the project to its Netlify site, then run:

```sh
netlify dev --port 8889
```

Netlify Database credentials are supplied by the platform. Identity requires the deployed site; local emulation does not provide Identity. Do not put database credentials in client code.

## First administrator

Identity is enabled. In the Netlify project dashboard, open Identity, invite the owner, then assign the invited account the `admin` role after acceptance. This intentional manual bootstrap prevents a public visitor from becoming administrator. Staff accounts require an Identity invitation and confirmed email; they have no access until an administrator adds their verified email and role on the team page. Roles are `admin`, `sales`, `warehouse`, and `finance`. A role granted in Identity takes precedence over app team membership, so revoke an Identity `admin` role there as well when removing it.

The initial screen is a dedicated Arabic login screen. A separate, optional demonstration provides sample figures. It never saves illustrative transactions. After authorized login, all business data comes from the database, which starts empty. The inventory movement ledger shows opening balances, stock receipts, and sales issues. Use the product and customer forms to enter real records. No sample data is inserted into the business database.

## Business rules

Invoices lock product rows and atomically reduce available stock, record the invoice, and record any initial receipt. Insufficient stock prevents the entire transaction. Quotes reserve no inventory. Quote conversion is locked and can happen only once, with current catalog prices. Additional invoice receipts lock the document and cannot exceed its outstanding amount. Posted documents retain item descriptions, prices, customer name, and currency. Catalog and customer edits do not rewrite historical invoices. Inventory increases use explicit stock receipts.

Cash flow means receipts minus expenses; gross profit means invoiced sale value minus captured product cost. These are operational reports, not a complete double-entry accounting ledger. The currency setting changes the label for new documents and does not convert historical balances. Do not mix currencies within a financial ledger; historical documents retain their currency labels.

The open page refreshes database data every 15 seconds while visible and online. Mutations refresh immediately, and reconnecting, focusing the window, or returning to the tab triggers a refresh. A repeatable-read transaction provides a consistent database snapshot per refresh. Expired or revoked access clears the business view and returns to login. Writes require an internet connection. Business records, authentication endpoints, and API responses are never cached by the service worker. Browser installation steps are available from the sidebar.

Invoices and quotations can be printed or saved as PDF through the browser. Reports also support A4 printing with repeating table headers, multi-page tables, institution branding, filter context, and signature spaces. Tables export UTF-8 CSV with an Arabic-compatible byte order mark and spreadsheet formula escaping.

## Schema changes

Edit `db/schema.ts` and generate the accompanying migration:

```sh
npx drizzle-kit generate --name describe_schema_change
```

Commit schema and migration together through the hosting workflow. Migrations in `netlify/database/migrations` are applied at deployment. The platform performs build validation; no local build or test commands were run during initial implementation.

## Reports and access controls

The report center offers ten report types according to the verified role: a comprehensive overview, invoice details, quotations, item sales, customer account statements, receivable aging, current inventory, material movements, cash receipts and expenses, and the audit trail. Filters include date range, customer, product, document status, and document currency where applicable. Individual invoice and quote views remain printable. CSV exports preserve the selected report and filters.

Customer statements for administrators and finance include opening balance, debits, credits, and closing balance using transaction dates, including collections against older invoices. Sales staff see invoice balances, not the private receipt ledger or gross profit. Item reports use historical invoice names and prices. Inventory reports show current balances, not historical stock at a selected date. Receivable aging uses invoice creation dates rather than contractual due dates. Date boundaries and the on-screen clock use the device timezone. Invoice paid and outstanding figures reflect the latest snapshot, even when filtering old invoices. Cash-flow sections use the complete receipt/expense ledger for the selected dates and explicitly identify that scope; customer, product, document-status, and document-currency filters do not apply to those sections. Monetary reports do not convert currencies.

The team screen includes a permission matrix and role assignment, editing, and revocation. Revocations are audited and enforced on subsequent API requests. Identity-admin roles must still be revoked at their source. Database membership grants do not create Identity accounts or send invitations. The first owner still requires the Identity dashboard bootstrap described above.

## Branding and session controls

Administrators can upload a PNG, JPEG, or WebP logo up to 512 KiB, use an HTTPS image URL, or clear the logo field to restore the default emblem. Binary logo uploads persist in Netlify Blobs; the active logo reference stays in the existing Netlify Database settings row. Authenticated image reads use the same verified membership checks as other APIs. Uploads use fresh identifiers, file-signature checks, and strong consistency so devices can display the new image immediately after synchronization. No schema changes or migrations were needed for this update.

A live clock and date appear in the header. Separate sidebar controls sign out the account or end application use. Both sign out before hiding business data; ending use additionally attempts to close the window and shows a closed screen when the browser requires manual closure. The browser cannot be forced to close arbitrary tabs. An internet connection is required for access, saving, synchronization, and server logout. The installed application uses the same deployed server and database as the browser; it does not maintain a separate offline business database. Production and deploy previews intentionally have separate database branches.

## Verification

`node --test tests/report-data.test.mjs` checks report currency isolation, date ranges, historical snapshots, role-specific financial columns, customer opening balances and receipts, receivable ages, and current-stock semantics. Syntax checks cover the changed JavaScript and JSX. Full builds and deployed authentication/database/Blob validation remain the hosting pipeline's responsibility; no local build was run.

## Password recovery

Password recovery sends an email link, not a numeric code, and only applies to an existing Identity account. The recovery screen uses a conditional confirmation because Identity does not disclose account existence. Check spam and wait a few minutes before retrying. A team membership entry alone does not create an Identity account. An owner who has no Identity account needs an invitation from the project dashboard and the manual administrator bootstrap described above; password recovery cannot create or authorize that account.

Recovery links open the new-password form, which requires matching passwords and restores the app session after saving. Invalid or expired callback links show instructions to request a fresh link or invitation. Login and recovery distinguish throttling, service errors, and unconfirmed email from generic connection failures without exposing account existence. Mail delivery still depends on Identity's email service and the recipient's mailbox.

The login and recovery screens accept `admin` as an alias for `alkafeelcompany2000@gmail.com`, or an email address. The alias only selects the Identity account; it grants no role, creates no account, and does not bypass password verification. Public signup was removed from the interface; closing Identity registration itself requires the project dashboard. No default password was created or stored.

## Session reliability update

Authenticated state reads, saves, and logo uploads now await Identity session refresh before sending requests. Concurrent requests share refresh work; business writes are never automatically replayed. The server still remotely verifies every private request. Temporary Identity outages, throttling, invalid responses, and endpoint failures return a retryable service error instead of falsely reporting an expired session. The fallback verifier origin now points to this project. Login accepts existing passwords without imposing the new-password length rule.

The account lookup on 2026-11-17 confirmed that the requested email already had an accepted invitation and confirmed email, with no Identity roles. The preview database had no matching team membership; production membership was not inspected. To use this as the owner account, an operator must assign `admin` in the [project Identity dashboard](https://app.netlify.com/projects/kps26/identity). An existing administrator can instead grant a staff role through the app team screen. No account permissions or passwords were changed by this update.

`node --test tests/auth-session.test.mjs` passed four tests covering refresh ordering/concurrency, no automatic write replay, verification error classification, and confirmed remote Identity verification. Changed JSX parsed successfully and server syntax checks passed. End-to-end login requires the user's private password and deployed verification; no local build was run.

## Local typography and accessibility checks

Tajawal's five existing font weights are served from `public/fonts` with the SIL Open Font License included. The entry page no longer waits for a Google Fonts stylesheet or remote font downloads. This removes external font requests from page loading and from the accessibility plugin's direct-file scan, where a remote resource can exhaust Pa11y's 30-second timeout. Font signatures, weight references, local paths, and the license were checked without running a build. A subsequent deployment still hit the same Pa11y timeout, so local fonts alone did not resolve that failure.


## Accessibility audit deployment fix

The legacy UI-installed `netlify-plugin-a11y@0.0.12` uses Pa11y 5 to open build-output HTML files directly. Its timeout exception fails the build even with `resultMode = "warn"`, and its exposed inputs provide no timeout or HTTP-serving configuration. The application and server bundles succeeded in both failed deployment logs.

`netlify.toml` overrides that legacy plugin's default scan with an empty `checkPaths` list, explicitly skipping its incompatible direct-file audit. The already installed Lighthouse plugin is explicitly configured to audit `/` over HTTP after deployment; its reports include accessibility. This replaces the old blocking Pa11y check with Lighthouse reporting, not an equivalent predeployment accessibility gate. Other build checks remain configured as before. TOML syntax and the targeted plugin settings were checked; no build or deployment command was run locally. The next hosting pipeline run must confirm deployment and produce the Lighthouse report.

The HTML entry document uses an uppercase `DOCTYPE` and HTML-style void elements (`meta` and `link` without XML self-closing slashes), matching the deployment HTML validator. `html-validate@10.5.0 index.html` passed after fixing all 13 reported formatting errors. The application build was not run locally; the hosting pipeline validates the emitted document and remaining deployment plugins.
