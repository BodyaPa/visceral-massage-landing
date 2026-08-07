"use client";

import Link from "next/link";
import {useLocale,useTranslations} from "next-intl";
import {useState} from "react";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/overlay/ConfirmDialog";
import Alert from "@/components/ui/state/Alert";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {useListNeedsCompletionQuery,useSetBookingAttendanceMutation} from "./bookings.api";
import {useMarkAllTrainingAttendedMutation,useSetTrainingAttendanceMutation} from "@/features/training/training.api";
import type {NeedsCompletionRecord} from "@/types/bookings";
import AttendanceCorrectionPanel from "./AttendanceCorrectionPanel";

export default function NeedsCompletionWorkspace(){
 const t=useTranslations("admin.needsCompletion");const locale=useLocale() as "ua"|"en";const [page,setPage]=useState(0);
 const [outcomesRefreshToken,setOutcomesRefreshToken]=useState(0);
 const result=useListNeedsCompletionQuery({page,size:50});const [bookingDecision,{isLoading:bookingBusy}]=useSetBookingAttendanceMutation();const [trainingDecision,{isLoading:trainingBusy}]=useSetTrainingAttendanceMutation();const [markAll,{isLoading:bulkBusy}]=useMarkAllTrainingAttendedMutation();
 const [bulkSession,setBulkSession]=useState<number|null>(null);const dateTime=(value:string)=>new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
 const decide=async(record:NeedsCompletionRecord,status:"ATTENDED"|"NO_SHOW")=>{if(record.sourceType==="BOOKING")await bookingDecision({id:record.sourceId,status}).unwrap();else await trainingDecision({id:record.sourceId,status}).unwrap();await result.refetch();setOutcomesRefreshToken(value=>value+1);};
 const trainingSessions=new Map<number,NeedsCompletionRecord>();for(const record of result.data?.content??[])if(record.trainingSessionId)trainingSessions.set(record.trainingSessionId,record);
 return <section className="space-y-5"><header><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-700">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold text-stone-950">{t("title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{t("subtitle")}</p></header>
  {trainingSessions.size>0?<section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"><h2 className="font-semibold text-stone-950">{t("trainingTitle")}</h2><div className="mt-3 flex flex-wrap gap-2">{[...trainingSessions.entries()].map(([id,record])=><Button disabled={bulkBusy} key={id} onClick={()=>setBulkSession(id)} variant="secondary">{t("markSession",{title:record.title})}</Button>)}</div></section>:null}
  {result.isLoading?<State text={t("loading")}/>:result.isError?<Alert tone="error" title={t("errorTitle")}>{t("error")}</Alert>:result.data?.content.length===0?<State text={t("empty")}/>:<div className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="hidden grid-cols-[1.1fr_1.2fr_1fr_150px_220px] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-stone-500 lg:grid"><span>{t("client")}</span><span>{t("record")}</span><span>{t("specialist")}</span><span>{t("ended")}</span><span>{t("actions")}</span></div>{result.data?.content.map(record=><article className="grid gap-3 border-b border-stone-100 px-4 py-4 last:border-0 lg:grid-cols-[1.1fr_1.2fr_1fr_150px_220px] lg:items-center" key={`${record.sourceType}:${record.sourceId}`}><div><strong className="text-stone-950">{record.clientName}</strong><p className="text-xs text-stone-500">{record.officeName}{record.resourceName?` · ${record.resourceName}`:""}</p></div><div><strong className="text-stone-900">{record.title}</strong><p className="text-xs text-amber-700">{record.secondReminderAt?t("remindedTwice"):record.firstReminderAt?t("remindedOnce"):t("notReminded")}</p></div><span className="text-sm text-stone-700">{record.specialistName}</span><time className="text-sm text-stone-600">{dateTime(record.endsAt)}</time><div className="flex flex-wrap gap-2"><Button disabled={bookingBusy||trainingBusy} onClick={()=>void decide(record,"ATTENDED")} size="sm">{t("attended")}</Button><Button disabled={bookingBusy||trainingBusy} onClick={()=>void decide(record,"NO_SHOW")} size="sm" variant="danger">{t("noShow")}</Button><Link className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100" href={withLocale("/admin/records",locale)}>{t("openRecord")}</Link></div></article>)}</div>}
  {result.data&&result.data.totalPages>1?<div className="flex items-center justify-between"><Button disabled={page===0} onClick={()=>setPage(v=>v-1)} variant="secondary">{t("previous")}</Button><span className="text-sm text-stone-600">{t("page",{current:page+1,total:result.data.totalPages})}</span><Button disabled={page+1>=result.data.totalPages} onClick={()=>setPage(v=>v+1)} variant="secondary">{t("next")}</Button></div>:null}
  <AttendanceCorrectionPanel refreshToken={outcomesRefreshToken}/>
  <ConfirmDialog busy={bulkBusy} cancelLabel={t("cancel")} closeLabel={t("close")} confirmLabel={t("confirmMarkAll")} onClose={()=>setBulkSession(null)} onConfirm={()=>{if(bulkSession!==null)void markAll({sessionId:bulkSession}).unwrap().then(async()=>{await result.refetch();setOutcomesRefreshToken(value=>value+1);}).finally(()=>setBulkSession(null));}} open={bulkSession!==null} title={t("confirmTitle")}><p>{t("confirmBody")}</p></ConfirmDialog>
 </section>;
}
function State({text}:{text:string}){return <p className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">{text}</p>;}
