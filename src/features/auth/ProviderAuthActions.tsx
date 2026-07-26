"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/state/Alert";
import {
    beginProviderAuth,
    getProviderAvailability,
    type AuthProvider,
    type ProviderAvailability
} from "./auth.client";

export default function ProviderAuthActions({action}: {action: "LOGIN" | "LINK"}) {
    const t = useTranslations("auth.providers");
    const [providers, setProviders] = useState<ProviderAvailability[]>([]);
    const [pending, setPending] = useState<AuthProvider | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        getProviderAvailability()
            .then((items) => {
                if (active) setProviders(items.filter((item) => item.enabled));
            })
            .catch(() => {
                if (active) setFailed(true);
            });
        return () => {
            active = false;
        };
    }, []);

    if (failed) return <Alert tone="error">{t("loadError")}</Alert>;
    if (providers.length === 0) return null;

    async function begin(provider: AuthProvider) {
        setPending(provider);
        setFailed(false);
        try {
            await beginProviderAuth(provider, action, window.location.pathname);
        } catch {
            setFailed(true);
            setPending(null);
        }
    }

    return (
        <div className="space-y-3 border-t border-stone-200 pt-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                {t(action === "LOGIN" ? "loginTitle" : "linkTitle")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
                {providers.map(({provider}) => (
                    <Button
                        disabled={pending !== null}
                        key={provider}
                        onClick={() => begin(provider)}
                        type="button"
                        variant="secondary"
                    >
                        {pending === provider ? t("opening") : t(`names.${provider}`)}
                    </Button>
                ))}
            </div>
            {failed ? <Alert tone="error">{t("startError")}</Alert> : null}
        </div>
    );
}
