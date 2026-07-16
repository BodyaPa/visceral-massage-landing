"use client";

import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState} from "react";
import BoundedList from "@/components/ui/list/BoundedList";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {
    useCreateMembershipPaymentSessionMutation,
    useCreateMembershipPurchaseMutation,
    useListMembershipOffersQuery,
    useListMyMembershipPurchasesQuery
} from "@/features/memberships/memberships.api";
import {useListServicesQuery} from "@/features/services/services.api";
import type {Locale} from "@/i18n";
import {formatWholeCurrencyAmount as formatAmount} from "@/shared/lib/i18n/formatNumbers";
import {resolveApiMediaUrl} from "@/shared/lib/media/resolveApiMediaUrl";
import type {MembershipOffer, MembershipPurchase} from "@/types/memberships";
import Button from "@/components/ui/button/Button";
import Dialog from "@/components/ui/overlay/Dialog";

const includedByCode: Record<string, string[]> = {
    "care-4": ["individual", "office", "support"],
    "recovery-8": ["individual", "priority", "support"],
    gift: ["giftAmount", "serviceChoice", "recipient"]
};

export default function MembershipsPage() {
    const t = useTranslations("memberships.page");
    const locale = useLocale() as Locale;
    const toast = useToast();
    const {data: offers = [], isFetching, isError} = useListMembershipOffersQuery();
    const {data: servicesData} = useListServicesQuery({lang: locale, size: 200});
    const services = servicesData?.content ?? [];
    const {data: purchasesData} = useListMyMembershipPurchasesQuery({size: 50});
    const [createPurchase, {isLoading}] = useCreateMembershipPurchaseMutation();
    const [createPaymentSession, {isLoading: isCreatingPaymentSession}] = useCreateMembershipPaymentSessionMutation();
    const [selectedOffer, setSelectedOffer] = useState<MembershipOffer | null>(null);
    const [checkoutOffer, setCheckoutOffer] = useState<MembershipOffer | null>(null);
    const [manualPaymentOffer, setManualPaymentOffer] = useState<MembershipOffer | null>(null);
    const purchases = useMemo(() => purchasesData?.content ?? [], [purchasesData?.content]);
    const pendingPurchases = new Map(purchases.filter((item) => item.status === "AWAITING_PAYMENT_CONFIRMATION").map((item) => [item.offerId, item]));
    const isProcessingCheckout = isLoading || isCreatingPaymentSession;

    function openPaymentDialog(offer: MembershipOffer) {
        setSelectedOffer(null);
        setCheckoutOffer(offer);
    }

    async function confirmPayment(offer: MembershipOffer) {
        const paymentWindow = window.open("about:blank", "_blank");
        try {
            const purchase = await createPurchase({offerId: offer.id}).unwrap();
            const session = await createPaymentSession(purchase.id).unwrap();
            if (session.checkoutUrl) {
                openCheckoutInPreparedWindow(paymentWindow, session.checkoutUrl);
                setCheckoutOffer(null);
                return;
            }
            paymentWindow?.close();
            if (session.requiresManualConfirmation) {
                setCheckoutOffer(null);
                setManualPaymentOffer(offer);
            }
            toast.success(session.requiresManualConfirmation ? t("manualSessionCreated") : t("purchaseCreated"));
        } catch {
            paymentWindow?.close();
            toast.error(t("purchaseError"));
        }
    }

    async function resumePayment(purchase: MembershipPurchase) {
        const paymentWindow = window.open("about:blank", "_blank");
        try {
            const session = await createPaymentSession(purchase.id).unwrap();
            if (session.checkoutUrl) openCheckoutInPreparedWindow(paymentWindow, session.checkoutUrl);
            else {
                paymentWindow?.close();
                toast.success(t("manualSessionCreated"));
            }
        } catch {
            paymentWindow?.close();
            toast.error(t("purchaseError"));
        }
    }

    return (
        <main className="min-h-screen bg-stone-50" id="public-page-content">
            <section className="border-b border-stone-200 bg-white">
                <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{t("eyebrow")}</p>
                        <h1 className="mt-3 max-w-3xl break-words text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{t("title")}</h1>
                        <p className="mt-4 max-w-2xl break-words text-base leading-7 text-stone-600">{t("subtitle")}</p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-sm font-semibold text-stone-950">{t("manualTitle")}</p>
                        <p className="mt-2 break-words text-sm leading-6 text-stone-600">{t("manualBody")}</p>
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-[1180px] px-4 py-8 pb-20 sm:px-6 lg:px-8 lg:pb-24">
                {isError ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("loadError")}</p> : null}
                {isFetching ? <p className="mb-4 text-sm text-stone-500">{t("loading")}</p> : null}
                <div className="grid gap-5 md:grid-cols-2">
                    {offers.map((offer) => (
                        <OfferCard
                            disabled={isProcessingCheckout}
                            key={offer.id}
                            locale={locale}
                            offer={offer}
                            onBuy={openPaymentDialog}
                            onPayPending={() => {
                                const purchase = pendingPurchases.get(offer.id);
                                if (purchase) void resumePayment(purchase);
                            }}
                            onDetails={setSelectedOffer}
                            pending={pendingPurchases.has(offer.id)}
                            t={t}
                        />
                    ))}
                </div>
                <PurchaseSummary locale={locale} onPay={(purchase) => void resumePayment(purchase)} purchases={purchases} t={t} />
            </section>

            {selectedOffer ? <OfferDetails locale={locale} offer={selectedOffer} onBuy={openPaymentDialog} onClose={() => setSelectedOffer(null)} pending={pendingPurchases.has(selectedOffer.id)} services={services} t={t} /> : null}
            {checkoutOffer ? (
                <PaymentConfirmationDialog
                    isLoading={isProcessingCheckout}
                    locale={locale}
                    offer={checkoutOffer}
                    onClose={() => setCheckoutOffer(null)}
                    onConfirm={() => confirmPayment(checkoutOffer)}
                    t={t}
                />
            ) : null}
            {manualPaymentOffer ? <ManualPaymentDialog locale={locale} offer={manualPaymentOffer} onClose={() => setManualPaymentOffer(null)} t={t} /> : null}
        </main>
    );
}

