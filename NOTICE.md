# NOTICE

## Base Bench

Copyright (c) 2026 Sohil Anwarbhai Momin. Dual-licensed — see `LICENSE`.
Free for personal, hobby, educational and other non-commercial use; commercial
use requires a paid licence.

## The engine

`docs/play/basebench.js` is MIT, as its header says. It has no dependencies and
makes no network request. Every conversion it performs is computed here: the
number bases by repeated division, units from exact definitions (the metre, the
gram, the second, the byte) with the imperial factors stated to the digit, and
timezones by fixed UTC offset — a fixed offset is not a time zone database, and
the app says so rather than pretending otherwise.

## The kits it vendors

`docs/play/web-kit.js` and `docs/play/export-kit.js` are copied in from
`drsamonline/web-kit` and `drsamonline/export-kit`, so the app runs from
`file://` with no build step. They are MIT.
