import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {PromoCode,PromoCodeInput,PromoPage,PromoUsage,PromoValidation} from "@/types/promos";
import type {PageResponse} from "@/types/news";
export const promosApi=createApi({reducerPath:"promosApi",baseQuery,tagTypes:["Promos"],endpoints:(build)=>({
 listPromos:build.query<PromoPage,{active?:boolean;query?:string;page?:number}>({query:({active,query,page=0})=>{const p=new URLSearchParams({page:String(page),size:"20",sort:"createdAt,desc"});if(active!==undefined)p.set("active",String(active));if(query)p.set("query",query);return `/admin/promo-codes?${p}`;},providesTags:[{type:"Promos",id:"LIST"}]}),
 createPromo:build.mutation<PromoCode,PromoCodeInput>({query:(body)=>({url:"/admin/promo-codes",method:"POST",body}),invalidatesTags:[{type:"Promos",id:"LIST"}]}),
 updatePromo:build.mutation<PromoCode,{id:number;body:PromoCodeInput}>({query:({id,body})=>({url:`/admin/promo-codes/${id}`,method:"PUT",body}),invalidatesTags:[{type:"Promos",id:"LIST"}]}),
 promoHistory:build.query<PageResponse<PromoUsage>,number>({query:(id)=>`/admin/promo-codes/${id}/usages?page=0&size=50&sort=usedAt,desc`}),
 validatePromo:build.mutation<PromoValidation,{code:string;targetType:"SERVICE"|"EVENT";targetId:number}>({query:(body)=>({url:"/promo-codes/validate",method:"POST",body})})
})});
export const {useListPromosQuery,useCreatePromoMutation,useUpdatePromoMutation,usePromoHistoryQuery,useValidatePromoMutation}=promosApi;
