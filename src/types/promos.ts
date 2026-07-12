import type {PageResponse} from "@/types/news";
export type PromoCode = {id:number;code:string;discountPercent:number;startsAt:string|null;endsAt:string|null;active:boolean;exhausted:boolean;totalLimit:number|null;perUserLimit:number|null;usageCount:number;assignedUserId:number|null;assignedUserDisplay:string|null;serviceIds:number[];eventIds:number[];createdByUserId:number;createdAt:string};
export type PromoCodeInput = {discountPercent:number;startsAt:string|null;endsAt:string|null;active:boolean;totalLimit:number|null;perUserLimit:number|null;assignedUserId:number|null;serviceIds:number[];eventIds:number[]};
export type PromoValidation = {code:string;discountPercent:number;originalPrice:number;discountAmount:number;finalPrice:number;remainingTotalUses:number|null;remainingUserUses:number|null};
export type PromoUsage = {id:number;userId:number;userDisplay:string;bookingId:number|null;eventEnrollmentId:number|null;discountPercent:number;originalPrice:number;discountAmount:number;finalPrice:number;usedAt:string};
export type PromoPage = PageResponse<PromoCode>;
