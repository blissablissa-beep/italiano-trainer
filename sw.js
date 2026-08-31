const CACHE_NAME =
  "italiano-trainer-v5";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./data/words.json",
  "./data/words2.json",
  "./data/words3.json",
  "./data/words4.json",
  "./data/words5.json"
];

self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache =>
          cache.addAll(ASSETS)
        )
        .then(() =>
          self.skipWaiting()
        )
    );
  }
);

self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      caches
        .keys()
        .then(keys =>
          Promise.all(
            keys
              .filter(
                key =>
                  key !== CACHE_NAME
              )
              .map(
                key =>
                  caches.delete(key)
              )
          )
        )
        .then(() =>
          self.clients.claim()
        )
    );
  }
);

self.addEventListener(
  "fetch",
  event => {
    const request = event.request;

    if (
      request.method !== "GET" ||
      new URL(request.url).origin !==
        self.location.origin
    ) {
      return;
    }

    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(cache =>
                cache.put(
                  request,
                  copy
                )
              );
          }

          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }

              if (
                request.mode ===
                "navigate"
              ) {
                return caches.match(
                  "./index.html"
                );
              }

              return Response.error();
            })
        )
    );
  }
);