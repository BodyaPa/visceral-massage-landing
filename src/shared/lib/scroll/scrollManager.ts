const RESTORE_SCROLL_KEY = "app:restore-scroll-y";
const SUPPRESS_AUTO_SCROLL_UNTIL_KEY = "app:suppress-auto-scroll-until";

const SUPPRESS_DURATION_MS = 1200;

export function prepareLocaleSwitchScrollRestore() {
    if (typeof window === "undefined") return;

    sessionStorage.setItem(RESTORE_SCROLL_KEY, String(window.scrollY));
    sessionStorage.setItem(
        SUPPRESS_AUTO_SCROLL_UNTIL_KEY,
        String(Date.now() + SUPPRESS_DURATION_MS)
    );
}

export function restoreScrollAfterNavigation() {
    if (typeof window === "undefined") return;

    const savedScroll = sessionStorage.getItem(RESTORE_SCROLL_KEY);
    if (!savedScroll) return;

    sessionStorage.removeItem(RESTORE_SCROLL_KEY);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.scrollTo({
                top: Number(savedScroll),
                behavior: "auto"
            });
        });
    });
}

export function shouldSuppressAutoScroll() {
    if (typeof window === "undefined") return false;

    const raw = sessionStorage.getItem(SUPPRESS_AUTO_SCROLL_UNTIL_KEY);
    if (!raw) return false;

    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
}

export function clearAutoScrollSuppression() {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(SUPPRESS_AUTO_SCROLL_UNTIL_KEY);
}