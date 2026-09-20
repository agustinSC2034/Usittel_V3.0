# LibreSpeed engine

Upstream: https://github.com/librespeed/speedtest
Pinned revision: `be1e0a0daac3a386d7bc40daa9d4bfba696e9e2b`.
License: LGPL-3.0, preserved in LICENSE. Upstream sources are unmodified.

Mi USITTEL uses only `speedtest_worker.js`, with its own presentation and lifecycle
in `js/speed-test.js`. The upstream API and documentation remain available here as
source reference. No IP/ISP lookup, telemetry, result sharing or persistence.
Backend is the operator's existing LibreSpeed installation, not the portal PHP
development server. There is no third-party iframe or frontend dependency/CDN.
