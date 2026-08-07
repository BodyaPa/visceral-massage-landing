"use client";
import {useEffect,useState} from "react";
import {useLocale,useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Dialog from "@/components/ui/overlay/Dialog";
import Textarea from "@/components/ui/form/Textarea";
import Alert from "@/components/ui/state/Alert";
import type {AttendanceOutcomeRecord} from "@/types/bookings";
import {useListRecentAttendanceOutcomesQuery,useSetBookingAttendanceMutation} from "./bookings.api";
import {useSetTrainingAttendanceMutation} from "@/features/training/training.api";

export default function AttendanceCorrectionPanel({refreshToken=0}:{refreshToken?:number}){
 const t=useTranslations("admin.needsCompletion");const locale=useLocale();const outcomes=useListRecentAttendanceOutcomesQuery({size:20});const [selected,setSelected]=useState<AttendanceOutcomeRecord|null>(null);const [reason,setReason]=useState("");const [error,setError]=useState(false);const [booking,{isLoading:bBusy}]=useSetBookingAttendanceMutation();const [training,{isLoading:tBusy}]=useSetTrainingAttendanceMutation();const busy=bBusy||tBusy;
 const refetchOutcomes=outcomes.refetch;
 useEffect(()=>{if(refreshToken>0)void refetchOutcomes();},[refreshToken,refetchOutcomes]);
 const submit=async()=>{if(!selected||!reason.trim())return;setError(false);const status=selected.status==="ATTENDED"?"NO_SHOW":"ATTENDED";try{if(selected.sourceType==="BOOKING")await booking({id:selected.sourceId,status,reason:reason.trim()}).unwrap();else await training({id:selected.sourceId,status,reason:reason.trim()}).unwrap();setSelected(null);setReason("");await outcomes.refetch();}catch{setError(true);}};
 const dateTime=(value:string)=>new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
 return <section className="rounded-2xl border border-stone-200 bg-white"><header className="border-b border-stone-200 px-4 py-4"><h2 className="font-semibold text-stone-950">{t("correctionsTitle")}</h2><p className="mt-1 text-sm text-stone-600">{t("correctionsSubtitle")}</p></header>{outcomes.isLoading?<p className="p-4 text-sm text-stone-600">{t("loading")}</p>:outcomes.isError?<div className="p-4"><Alert tone="error">{t("correctionLoadError")}</Alert></div>:<div>{outcomes.data?.content.map(item=><article className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between" key={`${item.sourceType}:${item.sourceId}`}><div><strong className="text-sm text-stone-950">{item.clientName} · {item.title}</strong><p className="text-xs text-stone-500">{dateTime(item.decidedAt)} · {t(`outcomes.${item.status}`)}</p></div><Button onClick={()=>{setSelected(item);setReason("");setError(false);}} size="sm" variant="secondary">{item.status==="ATTENDED"?t("correctToNoShow"):t("correctToAttended")}</Button></article>)}</div>}
 <Dialog closeLabel={t("close")} description={t("correctionDescription")} dismissible={!busy} footer={<><Button disabled={busy} onClick={()=>setSelected(null)} variant="secondary">{t("cancel")}</Button><Button disabled={busy||!reason.trim()} onClick={()=>void submit()} variant={selected?.status==="ATTENDED"?"danger":"primary"}>{t("saveCorrection")}</Button></>} onClose={()=>setSelected(null)} open={selected!==null} size="sm" title={t("correctionTitle")}><label className="text-sm font-semibold text-stone-800">{t("reason")}<Textarea aria-invalid={error} className="mt-2" maxLength={500} onChange={event=>setReason(event.target.value)} required value={reason}/></label>{error?<div className="mt-3"><Alert tone="error">{t("correctionError")}</Alert></div>:null}</Dialog>
 </section>;
}
