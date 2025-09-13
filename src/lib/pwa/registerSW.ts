import { logger } from "@/lib/logger";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    logger.info("Service Worker not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Check for updates periodically
    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000,
    ); // Check every hour

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New service worker available, prompt user to refresh
          if (confirm("New version available! Refresh to update?")) {
            window.location.reload();
          }
        }
      });
    });

    return registration;
  } catch (error) {
    logger.error("Service Worker registration failed:", error);
  }
}

export function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
