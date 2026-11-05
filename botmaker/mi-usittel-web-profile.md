# Mi USITTEL Web: authenticated contact capture

Status: dedicated code action and five Mi Web entry blocks published;
portal deployment and authenticated production verification in progress.

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

The portal mounts the official SDK with its `appJwt` property. It destroys the
current element when the portal account changes or logs out, cancels late
identity responses and broadcasts a data-free account-change signal to other
portal tabs. A persistent boolean marker makes the next anonymous widget clear
the previous visitor before opening. Tokens and customer identifiers are never
stored in those markers.

## Activation still required

1. User confirmation, certificate generation and private upload are complete.
   Do not regenerate or revoke the certificate without a new confirmation.
2. Use a synthetic App Entry identity to verify the actual mapping of `sub` to
   Botmaker's `userIdOnBusiness`. Do not activate the action based on the mapping
   assumption alone. Verify the platform/channel guard and actual certificate
   algorithms as well.
3. Create a NEW code action from `mi-usittel-web-profile.js`. Its private constants
   are `MI_WEB_PHANTOM_URL`, `MI_WEB_PHANTOM_USER`, and `MI_WEB_PHANTOM_PASS`, using
   the authorized existing HTTPS Phantom endpoint and technical integration.
   Never copy credentials into source control or alter the shared actions.
4. Insert that new action only at Mi USITTEL Web's flow entry, including its
   existing ANYTHING entry route, before the name question. Enable automatic
   continuation when a value exists only on this copy's name/phone questions.
   Keep the current name validation, contact-name setter, internal note, thanks
   and copied support flow. Do not use per-message actions or another Master call.
5. Test anonymous, fully authenticated, partial/missing profile, failure fallback,
   logout, second account and cross-tab cases. Verify name and phone in the
   actual Botmaker contact, agent variables and internal note.
6. Publish only the new code action and the specific modified Mi Web nodes.
   Do not bulk publish historical drafts. Push/deploy the verified feature and
   compare production `.htaccess` integrity and existing public web behavior.

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
