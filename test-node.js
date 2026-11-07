#!/usr/bin/env node
/* test-node.js — the proof for Base Bench.
 *
 * docs/play/basebench.js is the engine and docs/play/index.html is a view over
 * it, so testing the engine tests what the app actually does. Everything runs
 * offline, with no dependencies.
 *
 *     node test-node.js
 *
 * MIT. (c) 2026 Dr Sohil Momin.
 */
"use strict";

var fs = require("fs");
var path = require("path");
var B = require("./docs/play/basebench.js");

var passed = 0, failed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  <- " + detail : "")); }
}
function eq(name, actual, expected) {
  ok(name + " = " + JSON.stringify(expected), JSON.stringify(actual) === JSON.stringify(expected),
    "got " + JSON.stringify(actual));
}
function section(t) { console.log("\n" + t); }

/* ------------------------------------------------------------------ */
section("the done-means: 255 as decimal, hex and binary in one view");

var v = B.views("255", 10);
ok("the view reads 255", v.ok, v.error);
eq("255 in hex", v.text[16], "FF");
eq("255 in binary", v.text[2], "11111111");
eq("255 in octal", v.text[8], "377");
eq("255 in decimal", v.text[10], "255");
eq("255 in base 36", v.text[36], "73");

// The three fields are one state: typing in ANY of them gives the same answer.
eq("typing FF into the hex field gives 255", B.sync("hex", "FF").value, 255);
eq("typing 11111111 into the binary field gives 255", B.sync("bin", "11111111").value, 255);
eq("typing 377 into the octal field gives 255", B.sync("oct", "377").value, 255);
eq("the hex field re-renders the binary field", B.sync("hex", "FF").text[2], "11111111");
eq("the binary field re-renders the hex field", B.sync("bin", "11111111").text[16], "FF");
eq("the decimal field re-renders both", [B.sync("dec", "255").text[16], B.sync("dec", "255").text[2]], ["FF", "11111111"]);
eq("a field the app does not have is refused", B.sync("nope", "1").ok, false);

/* ------------------------------------------------------------------ */
section("reading a number");

eq("FF in base 16", B.parse("FF", 16).value, 255);
eq("lowercase ff reads the same", B.parse("ff", 16).value, 255);
eq("0xFF carries its own base", B.parse("0xFF", 16).value, 255);
eq("0b1010 carries base 2", B.parse("0b1010", 2).value, 10);
eq("0o17 carries base 8", B.parse("0o17", 8).value, 15);
eq("spaces and underscores are separators, not digits", B.parse("1 000_000", 10).value, 1000000);
eq("a sign is read", B.parse("-FF", 16).value, -255);
eq("a plus is allowed", B.parse("+10", 10).value, 10);
eq("0.1 in base 2 is a half", B.parse("0.1", 2).value, 0.5);
eq("Z is 35 in base 36", B.parse("Z", 36).value, 35);
eq("ZZ in base 36 is 1295", B.parse("ZZ", 36).value, 1295);

ok("G is not a base-16 digit", !B.parse("G", 16).ok);
ok("2 is not a base-2 digit", !B.parse("2", 2).ok);
ok("an empty field is an error, not a zero", !B.parse("", 10).ok);
ok("a sign alone is an error", !B.parse("-", 10).ok);
ok("two points are an error", !B.parse("1.2.3", 10).ok);
ok("a 0x prefix on base 10 is refused and says why", /prefix/.test(String(B.parse("0xFF", 10).error)));
ok("base 1 is refused", !B.parse("1", 1).ok);
ok("base 37 is refused", !B.parse("1", 37).ok);
ok("base 2.5 is refused", !B.parse("1", 2.5).ok);

/* ------------------------------------------------------------------ */
section("writing a number");

eq("255 in base 2", B.toBase(255, 2), "11111111");
eq("255 in base 16", B.toBase(255, 16), "FF");
eq("0 is 0 in base 16", B.toBase(0, 16), "0");
eq("a negative keeps its sign", B.toBase(-255, 16), "-FF");
eq("1295 in base 36", B.toBase(1295, 36), "ZZ");
eq("a half is 0.1 in base 2", B.toBase(0.5, 2), "0.1");
eq("a half is 0.8 in base 16", B.toBase(0.5, 16), "0.8");
eq("0.1 in base 2 is truncated, not faked", B.toBase(0.1, 2, { maxFrac: 8 }), "0.00011001");
eq("an unreadable number is null, not NaN", B.toBase(NaN, 10), null);

