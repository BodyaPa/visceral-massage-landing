"use client";

import {useMemo, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useGetFinanceAnalyticsQuery} from "./bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {formatAmount, toNextDayIso, toStartOfDayIso} from "./financeFormatting";
import LoadingState from "@/components/ui/state/LoadingState";
import ErrorState from "@/components/ui/state/ErrorState";
import {API_URL} from "@/shared/constants/env";

function isoDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

export default function FinanceAnalyticsDashboard() {
    const t = useTranslations("admin.analytics");
    const locale = useLocale();
    const now = useMemo(() => new Date(), []);
    const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
    const [from, setFrom] = useState(isoDate(monthStart));
    const [to, setTo] = useState(isoDate(now));
    const [direction, setDirection] = useState("");
    const [officeId, setOfficeId] = useState("");
    const {data: offices} = useListPublicOfficesQuery({size: 100});
    const args = {from: toStartOfDayIso(from)!, to: toNextDayIso(to)!, direction: direction || undefined, officeId: officeId ? Number(officeId) : undefined};
    const analytics = useGetFinanceAnalyticsQuery(args);
    const exportUrl = `${API_URL}/admin/finance/analytics/export.csv?${new URLSearchParams(Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))).toString()}`;
    if (analytics.isLoading) return <LoadingState label={t("loading")} />;
    if (analytics.isError || !analytics.data) return <ErrorState action={<button className="rounded-lg bg-stone-950 px-3 py-2 text-sm text-white" onClick={() => void analytics.refetch()}>{t("retry")}</button>} description={t("error")} title={t("errorTitle")} />;
    const data = analytics.data;
    const cards = [
        ["collected", formatAmount(data.collectedAmount, locale)], ["refunded", formatAmount(data.refundedAmount, locale)],
        ["net", formatAmount(data.netCollectedAmount, locale)], ["average", formatAmount(data.averageCheck, locale)],
        ["result", formatAmount(data.businessResultBeforeTax, locale)], ["occupancy", `${data.occupancyPercent}%`],
        ["bookings", String(data.bookingCount)], ["completed", String(data.completedCount)],
        ["cancelled", String(data.cancelledCount)], ["noShow", String(data.noShowCount)]
    ];
    return <section className="min-w-0 space-y-5">
        <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{t("eyebrow")}</p><h1 className="mt-2 text-2xl font-semibold text-stone-950">{t("title")}</h1><p className="mt-2 max-w-3xl text-sm text-stone-600">{t("subtitle")}</p></header>
        <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm text-stone-600">{t("from")}<input className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" onChange={e => setFrom(e.target.value)} type="date" value={from}/></label>
            <label className="text-sm text-stone-600">{t("to")}<input className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" onChange={e => setTo(e.target.value)} type="date" value={to}/></label>
            <label className="text-sm text-stone-600">{t("direction")}<select className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" onChange={e => setDirection(e.target.value)} value={direction}><option value="">{t("all")}</option><option value="MASSAGE">{t("massage")}</option><option value="TRAINING">{t("training")}</option></select></label>
            <label className="text-sm text-stone-600">{t("office")}<select className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" onChange={e => setOfficeId(e.target.value)} value={officeId}><option value="">{t("all")}</option>{(offices?.content ?? []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <a className="self-end rounded-lg bg-stone-950 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-stone-800" href={exportUrl}>{t("export")}</a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([key,value]) => <article className="rounded-xl border border-stone-200 bg-white p-4" key={key}><p className="text-xs text-stone-500">{t(`metrics.${key}`)}</p><strong className="mt-2 block text-xl text-stone-950">{value}</strong></article>)}</div>
        <div className="grid gap-5 xl:grid-cols-2"><Breakdown rows={data.offerings} title={t("offerings")} locale={locale}/><Breakdown rows={data.sources} title={t("sources")} locale={locale}/></div>
    </section>;
}

function Breakdown({rows,title,locale}: {rows: Array<{key:string;label:string;records:number;collectedAmount:number}>;title:string;locale:string}) {
    return <section className="rounded-2xl border border-stone-200 bg-white p-4"><h2 className="font-semibold text-stone-950">{title}</h2><div className="mt-3 space-y-2">{rows.map(row => <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg bg-stone-50 px-3 py-2 text-sm" key={row.key}><span className="truncate">{row.label}</span><strong>{row.records} · {formatAmount(row.collectedAmount, locale)}</strong></div>)}</div></section>;
}
