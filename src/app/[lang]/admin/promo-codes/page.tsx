import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {requireRole} from "@/features/auth/auth.server";
import PromoCodesManagement from "@/features/promos/PromoCodesManagement";
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{const {lang}=await params;const t=await getTranslations({locale:lang as Locale,namespace:"admin.promos"});return{title:t("title"),robots:{index:false,follow:false}}}
export default async function Page({params}:{params:Promise<{lang:string}>}){const {lang}=await params;await requireRole("MASTER",lang as Locale);return <PromoCodesManagement/>}
