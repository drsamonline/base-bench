# Base Bench — user guide

**Version 1.0.0 · PolyForm Noncommercial 1.0.0 · one page, works offline**

Every number base, unit and timezone on one page — **with the working shown**.

## Bases

Decimal, hex, binary and octal are four views of one number: type in any field and the other three
follow. Any base from 2 to 36 is available, with the legal digit strip printed beside it.

The working is printed **in the base you typed into**:

```
255 → hex:   255 / 16 = 15 remainder 15 (F)
             15 / 16  =  0 remainder 15 (F)
             read the remainders bottom-up: FF
```

That is the sum you would do by hand, which is the point.

## Units

Length, mass, data and time carry their **factor** in the working line. Temperature is affine, so it
gets its own formula rather than a factor. `KB` and `KiB` are kept apart, because they are different
units and conflating them is how a "500 GB" drive becomes 465.

## Timezones

Fixed offsets, stated as fixed. The day change is said out loud rather than swallowed: 01:00 IST is
19:30 UTC **the previous day**.

## Big numbers

The whole part is carried as a **BigInt**, so a 30-digit number is read and written exactly. A double
would start rounding at 2⁵³ and print a plausible answer that is not the one you typed.

## What it refuses to do

- **Not a scientific calculator.** It converts, and it shows how. Anything else is a different tool.
- **No invented answers.** An illegal digit, an unknown unit, a length converted to a mass, or `0x`
  on base 10 each produce a sentence saying what is wrong — not a plausible-looking number.
- **No network at any point.** No fetch, no CDN, no font service, no analytics; the test suite
  asserts it.
- **No account, no sync, no telemetry.**

## Your log

The conversions you keep live in this browser's storage and leave only when you export them as CSV.

## Languages

English, Hindi and Gujarati — every label, every note and every refusal. The choice is remembered on
the device, and the arithmetic does not change with it.

## Licence

PolyForm Noncommercial 1.0.0. See [LICENSE](../LICENSE).
