export function safeNext(value: string | null, fallback = "/editor") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      ![
        "/dashboard",
        "/editor",
        "/account",
        "/onboarding",
        "/pricing",
      ].includes(url.pathname)
    )
      return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
export type Preferences = {
  purpose: "personal" | "business" | "client";
  start: "sample" | "template" | "reference" | "guest";
  completed: boolean;
};
export const START_KEY = "forma.start-intent.v1";
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
