"use client";

import {useEffect, useState} from "react";
import {useParams, useRouter, useSearchParams} from "next/navigation";
import {useTranslations} from "next-intl";
import Alert from "@/components/ui/state/Alert";
import type {Locale} from "@/i18n";
import {completeProviderAuth, type AuthProvider} from "./auth.client";
import {withLocale} from "@/shared/lib/locale/withLocale";

const providers = new Set<AuthProvider>(["GOOGLE", "APPLE", "TELEGRAM"]);

export default function ProviderCallbackContent() {
    const t = useTranslations("auth.providers");
    const router = useRouter();
    const search = useSearchParams();
    const params = useParams<{lang: Locale}>();
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const provider = search.get("provider")?.toUpperCase() as AuthProvider | undefined;
        const state = search.get("state");
        const code = search.get("code") ?? "";
        if (!provider || !providers.has(provider) || !state) {
            setFailed(true);
            return;
        }
        const telegram = provider === "TELEGRAM"
            ? Object.fromEntries(
                ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"]
                    .map((key) => [key, search.get(key)])
                    .filter((entry): entry is [string, string] => entry[1] !== null)
            )
            : undefined;
        completeProviderAuth(provider, state, code, telegram)
            .then(() => {
                router.replace(withLocale("/", params.lang));
                router.refresh();
            })
            .catch(() => setFailed(true));
    }, [params.lang, router, search]);

    return (
        <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-stone-950">{t("callbackTitle")}</h1>
            <div className="mt-3">
                {failed
                    ? <Alert tone="error">{t("callbackError")}</Alert>
                    : <p className="text-sm text-stone-600">{t("callbackPending")}</p>}
            </div>
        </div>
    );
}
