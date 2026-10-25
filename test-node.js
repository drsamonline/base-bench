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
ok("the page makes no network request", !/https?:\/\//.test(html.replace(/https?:\/\/[^"'\s]*(w3\.org|schema\.org)[^"'\s]*/g, "")));

/* ------------------------------------------------------------------ */
console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
