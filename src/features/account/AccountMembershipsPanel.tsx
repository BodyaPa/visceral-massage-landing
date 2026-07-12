"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import BoundedList from "@/components/ui/list/BoundedList";
import {useCreateMembershipPaymentSessionMutation, useListMyMembershipPurchasesQuery} from "@/features/memberships/memberships.api";
import type {Locale} from "@/i18n";
import {formatWholeCurrencyAmount as formatAmount} from "@/shared/lib/i18n/formatNumbers";

export default function AccountMembershipsPanel({locale}: {locale: Locale}) {
    const t = useTranslations("accountPage.memberships");
    const toast = useToast();
    const [page, setPage] = useState(0);
    const {data, isError, isFetching} = useListMyMembershipPurchasesQuery({page, size: 12});
    const purchases = data?.content ?? [];
    const [createPaymentSession, {isLoading: paymentOpening}] = useCreateMembershipPaymentSessionMutation();

    async function openPayment(purchaseId: number) {
        try {
            const session = await createPaymentSession(purchaseId).unwrap();
            if (session.checkoutUrl) {
                window.open(session.checkoutUrl, "_blank", "noopener,noreferrer");
                return;
            }
            toast.success(t("manualPayment"));
        } catch {
            toast.error(t("paymentError"));
        }
    }

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-stone-950">{t("title")}</h2>
                    <p className="mt-1 text-sm text-stone-600">{t("body")}</p>
                </div>
            </div>
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("loadError")}</p> : null}
            {isFetching ? <p className="mt-4 text-sm text-stone-500">{t("loading")}</p> : null}
            {!isFetching && purchases.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center text-sm text-stone-500">{t("empty")}</p> : null}
            {purchases.length > 0 ? (
                <BoundedList
                    initialCount={6}
                    items={purchases}
                    labels={{
                        showLess: t("showLess"),
                        showMore: t("showMore"),
                        showing: (visible, total) => t("showing", {total, visible})
                    }}
                    renderItems={(visiblePurchases) => (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {visiblePurchases.map((purchase) => (
                                <article className="rounded-lg border border-stone-200 bg-stone-50 p-3" key={purchase.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="break-words text-sm font-semibold text-stone-950">{locale === "ua" ? purchase.titleUa : purchase.titleEn}</h3>
                                            <p className="mt-1 text-xs text-stone-500">{t(`statuses.${purchase.status}`)}</p>
                                        </div>
                                        <strong className="shrink-0 text-sm text-stone-950">{formatAmount(purchase.priceSnapshot, locale)}</strong>
                                    </div>
                                    <dl className="mt-3 grid gap-2 text-xs text-stone-600">
                                        <Info label={t("visits")} value={purchase.visitsRemaining == null ? t("certificate") : String(purchase.visitsRemaining)} />
                                        {purchase.expiresAt ? <Info label={t("expires")} value={formatDate(purchase.expiresAt, locale)} /> : null}
                                    </dl>
                                    {purchase.status === "AWAITING_PAYMENT_CONFIRMATION" ? <button className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-50" disabled={paymentOpening} onClick={() => openPayment(purchase.id)} type="button">{paymentOpening ? t("paymentOpening") : t("pay")}</button> : null}
                                </article>
                            ))}
                        </div>
                    )}
                    step={6}
                />
            ) : null}
            {data && data.totalPages > 1 ? <div className="mt-4 flex justify-end gap-2"><button className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40" disabled={page === 0} onClick={() => setPage((current) => current - 1)} type="button">{t("previous")}</button><button className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40" disabled={page + 1 >= data.totalPages} onClick={() => setPage((current) => current + 1)} type="button">{t("next")}</button></div> : null}
        </section>
    );
}

function Info({label, value}: {label: string; value: string}) {
    return <div className="flex justify-between gap-3"><dt>{label}</dt><dd className="text-right font-medium text-stone-900">{value}</dd></div>;
}

function formatDate(value: string, locale: Locale) {
    return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-US", {dateStyle: "medium"}).format(new Date(value));
}
