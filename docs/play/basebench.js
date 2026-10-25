/* basebench.js — the engine behind Base Bench.
 * One file. No dependencies. UMD, so the tests test the code the page runs.
 * MIT. (c) 2026 Dr Sohil Momin.
 *
 * Every conversion here shows its WORKING: the repeated division for a number
 * base, the factor for a unit, the offset arithmetic for a timezone. A
 * conversion you can check is worth more than one you have to trust.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  root.BaseBench = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var STANDARD = [2, 8, 10, 16];

  function clean(text) { return String(text == null ? "" : text).replace(/[\s_]/g, ""); }
  function digitValue(ch) { return DIGITS.indexOf(String(ch).toUpperCase()); }
  function validBase(b) { return typeof b === "number" && b === Math.floor(b) && b >= 2 && b <= 36; }

  /* ---------- reading a number in any base ---------- */
  function parse(text, base) {
    base = base == null ? 10 : base;
    if (!validBase(base)) return { ok: false, error: "a base is a whole number from 2 to 36" };
    var s = clean(text);
    if (!s) return { ok: false, error: "nothing to read" };
    var sign = 1;
    if (s[0] === "+" || s[0] === "-") { if (s[0] === "-") sign = -1; s = s.slice(1); }
    var head = s.slice(0, 2).toUpperCase();
    var prefix = head === "0X" ? 16 : head === "0B" ? 2 : head === "0O" ? 8 : 0;
    if (prefix) {
      if (prefix !== base) return { ok: false, error: "the 0x/0b/0o prefix says base " + prefix + ", but you are reading base " + base };
      s = s.slice(2);
    }
    if (!s) return { ok: false, error: "no digits after the sign" };
    var dot = s.indexOf(".");
    if (dot >= 0 && s.indexOf(".", dot + 1) >= 0) return { ok: false, error: "more than one point" };
    var intPart = dot < 0 ? s : s.slice(0, dot);
    var fracPart = dot < 0 ? "" : s.slice(dot + 1);
    if (intPart === "" && fracPart === "") return { ok: false, error: "no digits" };
    var value = 0, i, d;
    for (i = 0; i < intPart.length; i++) {
      d = digitValue(intPart[i]);
      if (d < 0 || d >= base) return { ok: false, error: "'" + intPart[i] + "' is not a digit in base " + base };
      value = value * base + d;
    }
    var scale = 1;
    for (i = 0; i < fracPart.length; i++) {
      d = digitValue(fracPart[i]);
      if (d < 0 || d >= base) return { ok: false, error: "'" + fracPart[i] + "' is not a digit in base " + base };
      scale *= base;
      value += d / scale;
    }
    return { ok: true, value: sign * value, base: base };
  }

  /* ---------- writing a number in any base ---------- */
  function toBase(n, base, opts) {
    opts = opts || {};
    var maxFrac = opts.maxFrac == null ? 12 : opts.maxFrac;
    if (typeof n !== "number" || !isFinite(n)) return null;
    if (!validBase(base)) return null;
    var neg = n < 0, v = Math.abs(n);
    var ip = Math.floor(v), fp = v - ip;
    var intDigits = "";
    while (ip > 0) {
      var r = ip % base;
      intDigits = DIGITS[r] + intDigits;
      ip = Math.floor(ip / base);
    }
    if (intDigits === "") intDigits = "0";
    var out = intDigits;
    if (fp > 0) {
      var frac = "";
      for (var k = 0; k < maxFrac && fp > 0; k++) {
        fp *= base;
        var d = Math.floor(fp);
        if (d >= base) d = base - 1;          // float overshoot, never a bogus digit
        frac += DIGITS[d];
        fp -= d;
      }
      frac = frac.replace(/0+$/, "");
      if (frac) out += "." + frac;
    }
    return (neg ? "-" : "") + out;
  }

  /* ---------- the working, as a person would do it on paper ---------- */
  function steps(n, base) {
    if (typeof n !== "number" || !isFinite(n)) return ["not a number"];
    if (!validBase(base)) return ["a base is a whole number from 2 to 36"];
    if (n !== Math.floor(n)) return ["take the whole part first: " + Math.floor(n) + " in base " + base + " is " + toBase(Math.floor(n), base)];
    if (n === 0) return ["0 is 0 in every base"];
    var neg = n < 0, v = Math.abs(n), out = [];
    while (v > 0) {
      var q = Math.floor(v / base), r = v - q * base;
      out.push(v + " / " + base + " = " + q + " remainder " + r + " (" + DIGITS[r] + ")");
      v = q;
    }
    out.push("read the remainders bottom-up: " + (neg ? "-" : "") + toBase(n, base));
    return out;
  }

  /* ---------- the linked fields (the app's done-means) ---------- */
  var FIELDS = { bin: 2, oct: 8, dec: 10, hex: 16 };

  function views(text, base) {
    var p = parse(text, base);
    if (!p.ok) return { ok: false, error: p.error };
    var out = { ok: true, value: p.value, text: {}, steps: steps(p.value, 10) };
    STANDARD.forEach(function (b) { out.text[b] = toBase(p.value, b); });
    out.text[36] = toBase(p.value, 36);
    return out;
  }

  function sync(field, text) {
    var base = FIELDS[field];
    if (!base) return { ok: false, error: "unknown field '" + field + "'" };
    return views(text, base);
  }

  /* ---------- units ---------- */
  var UNITS = {
    length: { note: "the metre is the base; imperial factors are exact", u: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 } },
    mass: { note: "the gram is the base", u: { g: 1, kg: 1000, mg: 0.001, t: 1000000, lb: 453.59237, oz: 28.349523125 } },
    data: { note: "KB is 1000 bytes, KiB is 1024 - they are different units", u: { B: 1, KB: 1000, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824 } },
    time: { note: "the second is the base", u: { s: 1, min: 60, h: 3600, day: 86400, week: 604800 } }
  };

  function categoryOf(unit) {
    if (unit === "C" || unit === "F" || unit === "K") return "temperature";
    for (var c in UNITS) if (UNITS[c].u[unit] != null) return c;
    return null;
  }

  function round(x, dp) {
    var f = Math.pow(10, dp == null ? 6 : dp);
    return Math.round(x * f) / f;
  }

  function convert(value, from, to) {
    if (typeof value !== "number" || !isFinite(value)) return { ok: false, error: "not a number" };
    var cat = categoryOf(from), catTo = categoryOf(to);
    if (!cat) return { ok: false, error: "unknown unit '" + from + "'" };
    if (!catTo) return { ok: false, error: "unknown unit '" + to + "'" };
    if (cat !== catTo) return { ok: false, error: cat + " does not convert to " + catTo };

    if (cat === "temperature") {
      var c = from === "C" ? value : from === "F" ? (value - 32) * 5 / 9 : value - 273.15;
      var out = to === "C" ? c : to === "F" ? c * 9 / 5 + 32 : c + 273.15;
      var working = from === "C" ? value + " C" : from === "F" ? "(" + value + " - 32) x 5/9 = " + round(c) + " C" : value + " - 273.15 = " + round(c) + " C";
      working += " -> " + (to === "C" ? round(c) : to === "F" ? round(c) + " x 9/5 + 32" : round(c) + " + 273.15") + " = " + round(out);
      return { ok: true, value: out, working: working, category: cat };
    }

    var U = UNITS[cat].u;
    var inBase = value * U[from];
    var result = inBase / U[to];
    return {
      ok: true, value: result, category: cat,
      working: value + " " + from + " x " + U[from] + " = " + round(inBase) + " (in the base unit) / " + U[to] + " = " + round(result) + " " + to
    };
  }

  /* ---------- timezones (fixed offsets, stated as such) ---------- */
  var ZONES = {
    "UTC": 0, "IST": 330, "NPT": 345, "GST": 240, "PKT": 300, "BST": 60, "CET": 60, "EET": 120,
    "EST": -300, "EDT": -240, "CST": -360, "PST": -480, "PDT": -420,
    "SGT": 480, "JST": 540, "ACST": 570, "AEST": 600
  };

  function zoneLabel(z) {
    var off = ZONES[z];
    if (off == null) return null;
    var sign = off < 0 ? "-" : "+";
    var a = Math.abs(off);
    return "UTC" + sign + pad(Math.floor(a / 60)) + ":" + pad(a % 60);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function parseClock(text) {
    var s = clean(text);
    var m = /^(\d{1,2}):?(\d{2})$/.exec(s);
    if (!m) return null;
    var h = Number(m[1]), mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return { h: h, m: mi, minutes: h * 60 + mi };
  }

  function shiftTime(clock, fromZone, toZone) {
    if (ZONES[fromZone] == null) return { ok: false, error: "unknown zone '" + fromZone + "'" };
    if (ZONES[toZone] == null) return { ok: false, error: "unknown zone '" + toZone + "'" };
    var t = parseClock(clock);
    if (!t) return { ok: false, error: "give the time as HH:MM" };
    var utc = t.minutes - ZONES[fromZone];
    var there = utc + ZONES[toZone];
    var day = Math.floor(there / 1440);
    var local = there - day * 1440;
    return {
      ok: true,
      time: pad(Math.floor(local / 60)) + ":" + pad(local % 60),
      day: day,
      working: pad(t.h) + ":" + pad(t.m) + " " + fromZone + " (" + zoneLabel(fromZone) + ") - " + zoneLabel(fromZone) +
        " = " + pad(Math.floor(((utc % 1440) + 1440) % 1440 / 60)) + ":" + pad(((utc % 1440) + 1440) % 1440 % 60) + " UTC, then + " + zoneLabel(toZone) + " = " + pad(Math.floor(local / 60)) + ":" + pad(local % 60) + " " + toZone + (day ? " (" + (day > 0 ? "next day" : "previous day") + ")" : "")
    };
  }

  return {
    VERSION: VERSION,
    DIGITS: DIGITS,
    STANDARD: STANDARD,
    FIELDS: FIELDS,
    UNITS: UNITS,
    ZONES: ZONES,
    parse: parse,
    toBase: toBase,
    steps: steps,
    views: views,
    sync: sync,
    convert: convert,
    temperature: function (v, f, t) { return convert(v, f, t); },
    shiftTime: shiftTime,
    zoneLabel: zoneLabel,
    round: round
  };
});