type T = ReturnType<typeof useTranslations<"memberships.page">>;

function OfferCard({disabled, locale, offer, onBuy, onDetails, onPayPending, pending, t}: {disabled: boolean; locale: Locale; offer: MembershipOffer; onBuy: (offer: MembershipOffer) => void; onDetails: (offer: MembershipOffer) => void; onPayPending: () => void; pending: boolean; t: T}) {
    return (
        <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm sm:flex-row">
            {offer.backgroundMediaUrl ? (
                <div className="h-52 w-full shrink-0 bg-stone-100 sm:h-auto sm:w-44">
                    {/* eslint-disable-next-line @next/next/no-img-element -- membership offer background is served by the API. */}
                    <img alt="" className="h-full w-full object-cover" src={resolveApiMediaUrl(offer.backgroundMediaUrl)} />
                </div>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col p-5">
            <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600">{kindLabel(offer, t)}</span>
                    <h2 className="mt-3 break-words text-xl font-semibold text-stone-950">{localizedTitle(offer, locale)}</h2>
                </div>
                <strong className="shrink-0 text-right text-lg font-semibold text-stone-950">{formatAmount(offer.price, locale)}</strong>
            </div>
            <p className="mt-3 min-h-16 break-words text-sm leading-6 text-stone-600">{localizedDescription(offer, locale)}</p>
            <dl className="mt-4 grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
                <InfoRow label={t("visits")} value={offer.visitsTotal ? t("visitCount", {count: offer.visitsTotal}) : t("certificateValue")} />
                <InfoRow label={t("validity")} value={t("validityDays", {count: offer.validityDays})} />
            </dl>
            {pending ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t("alreadyPending")}</p> : null}
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" onClick={() => onDetails(offer)} type="button">
                    {t("details")}
                </button>
                <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={disabled} onClick={() => pending ? onPayPending() : onBuy(offer)} type="button">
                    {pending ? t("payPending") : t("buy")}
                </button>
            </div>
            </div>
        </article>
    );
}

function OfferDetails({locale, offer, onBuy, onClose, pending, services, t}: {locale: Locale; offer: MembershipOffer; onBuy: (offer: MembershipOffer) => void; onClose: () => void; pending: boolean; services: Array<{id: number; title: string}>; t: T}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 px-3 py-3 sm:items-center sm:justify-center" role="presentation">
            <section aria-labelledby="membership-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
                <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{kindLabel(offer, t)}</p>
                        <h2 className="mt-2 break-words text-2xl font-semibold text-stone-950" id="membership-details-title">{localizedTitle(offer, locale)}</h2>
                    </div>
                    <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100" onClick={onClose} type="button">{t("close")}</button>
                </div>
                <p className="mt-4 break-words text-sm leading-6 text-stone-600">{localizedDescription(offer, locale)}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <InfoCard label={t("price")} value={formatAmount(offer.price, locale)} />
                    <InfoCard label={t("visits")} value={offer.visitsTotal ? t("visitCount", {count: offer.visitsTotal}) : t("certificateValue")} />
                    <InfoCard label={t("validity")} value={t("validityDays", {count: offer.validityDays})} />
                </div>
                <section className="mt-5 min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <h3 className="text-sm font-semibold text-stone-950">{t("includedTitle")}</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
                        {(includedByCode[offer.code] ?? ["support"]).map((key) => <li className="break-words" key={key}>{t(`included.${key}`)}</li>)}
                    </ul>
                </section>
                <section className="mt-4 min-w-0 rounded-xl border border-stone-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-stone-950">{t("eligibleServicesTitle")}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {services.filter((service) => offer.eligibleServiceIds.includes(service.id)).map((service) => <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700" key={service.id}>{service.title}</span>)}
                        {services.every((service) => !offer.eligibleServiceIds.includes(service.id)) ? <p className="text-sm text-stone-500">{t("eligibleServicesEmpty")}</p> : null}
                    </div>
                </section>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" onClick={onClose} type="button">{t("close")}</button>
                    <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={pending} onClick={() => onBuy(offer)} type="button">{pending ? t("pending") : t("buy")}</button>
                </div>
            </section>
        </div>
    );
}

function PaymentConfirmationDialog({isLoading, locale, offer, onClose, onConfirm, t}: {isLoading: boolean; locale: Locale; offer: MembershipOffer; onClose: () => void; onConfirm: () => void; t: T}) {
    return (
        <Dialog
            closeLabel={t("checkoutCancel")}
            description={t("checkoutBody")}
            eyebrow={t("checkoutEyebrow")}
            footer={(
                <>
                    <Button disabled={isLoading} onClick={onClose} variant="secondary">{t("checkoutCancel")}</Button>
                    <Button disabled={isLoading} onClick={onConfirm}>{isLoading ? t("checkoutProcessing") : t("checkoutPay")}</Button>
                </>
            )}
            onClose={onClose}
            open
            title={t("checkoutTitle", {kind: kindLabel(offer, t).toLowerCase()})}
        >
            <dl className="grid gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
                <InfoRow label={t("checkoutOffer")} value={localizedTitle(offer, locale)} />
                <InfoRow label={t("price")} value={formatAmount(offer.price, locale)} />
                <InfoRow label={t("visits")} value={offer.visitsTotal ? t("visitCount", {count: offer.visitsTotal}) : t("certificateValue")} />
                <InfoRow label={t("validity")} value={t("validityDays", {count: offer.validityDays})} />
            </dl>
            <p className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600">{t("checkoutNotice")}</p>
        </Dialog>
    );
}

function ManualPaymentDialog({locale, offer, onClose, t}: {locale: Locale; offer: MembershipOffer; onClose: () => void; t: T}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 px-3 py-3 sm:items-center sm:justify-center" role="presentation">
            <section aria-labelledby="membership-payment-title" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 shadow-2xl" role="dialog">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{t("manualPaymentEyebrow")}</p>
                <h2 className="mt-2 break-words text-2xl font-semibold text-stone-950" id="membership-payment-title">{t("manualPaymentTitle")}</h2>
                <p className="mt-3 break-words text-sm leading-6 text-stone-600">{t("manualPaymentBody", {offer: localizedTitle(offer, locale), price: formatAmount(offer.price, locale)})}</p>
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <p className="font-semibold">{t("manualPaymentNextTitle")}</p>
                    <p className="mt-1">{t("manualPaymentNextBody")}</p>
                </div>
                <button className="mt-5 w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 sm:w-fit" onClick={onClose} type="button">
                    {t("manualPaymentClose")}
                </button>
            </section>
        </div>
    );
}

function PurchaseSummary({locale, onPay, purchases, t}: {locale: Locale; onPay: (purchase: MembershipPurchase) => void; purchases: MembershipPurchase[]; t: T}) {
    if (purchases.length === 0) return null;
    return (
        <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-stone-950">{t("myPurchases")}</h2>
            <BoundedList
                initialCount={4}
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
                                {purchase.status === "AWAITING_PAYMENT_CONFIRMATION" ? <button className="mt-3 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" onClick={() => onPay(purchase)} type="button">{t("payPending")}</button> : null}
                            </article>
                        ))}
                    </div>
                )}
                step={4}
            />
        </section>
    );
}

function InfoCard({label, value}: {label: string; value: string}) {
    return <div className="min-w-0 rounded-xl border border-stone-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p><p className="mt-2 break-words text-sm font-semibold text-stone-950">{value}</p></div>;
}

function InfoRow({label, value}: {label: string; value: string}) {
    return <div className="flex min-w-0 items-center justify-between gap-3"><dt className="text-stone-500">{label}</dt><dd className="break-words text-right font-medium text-stone-900">{value}</dd></div>;
}

function localizedTitle(offer: MembershipOffer, locale: Locale) {
    return locale === "ua" ? offer.titleUa : offer.titleEn;
}

function localizedDescription(offer: MembershipOffer, locale: Locale) {
    return (locale === "ua" ? offer.descriptionUa : offer.descriptionEn) ?? "";
}

function kindLabel(offer: MembershipOffer, t: T) {
    return offer.kind === "CERTIFICATE" ? t("kinds.certificate") : t("kinds.membership");
}

function openCheckoutInPreparedWindow(paymentWindow: Window | null, checkoutUrl: string) {
    if (paymentWindow) {
        paymentWindow.opener = null;
        paymentWindow.location.href = checkoutUrl;
    } else {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    }
}
