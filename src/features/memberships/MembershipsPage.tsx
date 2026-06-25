"use client";

import Link from "next/link";
import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import PublicContentAutoScroll from "@/components/common/PublicContentAutoScroll";

type OfferKind = "membership" | "certificate";

type OfferDefinition = {
    id: "care-4" | "recovery-8" | "gift";
    kind: OfferKind;
    price: number;
    visits: number | null;
    includedKeys: string[];
    conditionKeys: string[];
};

const offers: OfferDefinition[] = [
    {
        id: "care-4",
        kind: "membership",
        price: 7200,
        visits: 4,
        includedKeys: ["individual", "office", "support"],
        conditionKeys: ["validity60", "manualPayment", "personal"]
    },
    {
        id: "recovery-8",
        kind: "membership",
        price: 13600,
        visits: 8,
        includedKeys: ["individual", "priority", "support"],
        conditionKeys: ["validity120", "manualPayment", "personal"]
    },
    {
        id: "gift",
        kind: "certificate",
        price: 2500,
        visits: null,
        includedKeys: ["giftAmount", "serviceChoice", "recipient"],
        conditionKeys: ["validity90", "manualPayment", "notCash"]
    }
];

export default function MembershipsPage() {
    const t = useTranslations("memberships.page");
    const locale = useLocale() as Locale;
    const [selectedOffer, setSelectedOffer] = useState<OfferDefinition | null>(null);
    const contactHref = `${withLocale("/contact", locale)}?intent=membership`;

    return (
        <main className="min-h-screen bg-stone-50" id="public-page-content">
            <PublicContentAutoScroll targetId="public-page-content" />
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

            <section className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-4 lg:grid-cols-3">
                    {offers.map((offer) => (
                        <article className="flex min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm" key={offer.id}>
                            <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600">{t(`offers.${offer.id}.kind`)}</span>
                                    <h2 className="mt-3 break-words text-xl font-semibold text-stone-950">{t(`offers.${offer.id}.title`)}</h2>
                                </div>
                                <strong className="shrink-0 text-right text-lg font-semibold text-stone-950">{formatAmount(offer.price, locale)}</strong>
                            </div>
                            <p className="mt-3 min-h-16 break-words text-sm leading-6 text-stone-600">{t(`offers.${offer.id}.description`)}</p>
                            <dl className="mt-4 grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                    <dt className="text-stone-500">{t("visits")}</dt>
                                    <dd className="break-words text-right font-medium text-stone-900">{offer.visits ? t("visitCount", {count: offer.visits}) : t("certificateValue")}</dd>
                                </div>
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                    <dt className="text-stone-500">{t("validity")}</dt>
                                    <dd className="break-words text-right font-medium text-stone-900">{t(`offers.${offer.id}.validity`)}</dd>
                                </div>
                            </dl>
                            <ul className="mt-4 space-y-2 text-sm text-stone-600">
                                {offer.includedKeys.map((key) => <li className="break-words" key={key}>{t(`included.${key}`)}</li>)}
                            </ul>
                            <div className="mt-auto flex flex-wrap gap-2 pt-5">
                                <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" onClick={() => setSelectedOffer(offer)} type="button">
                                    {t("details")}
                                </button>
                                <Link className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700" href={`${contactHref}&offer=${offer.id}`}>
                                    {t("buy")}
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {selectedOffer ? <OfferDetails contactHref={`${contactHref}&offer=${selectedOffer.id}`} locale={locale} offer={selectedOffer} onClose={() => setSelectedOffer(null)} /> : null}
        </main>
    );
}

function OfferDetails({contactHref, locale, offer, onClose}: {contactHref: string; locale: Locale; offer: OfferDefinition; onClose: () => void}) {
    const t = useTranslations("memberships.page");

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 px-3 py-3 sm:items-center sm:justify-center" role="presentation">
            <section aria-labelledby="membership-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
                <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{t(`offers.${offer.id}.kind`)}</p>
                        <h2 className="mt-2 break-words text-2xl font-semibold text-stone-950" id="membership-details-title">{t(`offers.${offer.id}.title`)}</h2>
                    </div>
                    <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100" onClick={onClose} type="button">{t("close")}</button>
                </div>
                <p className="mt-4 break-words text-sm leading-6 text-stone-600">{t(`offers.${offer.id}.description`)}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <InfoCard label={t("price")} value={formatAmount(offer.price, locale)} />
                    <InfoCard label={t("visits")} value={offer.visits ? t("visitCount", {count: offer.visits}) : t("certificateValue")} />
                    <InfoCard label={t("validity")} value={t(`offers.${offer.id}.validity`)} />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <section className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <h3 className="text-sm font-semibold text-stone-950">{t("includedTitle")}</h3>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
                            {offer.includedKeys.map((key) => <li className="break-words" key={key}>{t(`included.${key}`)}</li>)}
                        </ul>
                    </section>
                    <section className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <h3 className="text-sm font-semibold text-stone-950">{t("conditionsTitle")}</h3>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
                            {offer.conditionKeys.map((key) => <li className="break-words" key={key}>{t(`conditions.${key}`)}</li>)}
                        </ul>
                    </section>
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" onClick={onClose} type="button">{t("close")}</button>
                    <Link className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700" href={contactHref}>{t("buy")}</Link>
                </div>
            </section>
        </div>
    );
}

function InfoCard({label, value}: {label: string; value: string}) {
    return (
        <div className="min-w-0 rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
            <p className="mt-2 break-words text-sm font-semibold text-stone-950">{value}</p>
        </div>
    );
}

function formatAmount(amount: number, locale: Locale) {
    return new Intl.NumberFormat(locale === "ua" ? "uk-UA" : "en-US", {
        currency: "UAH",
        maximumFractionDigits: 0,
        style: "currency"
    }).format(amount);
}
