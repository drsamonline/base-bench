/* sw.js — the offline shell for Base Bench.
 *
 * One file, no dependencies, no build step. The rule it follows is the one that
 * matters: HTML is served NETWORK-FIRST, because a cache-first worker hides
 * every release. A returning reader would keep the old app forever, with no way
 * to tell. So:
 *
 *   - navigation requests go to the network, and the cache is only the fallback
 *     for when there is no network at all;
 *   - assets are cache-first with a background refresh, so a cold load is fast
 *     and an offline load works;
 *   - CACHE is bumped on every release, and the app calls registration.update()
 *     on load, so a new worker is fetched as soon as a page opens;
 *   - the app prints a build stamp in its footer, so "am I on the new one?" is
 *     answerable from the page itself.
 *
 * PolyForm Noncommercial 1.0.0. (c) 2026 Dr Sohil Momin.
 */
"use strict";

var CACHE = "base-bench-2026.11.01";

/* Everything the app loads, by name. test-node.js asserts this list covers
 * docs/play exactly, so a file added to the folder cannot be forgotten here
 * and then go missing offline. */
var ASSETS = [
  "./",
  "./index.html",
  "./basebench.js",
  "./web-kit.js",
  "./export-kit.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // never proxy anything off-origin

  /* HTML: the network decides, the cache only catches the fall. */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* Assets: the cache decides, the network refreshes in the background. */
  event.respondWith(
    caches.match(req).then(function (hit) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || network;
    })
  );
});
