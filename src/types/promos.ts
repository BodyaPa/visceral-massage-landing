import type {PageResponse} from "@/types/news";
export type PromoCode = {id:number;code:string;discountPercent:number;startsAt:string|null;endsAt:string|null;active:boolean;exhausted:boolean;totalLimit:number|null;perUserLimit:number|null;usageCount:number;assignedUserId:number|null;assignedUserDisplay:string|null;serviceIds:number[];trainingTypeIds:number[];createdByUserId:number;createdAt:string;loyaltyRewardCompatible:boolean};
export type PromoCodeInput = {discountPercent:number;startsAt:string|null;endsAt:string|null;active:boolean;totalLimit:number|null;perUserLimit:number|null;assignedUserId:number|null;serviceIds:number[];trainingTypeIds:number[];loyaltyRewardCompatible:boolean};
export type PromoValidation = {code:string;discountPercent:number;originalPrice:number;discountAmount:number;finalPrice:number;remainingTotalUses:number|null;remainingUserUses:number|null};
export type PromoUsage = {id:number;userId:number;userDisplay:string;bookingId:number|null;trainingParticipantId:number|null;discountPercent:number;originalPrice:number;discountAmount:number;finalPrice:number;usedAt:string};
export type PromoPage = PageResponse<PromoCode>;
