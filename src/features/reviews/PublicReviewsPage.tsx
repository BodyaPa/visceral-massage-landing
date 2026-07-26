"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Pagination from "@/components/ui/table/Pagination";
import EmptyState from "@/components/ui/state/EmptyState";
import ErrorState from "@/components/ui/state/ErrorState";
import LoadingState from "@/components/ui/state/LoadingState";
import {useGetReviewSummaryQuery, useListPublicReviewsQuery} from "./reviews.api";
import {useReportReviewMutation} from "./reviews.api";
import type {ReviewDirection, ReviewReportReason} from "@/types/reviews";
import Dialog from "@/components/ui/overlay/Dialog";

export default function PublicReviewsPage({locale}: {locale: string}) {
    const t = useTranslations("reviews");
    const [page, setPage] = useState(0);
    const [direction, setDirection] = useState<ReviewDirection | undefined>();
    const [rating, setRating] = useState<number | undefined>();
    const [reportId, setReportId] = useState<number | null>(null);
    const [reportReason, setReportReason] = useState<ReviewReportReason>("SPAM");
    const [reportDetails, setReportDetails] = useState("");
    const [reportMessage, setReportMessage] = useState<string | null>(null);
    const [reportReview, {isLoading: reporting}] = useReportReviewMutation();
    const {data: summary} = useGetReviewSummaryQuery();
    const {data, isLoading, isError, refetch} = useListPublicReviewsQuery({page, lang: locale, direction, rating});

    function filter(nextDirection?: ReviewDirection, nextRating?: number) {
        setDirection(nextDirection);
        setRating(nextRating);
        setPage(0);
    }

    return <div className="container mx-auto space-y-6 px-4 py-8 sm:py-10">
        <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-[180px_1fr]">
            <div><p className="text-4xl font-semibold text-stone-950">{summary?.averageRating.toFixed(1) ?? "0.0"}</p><p aria-label={t("average")} className="mt-1 text-amber-600">★★★★★</p><p className="mt-1 text-sm text-stone-500">{t("total", {count: summary?.total ?? 0})}</p></div>
            <div className="grid gap-2">{[5,4,3,2,1].map(star => {const count = summary?.distribution[String(star)] ?? 0; const percent = summary?.total ? count / summary.total * 100 : 0; return <button className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 text-left text-sm" key={star} onClick={() => filter(direction, rating === star ? undefined : star)} type="button"><span>{star}★</span><span className="h-2 overflow-hidden rounded-full bg-stone-100"><span className="block h-full bg-amber-500" style={{width: `${percent}%`}} /></span><span className="text-right text-stone-500">{count}</span></button>})}</div>
        </section>
        <div className="flex flex-wrap gap-2">
            <Button onClick={() => filter(undefined, rating)} variant={!direction ? "primary" : "secondary"}>{t("all")}</Button>
            <Button onClick={() => filter("MASSAGE", rating)} variant={direction === "MASSAGE" ? "primary" : "secondary"}>{t("massage")}</Button>
            <Button onClick={() => filter("TRAINING", rating)} variant={direction === "TRAINING" ? "primary" : "secondary"}>{t("training")}</Button>
        </div>
        {isLoading ? <LoadingState label={t("loading")} /> : isError ? <ErrorState action={<Button onClick={() => void refetch()} variant="secondary">{t("retry")}</Button>} description={t("loadError")} title={t("loadError")} /> : !data?.content.length ? <EmptyState description={t("empty")} title={t("emptyTitle")} /> :
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.content.map(review => <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" key={review.id}><div className="flex items-center justify-between gap-3"><span aria-label={`${review.rating}/5`} className="text-amber-600">{"★".repeat(review.rating)}<span className="text-stone-200">{"★".repeat(5-review.rating)}</span></span><span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">{t("verified")}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-700">{review.text || t("ratingOnly")}</p><div className="mt-4 border-t border-stone-100 pt-3"><p className="font-semibold text-stone-950">{review.displayName}</p><p className="mt-1 text-xs text-stone-500">{review.offeringTitle} · {review.specialistName}</p></div>{review.companyResponse ? <div className="mt-4 rounded-xl bg-stone-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("response")}</p><p className="mt-1 text-sm text-stone-700">{review.companyResponse}</p></div> : null}<button className="mt-4 text-xs font-semibold text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline" onClick={() => {setReportId(review.id);setReportMessage(null)}} type="button">{t("report")}</button></article>)}</div>}
        {data && data.totalPages > 1 ? <Pagination nextLabel={t("next")} onChange={setPage} page={page} pageLabel={(current, total) => t("page", {current, total})} previousLabel={t("previous")} totalPages={data.totalPages} /> : null}
        <Dialog closeLabel={t("close")} description={t("reportHint")} footer={<><Button onClick={() => setReportId(null)} variant="secondary">{t("close")}</Button><Button disabled={reporting || (reportReason === "OTHER" && !reportDetails.trim())} onClick={async () => {if (reportId === null) return;try {await reportReview({id: reportId, reason: reportReason, details: reportDetails.trim() || null}).unwrap();setReportMessage(t("reportSuccess"));setReportId(null);setReportDetails("");} catch {setReportMessage(t("reportError"));}}}>{reporting ? t("reporting") : t("reportSubmit")}</Button></>} onClose={() => setReportId(null)} open={reportId !== null} title={t("reportTitle")}><label className="block text-sm font-semibold">{t("reportReason")}<select className="mt-2 min-h-11 w-full rounded-xl border border-stone-300 px-3" onChange={event => setReportReason(event.target.value as ReviewReportReason)} value={reportReason}>{(["SPAM","ABUSE","PRIVACY","MISLEADING","OTHER"] as ReviewReportReason[]).map(reason => <option key={reason} value={reason}>{t(`reportReasons.${reason}`)}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">{t("reportDetails")}<textarea className="mt-2 min-h-24 w-full rounded-xl border border-stone-300 p-3" maxLength={1000} onChange={event => setReportDetails(event.target.value)} value={reportDetails} /></label></Dialog>
        {reportMessage ? <p aria-live="polite" className="rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-700">{reportMessage}</p> : null}
    </div>;
}
