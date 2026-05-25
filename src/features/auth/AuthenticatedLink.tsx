"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import type {ComponentProps, MouseEvent} from "react";
import {getCurrentUser} from "./auth.client";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
    fallbackHref: string;
    href: string;
    onSessionExpired?: () => void;
};

export default function AuthenticatedLink({
    fallbackHref,
    href,
    onClick,
    onSessionExpired,
    prefetch = false,
    scroll,
    target,
    ...props
}: Props) {
    const router = useRouter();

    async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        onClick?.(event);

        if (event.defaultPrevented
            || event.button !== 0
            || event.metaKey
            || event.ctrlKey
            || event.shiftKey
            || event.altKey
            || target === "_blank") {
            return;
        }

        event.preventDefault();

        try {
            if (await getCurrentUser()) {
                router.push(href, {scroll});
                return;
            }
        } catch {
            // The fallback page gives the user a usable recovery route on API failure.
        }

        onSessionExpired?.();
        router.replace(fallbackHref);
        router.refresh();
    }

    return (
        <Link {...props} href={href} onClick={handleClick} prefetch={prefetch} scroll={scroll} target={target} />
    );
}
