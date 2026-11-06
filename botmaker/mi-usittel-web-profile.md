# Mi USITTEL Web: authenticated contact capture

Status: dedicated code action and five Mi Web entry blocks published;
portal deployed at `82698fb`; authenticated and anonymous production capture
verified on 2026-11-05.

Scope: only the dedicated Mi USITTEL Central account and bot
`6WJIV274SXSROZLQJF65`. Do not change the WhatsApp originals, Sales Web,
Master routing, RUN_ALWAYS, or either production `.htaccess`.

The portal's `POST api.php?route=chat-entry` accepts no customer identifier.
It uses `authenticated_ida` from the validated login session, not the selected
service. Anonymous sessions, missing certificates and provider failures return
the anonymous entry. A valid channel certificate issues a signed and encrypted
Central App Entry token, valid for five minutes. Its subject is
`mi-usittel:<login-owner-id>`; only the profile name is included as `name`.

The certificate must be the dedicated Mi USITTEL channel's bundle, stored at
`/home4/usittel/mi-usittel-private/central-mi-usittel.json` with private file
permissions. Do not put it in the repository, HTML, browser storage, public_html,
existing private configuration, or `.htaccess`. The dedicated certificate was
created on 2026-11-05 and staged privately outside the checkout. Its signature
algorithm is ES256 and its encryption algorithm is ECDH-ES on P-256. It has
been uploaded outside public_html with mode 0600. The user explicitly approved
reusing the existing Phantom technical credentials in this new action only.

The Phantom endpoint currently sends only its leaf certificate. The new action
supplies the public Let's Encrypt YR1 → Root YR (cross-signed) → ISRG Root X1
chain from `phantom-public-chain.pem`. TLS certificate and hostname verification
remain enabled, and the chain terminates at a root already trusted by Node.
The issuer certificates were downloaded from Let's Encrypt's official
[certificate list](https://letsencrypt.org/certificates/) on 2026-11-05 and the
live endpoint passed strict TLS verification with that chain. If Phantom changes
its issuer, update the chain or preferably have Phantom serve its full chain.

The portal mounts the official SDK with its `appJwt` property. It destroys the
current element when the portal account changes or logs out, cancels late
identity responses and broadcasts a data-free account-change signal to other
portal tabs. A persistent boolean marker makes the next anonymous widget clear
the previous visitor before opening. Tokens and customer identifiers are never
stored in those markers.

The real authenticated Laboratory contact skipped both questions, populated
`nombre_form` and `telefono_form` from Phantom, recorded the contact note in the
conversation and its notes panel, sent the short thanks and continued to support.
Phantom's customer response arrived as JSON text even with `json: true`; the
action now decodes one bounded JSON layer, tolerating one leading UTF-8 BOM,
before checking the exact owner. HTML, invalid JSON, nested strings and other
customer records are rejected. Temporary diagnostics were removed before the
successful final run.
An independent anonymous production session accepted the single name `Ana`,
asked the short phone question, accepted fictitious test data and continued
automatically after the short thanks. No profile data from the authenticated
session appeared in that visitor's chat.

## Published configuration and verification

1. User confirmation, certificate generation and private upload are complete.
   Do not regenerate or revoke the certificate without a new confirmation.
2. The real authenticated production test confirmed that Central puts `sub` in
   `context.userData.USER_ID_ON_BUSINESS` on `open_central`. Its platform contact ID
   is a separate opaque identifier. Read only the system business identity field;
   neither a user variable nor the platform contact ID is the authenticated owner.
3. The NEW action `Mi_Web_Cargar_Contacto` (`M3Y23Z1ZRS8K24LN7U9B`) is published
   from `mi-usittel-web-profile.js`. Its private constants
   are `MI_WEB_PHANTOM_URL`, `MI_WEB_PHANTOM_USER`, and `MI_WEB_PHANTOM_PASS`, using
   the authorized existing HTTPS Phantom endpoint and technical integration.
   Never copy credentials into source control or alter the shared actions.
4. That action runs only at Mi USITTEL Web's flow entry, including ANYTHING,
   before the name question. Only this copy's name/phone questions skip existing
   values. Name validation, contact-name setter, internal note, short thanks and
   support continuation remain enabled. No per-message action or extra Master call.
5. Real production tests verified authenticated and anonymous capture. Automated
   tests cover partial/missing profiles, provider failures, logout, second-account
   and cross-tab isolation. The actual Laboratory contact displays its name,
   agent variables and persisted note with the phone number.
6. Only the new action and the five specific Mi Web nodes were published;
   historical drafts and the WhatsApp originals were not changed. Portal runtime
   remains at deployed `82698fb`; later commits update only the Botmaker action,
   public certificate data, tests and this guide. Production `.htaccess` was read
   without editing and its before/after SHA-256 was identical.

## Local validation

`npm run test:mi-usittel:chat` passes with synthetic profiles and generated test
keys: lifecycle isolation, stale response cancellation, method/CSRF checks,
owner isolation, ES256/RS256 signatures, RSA-OAEP-256 and ECDH-ES with A256GCM round-trip,
provider fallback, partial profile fields and an explicit WhatsApp no-op guard.
`node tests/attention-preview.test.cjs` passes all four tests. Catalog, Wi-Fi
input, presentation and payment-flow unit checks also pass. The repository's
secret check passes with no real certificate or new credentials present.

The full existing PHP suite currently stops in the unchanged `ticket-http.php`
fixture: this Windows PHP installation reports `is_readable(__FILE__)` false
although reading the file succeeds. The existing htaccess static test also
expects an old physical API route string, despite an unchanged production router.
Neither failure has been hidden or fixed as part of this chat-only change.

## Protocol references

- Official Central issuer: https://github.com/central-chat/central-auth-node
  (reviewed source commit `0133f74adcfd32b3226fd5a53224ad4963b8dff7`).
- Official widget: https://web.central.chat/widget/core.js
- Botmaker code actions: https://help.botmaker.com/es/help/8528871986058021382
- Botmaker variables: https://help.botmaker.com/es/help/1567891760073311353

PHP JOSE dependencies are pinned in `server/central-auth-libs/composer.lock` and
vendored with their licenses because the existing hosting deployment copies PHP
files without a Composer installation step. They load only when issuing a token.
