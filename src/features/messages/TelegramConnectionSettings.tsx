"use client";

import {useEffect, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/ui/form/Checkbox";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import Alert from "@/components/ui/state/Alert";
import LoadingState from "@/components/ui/state/LoadingState";
import {useCreateTelegramLinkMutation, useListChannelsQuery, useUnlinkTelegramMutation, useUpdateConsentMutation} from "./messages.api";

export default function TelegramConnectionSettings() {
    const t = useTranslations("accountPage.serviceMessages");
    const locale = useLocale();
    const dateLocale = locale === "ua" ? "uk-UA" : "en-GB";
    const [generated, setGenerated] = useState<{deepLink: string; expiresAt: string; previousConnectedAt: string | null} | null>(null);
    const channels = useListChannelsQuery(undefined, {
        pollingInterval: generated ? 1500 : 0,
        refetchOnFocus: true,
        refetchOnReconnect: true
    });
    const [updateConsent, consent] = useUpdateConsentMutation();
    const [createLink, linking] = useCreateTelegramLinkMutation();
    const [unlink, unlinking] = useUnlinkTelegramMutation();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const telegram = channels.data?.find((item) => item.channel === "TELEGRAM");
    const connected = telegram?.connected === true;

    useEffect(() => {
        if (connected && generated && telegram?.lastConnectedAt !== generated.previousConnectedAt) setGenerated(null);
    }, [connected, generated, telegram?.lastConnectedAt]);

    const connect = async () => {
        try {
            const link = await createLink().unwrap();
            setGenerated({...link, previousConnectedAt: telegram?.lastConnectedAt ?? null});
            window.open(link.deepLink, "_blank", "noopener,noreferrer");
        } catch {/* RTK state renders the error. */}
    };
    const confirmUnlink = async () => {
        try {
            await unlink().unwrap();
            setGenerated(null);
            setConfirmOpen(false);
        } catch {/* Dialog remains open and error is rendered. */}
    };

    if (channels.isLoading) return <LoadingState label={t("connectionLoading")} />;
    return <section aria-labelledby="telegram-settings-title" className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Telegram</p>
                <h3 className="mt-1 text-base font-semibold text-stone-950" id="telegram-settings-title">{connected ? t("telegramConnected") : t("telegramDisconnected")}</h3>
                {connected && (telegram?.providerDisplayName || telegram?.providerUsername) ? <p className="mt-1 break-words text-sm text-stone-600">{[telegram.providerDisplayName, telegram.providerUsername].filter(Boolean).join(" · ")}</p> : null}
                {connected && telegram?.lastConnectedAt ? <p className="mt-1 text-xs text-stone-500">{t("lastConnected", {date: new Date(telegram.lastConnectedAt).toLocaleString(dateLocale)})}</p> : null}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-44">
                <Button disabled={linking.isLoading} fullWidth onClick={() => void connect()} variant={connected ? "secondary" : "primary"}>{linking.isLoading ? t("openingTelegram") : connected ? t("reconnectTelegram") : t("connectTelegram")}</Button>
                {connected ? <Button disabled={unlinking.isLoading} fullWidth onClick={() => setConfirmOpen(true)} variant="danger">{t("unlinkTelegram")}</Button> : null}
            </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-600">{t("telegramHint")}</p>
        {generated ? <Alert tone="info"><p>{t("linkGenerated", {date: new Date(generated.expiresAt).toLocaleTimeString(dateLocale)})}</p><a className="mt-1 inline-block break-all font-semibold underline underline-offset-2" href={generated.deepLink} rel="noreferrer" target="_blank">{t("openGeneratedLink")}</a></Alert> : null}
        {connected ? <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3"><Checkbox checked={telegram.serviceConsent} disabled={consent.isLoading} hint={t("consentHint")} id="telegram-service-consent" label={t("serviceConsent")} onChange={(event) => void updateConsent({channel: "TELEGRAM", serviceConsent: event.target.checked})} /></div> : null}
        {channels.isError || linking.isError ? <div className="mt-3"><Alert tone="error">{t("connectError")}</Alert></div> : null}
        {consent.isError ? <div className="mt-3"><Alert tone="error">{t("consentError")}</Alert></div> : null}
        <ConfirmDialog busy={unlinking.isLoading} cancelLabel={t("keepConnected")} closeLabel={t("closeDialog")} confirmLabel={t("confirmUnlink")} destructive onClose={() => setConfirmOpen(false)} onConfirm={() => void confirmUnlink()} open={confirmOpen} title={t("unlinkTitle")}>
            <p>{t("unlinkDescription")}</p>
            {unlinking.isError ? <div className="mt-3"><Alert tone="error">{t("unlinkError")}</Alert></div> : null}
        </ConfirmDialog>
    </section>;
}
