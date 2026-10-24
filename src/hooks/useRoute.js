import { useCallback, useSyncExternalStore } from "react";
import { routeFromHash } from "../routes.js";

function subscribe(callback) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

const snapshot = () => routeFromHash(window.location.hash);

/** Halaman aktif berdasarkan fragmen URL. Fragmen tak dikenal (mis. token Supabase) jatuh ke dashboard. */
export function useRoute() {
  const route = useSyncExternalStore(subscribe, snapshot, () => "dashboard");

  const navigate = useCallback((id) => {
    const target = routeFromHash(id);
    if (window.location.hash !== `#${target}`) {
      window.history.pushState(null, "", `#${target}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return [route, navigate];
}
