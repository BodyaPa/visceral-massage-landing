import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {Certificate} from "@/types/certificates";
import type {PageResponse} from "@/types/news";
export const certificatesApi=createApi({reducerPath:"certificatesApi",baseQuery,tagTypes:["Certificates"],endpoints:build=>({
    listMine:build.query<PageResponse<Certificate>,{page?:number;size?:number}|void>({query:a=>`/certificates/mine?page=${a?.page??0}&size=${a?.size??50}&sort=createdAt,desc`,providesTags:[{type:"Certificates",id:"MY"}]}),
    purchase:build.mutation<Certificate,{offerId:number}>({query:body=>({url:"/certificates/purchases",method:"POST",body}),invalidatesTags:[{type:"Certificates",id:"MY"}]}),
    claim:build.mutation<Certificate,{code:string}>({query:body=>({url:"/certificates/claim",method:"POST",body}),invalidatesTags:[{type:"Certificates",id:"MY"}]})
})});
export const {useListMineQuery:useListMyCertificatesQuery,usePurchaseMutation:usePurchaseCertificateMutation,useClaimMutation:useClaimCertificateMutation}=certificatesApi;
