"use client";
import {useState} from "react";
import {useClaimCertificateMutation,useListMyCertificatesQuery} from "@/features/certificates/certificates.api";
import type {Locale} from "@/i18n";
import {formatWholeCurrencyAmount} from "@/shared/lib/i18n/formatNumbers";
import Input from "@/components/ui/form/Input";
import Button from "@/components/ui/button/Button";

export default function AccountCertificatesPanel({locale}:{locale:Locale}){
 const ua=locale==="ua",copy=ua?{title:"Грошові сертифікати",body:"Баланс можна використовувати частинами після активації оплати.",claim:"Отримати подарунок",placeholder:"Захищений код сертифіката",empty:"Активних сертифікатів ще немає.",balance:"Доступно",reserved:"Зарезервовано",error:"Не вдалося застосувати код."}:{title:"Monetary certificates",body:"The balance can be used partially after payment activation.",claim:"Claim gift",placeholder:"Secure certificate code",empty:"No certificates yet.",balance:"Available",reserved:"Reserved",error:"Unable to claim this code."};
 const {data}=useListMyCertificatesQuery({size:50});const [code,setCode]=useState("");const [error,setError]=useState(false);const [claim,{isLoading}]=useClaimCertificateMutation();
 async function submit(){try{await claim({code:code.trim()}).unwrap();setCode("");setError(false)}catch{setError(true)}}
 return <section className="rounded-xl border border-stone-200 bg-white p-4"><h2 className="text-base font-semibold text-stone-950">{copy.title}</h2><p className="mt-1 text-sm text-stone-600">{copy.body}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input aria-label={copy.placeholder} onChange={e=>setCode(e.target.value)} placeholder={copy.placeholder} value={code}/><Button disabled={!code.trim()||isLoading} onClick={()=>void submit()}>{copy.claim}</Button></div>{error?<p className="mt-2 text-sm text-red-700">{copy.error}</p>:null}<div className="mt-4 grid gap-3 md:grid-cols-2">{(data?.content??[]).map(c=><article className="rounded-lg border border-stone-200 bg-stone-50 p-3" key={c.id}><div className="flex justify-between gap-3"><strong className="text-sm text-stone-950">{ua?c.titleUa:c.titleEn}</strong><span className="text-xs text-stone-500">{c.status}</span></div><dl className="mt-3 grid gap-1 text-xs text-stone-600"><div className="flex justify-between"><dt>{copy.balance}</dt><dd>{formatWholeCurrencyAmount(c.availableMinor/100,locale)}</dd></div><div className="flex justify-between"><dt>{copy.reserved}</dt><dd>{formatWholeCurrencyAmount(c.reservedMinor/100,locale)}</dd></div></dl></article>)}{(data?.content??[]).length===0?<p className="text-sm text-stone-500">{copy.empty}</p>:null}</div></section>;
}