// Round trip: whatever we write, we can read back. Bases 2, 8, 16, 36, 0..1000.
var bad = [];
[2, 8, 16, 36].forEach(function (b) {
  for (var n = 0; n <= 1000; n++) {
    var back = B.parse(B.toBase(n, b), b);
    if (!back.ok || back.value !== n) bad.push(b + ":" + n);
  }
});
eq("4004 round trips (1001 numbers x 4 bases) all come back", bad.slice(0, 5), []);
ok("2^53-1 round trips through base 36", B.parse(B.toBase(Math.pow(2, 53) - 1, 36), 36).value === Math.pow(2, 53) - 1);

/* ------------------------------------------------------------------ */
section("the working, shown");

var s = B.steps(255, 16);
eq("255 -> hex is two divisions plus the reading", s.length, 3);
eq("the first line is the first division", s[0], "255 / 16 = 15 remainder 15 (F)");
eq("the last line reads the remainders up", s[2], "read the remainders bottom-up: FF");
eq("zero has no divisions to show", B.steps(0, 2).length, 1);
ok("the working names the answer", B.steps(10, 2)[B.steps(10, 2).length - 1].indexOf("1010") >= 0);

/* ------------------------------------------------------------------ */
section("units");

eq("1 km in metres", B.convert(1, "km", "m").value, 1000);
eq("1 mile in metres", B.convert(1, "mi", "m").value, 1609.344);
eq("1 inch in centimetres", B.convert(1, "in", "cm").value, 2.54);
eq("1 kg in pounds", B.round(B.convert(1, "kg", "lb").value), 2.204623);
eq("1 GiB in MiB", B.convert(1, "GiB", "MiB").value, 1024);
eq("1 KB in KiB is NOT 1 - they are different units", B.round(B.convert(1, "KB", "KiB").value), 0.976563);
eq("90 minutes in hours", B.convert(90, "min", "h").value, 1.5);
eq("100 C in F", B.convert(100, "C", "F").value, 212);
eq("0 C in F", B.convert(0, "C", "F").value, 32);
eq("-40 C in F", B.convert(-40, "C", "F").value, -40);
eq("0 C in K", B.convert(0, "C", "K").value, 273.15);
eq("32 F in C", B.convert(32, "F", "C").value, 0);
ok("a length does not convert to a mass", !B.convert(1, "m", "kg").ok);
ok("an unknown unit is refused", !B.convert(1, "furlong", "m").ok);
ok("the working is shown for a unit conversion", /x 1000/.test(B.convert(1, "km", "m").working));

/* ------------------------------------------------------------------ */
section("timezones");

var t1 = B.shiftTime("09:00", "IST", "UTC");
eq("09:00 IST is 03:30 UTC", t1.time, "03:30");
eq("...on the same day", t1.day, 0);
var t2 = B.shiftTime("01:00", "IST", "UTC");
eq("01:00 IST is 19:30 UTC", t2.time, "19:30");
eq("...on the previous day, and it says so", t2.day, -1);
var t3 = B.shiftTime("23:00", "IST", "UTC");
eq("23:00 IST is 17:30 UTC", t3.time, "17:30");
eq("...on the same day", t3.day, 0);
eq("12:00 UTC is 21:00 in Tokyo", B.shiftTime("12:00", "UTC", "JST").time, "21:00");
eq("20:00 UTC is 05:00 next day in Tokyo", [B.shiftTime("20:00", "UTC", "JST").time, B.shiftTime("20:00", "UTC", "JST").day], ["05:00", 1]);
eq("0900 without a colon still reads", B.shiftTime("0900", "IST", "UTC").time, "03:30");
eq("a half-hour zone is not rounded to the hour", B.shiftTime("12:00", "UTC", "NPT").time, "17:45");
ok("25:00 is not a time", !B.shiftTime("25:00", "UTC", "IST").ok);
ok("an unknown zone is refused", !B.shiftTime("12:00", "MARS", "UTC").ok);
eq("the offset is labelled the way a person writes it", B.zoneLabel("IST"), "UTC+05:30");
eq("a western offset keeps its sign", B.zoneLabel("PST"), "UTC-08:00");

/* ------------------------------------------------------------------ */
section("the app ships what it says it ships");

/* What a page LOADS and what a page merely LINKS TO are different things.
 *
 * The offline promise is about loads: a browser fetches src, srcset, poster,
 * <link href>, a CSS url(), @import and importScripts by itself. An <a href>
 * is fetched only if a reader clicks it. This test used to grep every
 * https?:// in the file, so the estate's support block (Ko-fi, PayPal, the
 * bookstore, the hub) - four anchors - read as requests the page does not
 * make. Counting the two separately keeps the promise strict and keeps the
 * anchors visible. (LEARNINGS 13; app-panchang, app-image-toolkit and
 * app-poets-studio carry the same fix.) */
