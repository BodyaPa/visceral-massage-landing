"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/state/Alert";
import ProviderAuthActions from "@/features/auth/ProviderAuthActions";
import {
    getLinkedProviders,
    unlinkProvider,
    type AuthProvider,
    type LinkedProviderIdentity
} from "@/features/auth/auth.client";

export default function LinkedProvidersPanel() {
    const t = useTranslations("accountPage.securitySettings.providers");
    const [identities, setIdentities] = useState<LinkedProviderIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [pending, setPending] = useState<AuthProvider | null>(null);

    useEffect(() => {
        void reload();
    }, []);

    async function reload() {
        setLoading(true);
        setFailed(false);
        try {
            setIdentities(await getLinkedProviders());
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }

    async function remove(provider: AuthProvider) {
        setPending(provider);
        setFailed(false);
        try {
            await unlinkProvider(provider);
            await reload();
        } catch {
            setFailed(true);
        } finally {
            setPending(null);
        }
    }

    return (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <h3 className="text-sm font-semibold text-stone-900">{t("title")}</h3>
            <p className="mt-1 text-xs leading-5 text-stone-500">{t("hint")}</p>
            {loading ? <p className="mt-3 text-sm text-stone-500">{t("loading")}</p> : null}
            {!loading && identities.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                    {identities.map((identity) => (
                        <li
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-3"
                            key={identity.provider}
                        >
                            <div>
                                <p className="text-sm font-semibold text-stone-900">
                                    {t(`names.${identity.provider}`)}
                                </p>
                                <p className="text-xs text-stone-500">
                                    {identity.email ?? identity.displayName ?? t("linked")}
                                </p>
                            </div>
                            <Button
                                disabled={pending !== null}
                                onClick={() => remove(identity.provider)}
                                size="sm"
                                type="button"
                                variant="secondary"
                            >
                                {pending === identity.provider ? t("removing") : t("remove")}
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}
            {failed ? <div className="mt-3"><Alert tone="error">{t("error")}</Alert></div> : null}
            <div className="mt-4">
                <ProviderAuthActions action="LINK" />
            </div>
        </div>
    );
}
