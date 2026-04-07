/*! coi-serviceworker v0.2.3 | MIT License | https://github.com/gzuidhof/coi-serviceworker */
if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("fetch", (event) => {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        const script = document.currentScript;
        const reload = script.hasAttribute("data-reload");

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register(window.location.href + (window.location.href.endsWith("/") ? "" : "/") + "coi-serviceworker.js").then(
                (registration) => {
                    console.log("COI Service Worker registered with scope:", registration.scope);

                    registration.addEventListener("updatefound", () => {
                        registration.installing.addEventListener("statechange", (event) => {
                            if (event.target.state === "installed") {
                                if (reload) {
                                    window.location.reload();
                                }
                            }
                        });
                    });

                    if (registration.active && !navigator.serviceWorker.controller) {
                        if (reload) {
                            window.location.reload();
                        }
                    }
                },
                (err) => {
                    console.error("COI Service Worker registration failed:", err);
                }
            );
        }
    })();
}
