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

The open page refreshes database data every 15 seconds while visible and online. Mutations refresh immediately, and reconnecting, focusing the window, or returning to the tab triggers a refresh. A repeatable-read transaction provides a consistent database snapshot per refresh. Expired or revoked access clears the business view and returns to login. Before data reads, saves, and logo uploads, the browser now awaits a shared Identity session refresh when the token is near expiry. Server verification uses the configured site URL with the current project domain as its fallback, rather than a legacy project domain. Only rejected credentials end the session; Identity outages, throttling, invalid responses, and timeouts show a temporary service error and keep an already open workspace available for retry. Requests still require remote verification and database permissions before accessing business records. Writes require an internet connection. Business records, authentication endpoints, and API responses are never cached by the service worker. Browser installation steps are available from the sidebar.

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

The login and recovery screens accept `admin` as an alias for the owner email selected during setup, or an email address. The alias only selects the Identity account; it grants no role, creates no account, and does not bypass password verification. Public signup was removed from the interface; closing Identity registration itself requires the project dashboard. No default password was created or stored.

To complete the requested account reset, use the [project Identity dashboard](https://app.netlify.com/projects/kps26/identity) to invite the selected owner, accept the invitation and choose a private password, and assign the `admin` role. Then delete previous Identity users and revoke their app team memberships. This run could not perform Identity account administration; previous accounts and access remain until that cleanup is performed. Browser-saved passwords must be removed in the browser password manager. Business records and historical documents must be preserved.

Session regression checks: `node --test tests/session.test.mjs tests/report-data.test.mjs`. These cover the verification destination, missing and rejected credentials, upstream failures, malformed responses, and existing report calculations. A real account login must also be checked after deployment; automated tests do not verify a particular user’s credentials or membership.

Deployment troubleshooting: the obsolete Flutter and bundle-env dashboard plugins were removed; the latest pipeline compiled the Vite client and bundled the Netlify Server successfully. The remaining failure was a 30-second Pa11y timeout in `netlify-plugin-a11y@0.0.12`. That plugin opens HTML using `file://`, cannot serve the Vite module assets, and does not expose browser launch or timeout settings. A direct check also timed out with external font links removed, so font loading alone did not explain the failure.

The repository now overrides that legacy plugin's `checkPaths` with an empty list and explicitly configures the existing Lighthouse plugin to audit `/` over HTTP. The legacy Pa11y scan is intentionally skipped; Lighthouse supplies the accessibility report alongside its other audits. No new score threshold is imposed. This public-page audit does not cover authenticated business screens or replace manual accessibility testing. If dashboard management is needed, its location is Project configuration → Developer settings → Build plugins.

Tajawal's five existing font weights are served locally with `font-display: swap`, preserving the Arabic typography while removing the external Google Fonts stylesheet dependency. The font license is included under `public/fonts/tajawal/OFL.txt`. Full pipeline and Lighthouse execution remain deployment checks; no local build was run.


## Reliable saves and currency-separated financial data

Invoice and quotation creation, quotation conversion, stock receipts, and financial entries now require an `Idempotency-Key`. The server stores the request fingerprint and successful result in Netlify Database in the same transaction as the business changes. A duplicate request from the same verified account with the same key replays the result; changing its route or payload returns a conflict. Permissions are checked before any replay, and sales responses still omit costs. A failed transaction rolls back its operation record as well as its business changes. Existing row locks and stable product lock ordering remain in place.

The browser retains the key for a retry of the same payload after a lost, incomplete, or uncertain response, and prevents overlapping saves from the page. It does not automatically resend writes. Retry metadata lasts only while the page remains open; after reloading or closing the page, check the business ledger before submitting a replacement. No unsent operation is represented as saved offline. Successful complete responses allow a subsequent intentional operation with the same values.

New financial entries capture their currency. Invoice collections use the invoice currency, including invoices issued before a settings change. Independent entries use the current institution currency, and the server rejects a mismatched submitted currency. Historical linked entries inherit the immutable invoice currency for display and reports. Historical independent entries have no reliable currency evidence and remain labeled “غير محددة (سجل سابق)”; they are visible in the ledger and selectable in cash reports, but excluded from totals for known currencies. No exchange-rate conversion or historical amount rewrite occurs. Dashboard totals use the current currency only, while document lists retain each document’s own currency.

Monetary displays and printed invoices now retain up to two decimal places. Open document views resolve against the latest synchronized state, so payment balances and quotation status update with the surrounding lists. The additive generated migration creates the operation-deduplication table and adds the nullable entry currency column; the existing applied migration is unchanged. Netlify applies the new migration during deployment.

Validation: `node --test tests/*.test.mjs` passed 27 tests, including uncertain-response retries, replay conflicts, transaction rollback with a serialized test double, currency separation, legacy currency handling, and refreshed document views. PostgreSQL concurrency behavior and full authenticated browser workflows still require preview/runtime validation; no local build or production business-data writes were performed.

## HTML validation

The document shell uses an uppercase `DOCTYPE` and HTML void elements without XML-style closing slashes. These source corrections address all 12 errors reported by the deployment HTML validator; the validator remains enabled. The same installed `html-validate` executable passed against `index.html`. The hosting pipeline validates the generated output; no local build was run.

## Invitation session repair

Invitation acceptance now follows `acceptInvite` with the SDK's public `login` operation before requesting private data. In the installed SDK, accepting an invitation does not write the API session cookies; calling `getUser` at that point can clear the incomplete session. If password setup succeeds but login fails, the interface returns to ordinary login and explains that the invitation must not be reused. Passwords remain transient form inputs and are never stored by application code. Existing-password login no longer imposes the new-password minimum length; Identity validates the credentials. New-password forms retain their existing minimum.

The reported account was confirmed and invited, but had no Identity admin role. No membership existed in the database available to this preview. These are separate from credential verification: a project owner must grant the first administrator the server-controlled `admin` role through the project Identity user details, or an existing administrator must add the appropriate team membership. Production membership was not verified. The repair does not grant access automatically or bypass remote JWT verification.

Validation: all 30 tests passed, including invitation completion ordering, rejection, and login failure after acceptance. JSX parsing and diff checks passed. The Identity activation step completed. Deployment and an actual account login still require runtime validation; no local build was run.
