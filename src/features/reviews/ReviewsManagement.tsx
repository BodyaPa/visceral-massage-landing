"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Dialog from "@/components/ui/overlay/Dialog";
import Pagination from "@/components/ui/table/Pagination";
import StatusBadge from "@/components/ui/state/StatusBadge";
import {useListAdminReviewsQuery, useListReviewReportsQuery, useModerateReviewMutation, useResolveReviewReportMutation} from "./reviews.api";
import type {Review, ReviewStatus} from "@/types/reviews";
import type {Locale} from "@/i18n";
import {useToast} from "@/components/ui/toast/ToastProvider";

export default function ReviewsManagement({locale}: {locale: Locale}) {
    const t = useTranslations("admin.reviews");
    const toast = useToast();
    const [page, setPage] = useState(0);
    const [status, setStatus] = useState<ReviewStatus | undefined>("PENDING");
    const [selected, setSelected] = useState<Review | null>(null);
    const [nextStatus, setNextStatus] = useState<ReviewStatus>("PUBLISHED");
    const [response, setResponse] = useState("");
    const {data, isLoading, isError} = useListAdminReviewsQuery({page, status, lang: locale});
    const [moderate, {isLoading: saving}] = useModerateReviewMutation();
    const {data: reports} = useListReviewReportsQuery({page: 0});
    const [resolveReport, {isLoading: resolving}] = useResolveReviewReportMutation();

    function open(review: Review) {setSelected(review);setNextStatus(review.status);setResponse(review.companyResponse ?? "");}
    async function save() {
        if (!selected) return;
        try {await moderate({id: selected.id, status: nextStatus, companyResponse: response.trim() || null, lang: locale}).unwrap();toast.success(t("saved"));setSelected(null);}
        catch {toast.error(t("saveError"));}
    }

    return <main className="space-y-5"><header><p className="text-xs font-semibold uppercase tracking-[.18em] text-stone-500">ADMIN</p><h1 className="mt-2 text-2xl font-semibold text-stone-950">{t("title")}</h1><p className="mt-2 text-sm text-stone-600">{t("subtitle")}</p></header>
        {reports?.content.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-semibold text-amber-950">{t("reports")} · {reports.totalElements}</h2><div className="mt-3 space-y-2">{reports.content.map(report => <article className="rounded-xl border border-amber-200 bg-white p-3" key={report.id}><p className="text-sm font-semibold">{t(`reportReasons.${report.reason}`)} · #{report.reviewId}</p>{report.details ? <p className="mt-1 text-sm text-stone-600">{report.details}</p> : null}<div className="mt-2 flex gap-2"><Button disabled={resolving} onClick={() => void resolveReport({id: report.id,status:"RESOLVED",note:null})} size="sm">{t("resolve")}</Button><Button disabled={resolving} onClick={() => void resolveReport({id: report.id,status:"DISMISSED",note:null})} size="sm" variant="secondary">{t("dismiss")}</Button></div></article>)}</div></section> : null}
        <div className="flex flex-wrap gap-2">{(["PENDING","PUBLISHED","HIDDEN","REJECTED"] as ReviewStatus[]).map(item => <Button key={item} onClick={() => {setStatus(item);setPage(0)}} variant={status === item ? "primary" : "secondary"}>{t(`statuses.${item}`)}</Button>)}</div>
        {isLoading ? <p>{t("loading")}</p> : isError ? <p className="text-red-700">{t("loadError")}</p> : <div className="grid gap-3 lg:grid-cols-2">{data?.content.map(review => <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm" key={review.id}><div className="flex justify-between gap-3"><span className="text-amber-600">{"★".repeat(review.rating)}</span><StatusBadge tone={review.status === "PUBLISHED" ? "success" : review.status === "PENDING" ? "warning" : "neutral"}>{t(`statuses.${review.status}`)}</StatusBadge></div><p className="mt-3 text-sm text-stone-700">{review.text || t("ratingOnly")}</p><p className="mt-3 text-xs text-stone-500">{review.displayName} · {review.offeringTitle} · {review.specialistName}</p><div className="mt-3 flex justify-end"><Button onClick={() => open(review)} size="sm" variant="secondary">{t("moderate")}</Button></div></article>)}</div>}
        {data ? <Pagination nextLabel={t("next")} onChange={setPage} page={page} pageLabel={(current,total)=>t("page",{current,total})} previousLabel={t("previous")} totalPages={data.totalPages} /> : null}
        <Dialog closeLabel={t("close")} description={t("immutableHint")} footer={<><Button onClick={() => setSelected(null)} variant="secondary">{t("close")}</Button><Button disabled={saving} onClick={() => void save()}>{saving ? t("saving") : t("save")}</Button></>} onClose={() => setSelected(null)} open={selected !== null} title={t("moderate")}><p className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm text-stone-700">{selected?.text || t("ratingOnly")}</p><label className="mt-4 block text-sm font-semibold">{t("status")}<select className="mt-2 min-h-11 w-full rounded-xl border border-stone-300 px-3" onChange={event => setNextStatus(event.target.value as ReviewStatus)} value={nextStatus}>{(["PENDING","PUBLISHED","HIDDEN","REJECTED"] as ReviewStatus[]).map(item => <option key={item} value={item}>{t(`statuses.${item}`)}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">{t("response")}<textarea className="mt-2 min-h-28 w-full rounded-xl border border-stone-300 p-3" maxLength={3000} onChange={event => setResponse(event.target.value)} value={response} /></label></Dialog>
    </main>;
}