function loadsFrom(text) {
  var out = [], m, re;
  re = /\b(?:src|srcset|poster)\s*=\s*["']([^"']+)["']/gi;
  while ((m = re.exec(text))) out.push(m[1]);
  re = /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = re.exec(text))) out.push(m[1]);
  re = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = re.exec(text))) out.push(m[1]);
  re = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi;
  while ((m = re.exec(text))) out.push(m[1]);
  re = /importScripts\s*\(\s*["']([^"']+)["']/gi;
  while ((m = re.exec(text))) out.push(m[1]);
  return out.map(function (u) { return u.trim(); })
    .filter(function (u) { return /^(?:https?:)?\/\//i.test(u) && !/w3\.org|schema\.org/.test(u); });
}
function linksTo(text) {
  var out = [], m, re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  while ((m = re.exec(text))) out.push(m[1].trim());
  return out.filter(function (u) { return /^(?:https?:)?\/\//i.test(u); });
}

var dir = path.join(__dirname, "docs", "play");
["index.html", "basebench.js", "web-kit.js", "export-kit.js"].forEach(function (f) {
  ok("docs/play/" + f + " exists", fs.existsSync(path.join(dir, f)) && fs.statSync(path.join(dir, f)).size > 0);
});
var html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
["basebench.js", "web-kit.js", "export-kit.js"].forEach(function (f) {
  ok("the page loads " + f, html.indexOf('src="' + f + '"') >= 0);
});
["dec", "hex", "bin", "oct"].forEach(function (id) {
  ok("the page has the " + id + " field the done-means names", html.indexOf('id="' + id + '"') >= 0);
});
ok("the page has a viewport, so it works on a phone", html.indexOf('name="viewport"') >= 0);
eq("the page loads nothing from the network", loadsFrom(html), []);
var anchors = linksTo(html);
ok("the page's support block is anchors, not loads", anchors.length >= 3 && anchors.every(function (u) {
  return loadsFrom(html).indexOf(u) < 0;
}), anchors.join(" "));

/* ------------------------------------------------------------------ */
section("exactness: any length of integer, and never a rounded one");

/* A double starts rounding at 2^53. The engine carries the whole part as a
 * BigInt, so the digits that come out are the digits that went in. */
function big(text, base) { return String(B.parse(text, base).big); }

eq("2^53 itself is read exactly", big("9007199254740992", 10), "9007199254740992");
eq("and one past it is read exactly too", big("9007199254740993", 10), "9007199254740993");
eq("which is the hex a double would have got wrong",
  B.toBase(B.parse("9007199254740993", 10).big, 16), "20000000000001");

var long = "123456789012345678901234567890";
eq("a 30-digit number survives base 36 and back",
  big(B.toBase(B.parse(long, 10).big, 36), 36), long);

eq("and its first division is exact, not rounded",
  B.steps(B.parse(long, 10).big, 16)[0],
  "123456789012345678901234567890 / 16 = 7716049313271604931327160493 remainder 2 (2)");

/* ------------------------------------------------------------------ */
section("the shell: offline, installable, and unable to fetch");

var sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
var manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.webmanifest"), "utf8"));

var listed = (sw.match(/"\.\/[^"]*"/g) || []).map(function (x) { return x.slice(1, -1); });
var shipped = fs.readdirSync(dir).filter(function (f) { return f !== "sw.js"; });

var unlisted = shipped.filter(function (f) { return listed.indexOf("./" + f) < 0; });
ok("the worker lists every file the app ships", unlisted.length === 0, "missing: " + unlisted.join(", "));

var missing = listed.filter(function (f) { return f !== "./" && shipped.indexOf(f.slice(2)) < 0; });
ok("every file the worker lists exists", missing.length === 0, "missing: " + missing.join(", "));

ok("the cache name carries a version stamp, so a release cannot be hidden",
  /var CACHE = "base-bench-\d{4}\.\d{2}\.\d{2}"/.test(sw));

var navBranch = sw.slice(sw.indexOf('req.mode === "navigate"'), sw.indexOf("/* Assets:"));
ok("HTML is served network-first, the cache is only the fallback",
  navBranch.indexOf("fetch(req)") >= 0 && navBranch.indexOf("caches.match") > navBranch.indexOf("fetch(req)"));

ok("the worker never proxies another origin", sw.indexOf("url.origin !== self.location.origin") >= 0);

eq("the manifest starts at the app, standalone",
  [manifest.start_url, manifest.scope, manifest.display], ["./", "./", "standalone"]);

var sizes = manifest.icons.map(function (i) { return i.sizes; });
ok("the manifest offers a 192, a 512 and a maskable icon",
  sizes.indexOf("192x192") >= 0 && sizes.indexOf("512x512") >= 0 &&
  manifest.icons.some(function (i) { return i.purpose === "maskable"; }));

var iconMissing = manifest.icons.filter(function (i) {
  return !fs.existsSync(path.join(dir, i.src));
}).map(function (i) { return i.src; });
ok("every icon the manifest names is on disk", iconMissing.length === 0, "missing: " + iconMissing.join(", "));

ok("the page links the manifest", html.indexOf('rel="manifest"') >= 0);
ok("the page registers the offline shell", html.indexOf('navigator.serviceWorker.register("sw.js")') >= 0);

ok("the page declares a policy that allows no network at all",
  /Content-Security-Policy/.test(html) && /default-src 'none'/.test(html) && /connect-src 'none'/.test(html));

var remote = ["index.html", "basebench.js", "web-kit.js", "export-kit.js", "sw.js"].filter(function (f) {
  var body = fs.readFileSync(path.join(dir, f), "utf8");
  return loadsFrom(body).length > 0;
});
ok("no file in the app LOADS a remote address", remote.length === 0, "in: " + remote.join(", "));
var linked = ["index.html", "basebench.js", "web-kit.js", "export-kit.js", "sw.js"].filter(function (f) {
  return linksTo(fs.readFileSync(path.join(dir, f), "utf8")).length > 0;
});
ok("and only the page carries them, as links a reader may follow", linked.join(",") === "index.html", linked.join(","));

/* The CSP forbids the network; this asserts the code never asks for it in the
 * first place, so the promise does not rest on the browser honouring a header.
 * sw.js is exempt on purpose: its whole job is to answer fetch(req) from cache. */
var callers = ["basebench.js", "web-kit.js", "export-kit.js"].filter(function (f) {
  var body = fs.readFileSync(path.join(dir, f), "utf8");
  return /(?:^|[^.\w$])(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(body);
});
ok("no app script opens the network of its own accord", callers.length === 0, "in: " + callers.join(","));

var css = (html.match(/<style[\s\S]*?<\/style>/g) || []).join("\n");
ok("no webfont and no url() for the styles to fetch",
  !/@font-face/.test(css) && !/url\(/.test(css.replace(/url\(#/g, "")));

ok("the footer prints a build stamp, so 'am I on the new one?' is answerable",
  /build \d{4}\.\d{2}\.\d{2}/.test(html));

/* ------------------------------------------------------------------ */
section("the words: three languages, and none of them a half");

var dictSrc = html.slice(html.indexOf("var DICT = {"), html.indexOf("var LANGS = ["));
dictSrc = dictSrc.slice(0, dictSrc.lastIndexOf("};") + 2);
var DICT = new Function("return " + dictSrc.slice("var DICT = ".length).replace(/;\s*$/, ""))();
var LANGS = ["en", "hi", "gu"];

var enKeys = Object.keys(DICT.en).sort();
LANGS.forEach(function (l) {
  var keys = Object.keys(DICT[l] || {}).sort();
  var missing = enKeys.filter(function (k) { return keys.indexOf(k) < 0; });
  ok(l + " carries every key English has (" + enKeys.length + ")", keys.join() === enKeys.join(),
    "missing: " + missing.join(", "));
});

/* Every refusal the engine can produce is a code; a code with no sentence is a
 * refusal that would fall back to English in a Hindi session. */
var codes = (fs.readFileSync(path.join(dir, "basebench.js"), "utf8").match(/code: "[a-z_]+"/g) || [])
  .map(function (c) { return c.slice(7, -1); });
var unspoken = [];
LANGS.forEach(function (l) {
  codes.forEach(function (c) { if (!DICT[l]["err_" + c]) unspoken.push(l + ":" + c); });
});
ok("every refusal the engine can give is written in every language (" + codes.length + " codes)",
  unspoken.length === 0, "unwritten: " + unspoken.join(", "));

var tagged = (html.match(/data-i18n="[a-z_]+"/g) || []).map(function (a) { return a.slice(11, -1); });
var untranslated = tagged.filter(function (k) { return !DICT.en[k]; });
ok("every tagged phrase on the page is in the dictionary (" + tagged.length + " phrases)",
  untranslated.length === 0, "missing: " + untranslated.join(", "));

ok("the switch offers all three, and the page remembers which",
  LANGS.every(function (l) { return html.indexOf('value="' + l + '"') >= 0; }) &&
  html.indexOf('Loom.storage.get("lang"') >= 0 && html.indexOf('Loom.storage.set("lang"') >= 0);

/* ------------------------------------------------------------------ */
console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
