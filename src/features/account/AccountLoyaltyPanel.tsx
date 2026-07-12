"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {
    useActivateLoyaltyVoucherMutation,
    useGetLoyaltyBalanceQuery,
    useGetLoyaltyLedgerQuery,
    useGetLoyaltyRewardsQuery,
    useGetLoyaltyVouchersQuery,
    useRedeemLoyaltyRewardMutation
} from "@/features/loyalty/loyalty.api";
import type {LoyaltyReward, LoyaltyVoucherStatus} from "@/types/loyalty";
import {toLanguageTag} from "@/shared/lib/i18n/toLanguageTag";

export default function AccountLoyaltyPanel({view}: {view: "certificates" | "points"}) {
    const t = useTranslations("accountPage.loyalty");
    const locale = useLocale();
    const toast = useToast();
    const [ledgerPage, setLedgerPage] = useState(0);
    const [voucherPage, setVoucherPage] = useState(0);
    const [activationCode, setActivationCode] = useState("");
    const {data: balance, isLoading: balanceLoading} = useGetLoyaltyBalanceQuery();
    const {data: ledger, isLoading: ledgerLoading, isError: ledgerError} = useGetLoyaltyLedgerQuery({page: ledgerPage});
    const {data: rewards = [], isLoading: rewardsLoading} = useGetLoyaltyRewardsQuery();
    const {data: vouchers, isLoading: vouchersLoading, isError: vouchersError} = useGetLoyaltyVouchersQuery({page: voucherPage});
    const [redeem, {isLoading: redeeming}] = useRedeemLoyaltyRewardMutation();
    const [activate, {isLoading: activating}] = useActivateLoyaltyVoucherMutation();

    async function redeemReward(reward: LoyaltyReward) {
        try {
            await redeem(reward.id).unwrap();
            toast.success(t(reward.transferable ? "giftCreated" : "rewardCreated"));
        } catch {
            toast.error(t("redeemError"));
        }
    }

    async function activateCode() {
        if (!activationCode.trim()) return;
        try {
            await activate(activationCode.trim()).unwrap();
            setActivationCode("");
            toast.success(t("activationSuccess"));
        } catch {
            toast.error(t("activationError"));
        }
    }

    return (
        <div className="space-y-5">
            {view === "certificates" ? <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5">
                <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-stone-950">{t("vouchersTitle")}</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">{t("vouchersBody")}</p>
                    </div>
                    <div className="flex w-full max-w-sm gap-2">
                        <input aria-label={t("activationLabel")} className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-stone-800" onChange={(event) => setActivationCode(event.target.value)} placeholder={t("activationPlaceholder")} value={activationCode} />
                        <button className="rounded-lg bg-stone-950 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:bg-stone-300" disabled={activating || !activationCode.trim()} onClick={activateCode} type="button">{t("activate")}</button>
                    </div>
                </div>
                {vouchersLoading ? <Loading text={t("loading")} /> : null}
                {vouchersError ? <ErrorState text={t("loadError")} /> : null}
                {vouchers && vouchers.content.length === 0 ? <EmptyState text={t("vouchersEmpty")} /> : null}
                {vouchers && vouchers.content.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {vouchers.content.map((voucher) => (
                            <article className="rounded-xl border border-stone-200 bg-white p-4" key={voucher.id}>
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="font-semibold text-stone-950">{locale === "en" && voucher.titleEn ? voucher.titleEn : voucher.titleUa}</h3>
                                    <span className={voucherStatusClass(voucher.status)}>{t(`statuses.${voucher.status}`)}</span>
                                </div>
                                <p className="mt-2 text-xs text-stone-500">{t("validUntil", {date: formatDate(voucher.expiresAt, locale)})}</p>
                                {voucher.code ? <p className="mt-3 select-all rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2 font-mono text-sm font-semibold tracking-wide text-stone-950">{voucher.code}</p> : null}
                                <p className="mt-2 text-xs leading-5 text-stone-500">{voucher.transferable ? t("transferable") : t("personal")}</p>
                            </article>
                        ))}
                    </div>
                ) : null}
                {vouchers ? <Pager page={voucherPage} totalPages={vouchers.totalPages} onPage={setVoucherPage} previous={t("previous")} next={t("next")} /> : null}
            </section> : null}

            {view === "points" ? <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 border-b border-stone-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-stone-950">{t("pointsTitle")}</h2>
                        <p className="mt-1 text-sm leading-6 text-stone-600">{t("pointsBody")}</p>
                    </div>
                    <div className="rounded-xl bg-stone-950 px-5 py-3 text-white">
                        <p className="text-xs text-stone-300">{t("balance")}</p>
                        <p className="mt-1 text-2xl font-semibold">{balanceLoading ? "…" : balance?.balance ?? 0}</p>
                    </div>
                </div>

                <div className="mt-5">
                    <h3 className="text-sm font-semibold text-stone-950">{t("catalogTitle")}</h3>
                    {rewardsLoading ? <Loading text={t("loading")} /> : null}
                    {!rewardsLoading && rewards.length === 0 ? <EmptyState text={t("catalogEmpty")} /> : null}
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {rewards.map((reward) => (
                            <article className="flex min-h-44 flex-col rounded-xl border border-stone-200 bg-stone-50 p-4" key={reward.id}>
                                <h4 className="font-semibold text-stone-950">{localizedRewardTitle(reward, locale)}</h4>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{localizedRewardDescription(reward, locale) || t("rewardFallback")}</p>
                                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                                    <div><p className="text-lg font-semibold text-stone-950">{reward.pointCost}</p><p className="text-xs text-stone-500">{t("points")}</p></div>
                                    <button className="rounded-lg bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300" disabled={redeeming || (balance?.balance ?? 0) < reward.pointCost} onClick={() => redeemReward(reward)} type="button">{reward.transferable ? t("createGift") : t("redeem")}</button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="mt-6 border-t border-stone-100 pt-5">
                    <h3 className="text-sm font-semibold text-stone-950">{t("activityTitle")}</h3>
                    {ledgerLoading ? <Loading text={t("loading")} /> : null}
                    {ledgerError ? <ErrorState text={t("loadError")} /> : null}
                    {ledger && ledger.content.length === 0 ? <EmptyState text={t("activityEmpty")} /> : null}
                    {ledger && ledger.content.length > 0 ? (
                        <div className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200">
                            {ledger.content.map((entry) => (
                                <article className="flex items-start justify-between gap-4 p-3 sm:p-4" key={entry.id}>
                                    <div className="min-w-0"><p className="text-sm font-medium text-stone-950">{t(`entryTypes.${entry.type}`)}</p><p className="mt-1 break-words text-xs text-stone-500">{sourceLabel(entry.bookingId, entry.eventEnrollmentId, entry.reason, t)}</p><p className="mt-1 text-xs text-stone-400">{formatDateTime(entry.createdAt, locale)}</p></div>
                                    <strong className={entry.amount > 0 ? "text-emerald-700" : "text-stone-950"}>{entry.amount > 0 ? "+" : ""}{entry.amount}</strong>
                                </article>
                            ))}
                        </div>
                    ) : null}
                    {ledger ? <Pager page={ledgerPage} totalPages={ledger.totalPages} onPage={setLedgerPage} previous={t("previous")} next={t("next")} /> : null}
                </div>
            </section> : null}
        </div>
    );
}

function Pager({page, totalPages, onPage, previous, next}: {page: number; totalPages: number; onPage: (page: number) => void; previous: string; next: string}) {
    if (totalPages <= 1) return null;
    return <div className="mt-4 flex justify-end gap-2"><button className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40" disabled={page === 0} onClick={() => onPage(page - 1)} type="button">{previous}</button><button className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} type="button">{next}</button></div>;
}
function Loading({text}: {text: string}) { return <p className="mt-4 text-sm text-stone-500">{text}</p>; }
function EmptyState({text}: {text: string}) { return <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">{text}</p>; }
function ErrorState({text}: {text: string}) { return <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{text}</p>; }
function voucherStatusClass(status: LoyaltyVoucherStatus) { return `rounded-full border px-2 py-1 text-xs font-semibold ${status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "AVAILABLE" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-stone-200 bg-stone-100 text-stone-600"}`; }
function localizedRewardTitle(reward: LoyaltyReward, locale: string) { return locale === "en" && reward.titleEn ? reward.titleEn : reward.titleUa; }
function localizedRewardDescription(reward: LoyaltyReward, locale: string) { return locale === "en" && reward.descriptionEn ? reward.descriptionEn : reward.descriptionUa; }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(toLanguageTag(locale), {dateStyle: "medium"}).format(new Date(value)); }
function formatDateTime(value: string, locale: string) { return new Intl.DateTimeFormat(toLanguageTag(locale), {dateStyle: "medium", timeStyle: "short"}).format(new Date(value)); }
function sourceLabel(bookingId: number | null, eventId: number | null, reason: string, t: ReturnType<typeof useTranslations<"accountPage.loyalty">>) { if (bookingId) return t("bookingSource", {id: bookingId}); if (eventId) return t("eventSource", {id: eventId}); return reason; }
