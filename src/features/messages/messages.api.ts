import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
export type Delivery={id:string;channel:"EMAIL"|"TELEGRAM"|"VIBER";status:"PENDING"|"SENT"|"DELIVERED"|"FAILED";attempts:number;fallback:boolean;acceptedAt:string|null;deliveredAt:string|null;error:string|null};
export type ServiceMessage={id:string;sourceType:string;sourceId:number;kind:string;locale:string;subject:string;body:string;createdAt:string;deliveries:Delivery[]};
export type StaffNote={id:number;text:string;authorId:number;createdAt:string};
export type ChannelConnectionStatus={channel:"TELEGRAM"|"VIBER";connected:boolean;serviceConsent:boolean;providerDisplayName:string|null;providerUsername:string|null;lastConnectedAt:string|null};
type Page<T>={content:T[];totalPages:number;number:number};
export const messagesApi=createApi({reducerPath:"messagesApi",baseQuery,tagTypes:["Messages","Channels"],endpoints:build=>({
 listMessages:build.query<Page<ServiceMessage>,{page?:number;size?:number}>({query:({page=0,size=20})=>`/messages?page=${page}&size=${size}`,providesTags:["Messages"]}),
 listChannels:build.query<ChannelConnectionStatus[],void>({query:()=>"/messages/channels",providesTags:["Channels"]}),
 updateConsent:build.mutation<void,{channel:"TELEGRAM"|"VIBER";serviceConsent:boolean}>({query:({channel,...body})=>({url:`/messages/channels/${channel}/consent`,method:"PUT",body}),invalidatesTags:["Channels"]}),
 createTelegramLink:build.mutation<{deepLink:string;expiresAt:string},void>({query:()=>({url:"/messages/channels/telegram/link",method:"POST"}),invalidatesTags:["Channels"]}),
 unlinkTelegram:build.mutation<void,void>({query:()=>({url:"/messages/channels/telegram",method:"DELETE"}),invalidatesTags:["Channels"]}),
 needsAttention:build.query<Page<{deliveryId:string;messageId:string;channel:string;error:string;attempts:number}>,void>({query:()=>"/admin/messages/needs-attention?page=0&size=50"}),
 reminderSettings:build.query<Array<{id:number;businessDirection:"MASSAGE"|"TRAINING";hoursBefore:number;enabled:boolean}>,void>({query:()=>"/admin/messages/reminder-settings"}),
 updateReminderSetting:build.mutation<void,{direction:"MASSAGE"|"TRAINING";hours:number;enabled:boolean}>({query:({direction,hours,enabled})=>({url:`/admin/messages/reminder-settings/${direction}/${hours}`,method:"PUT",body:{enabled}})}),
 sendTrainingBulk:build.mutation<{created:number},{sessionId:number;subject:string;body:string}>({query:({sessionId,...body})=>({url:`/admin/messages/training-sessions/${sessionId}/bulk`,method:"POST",body}),invalidatesTags:["Messages"]})
 ,listStaffNotes:build.query<StaffNote[],{sourceType:string;sourceId:number}>({query:({sourceType,sourceId})=>`/admin/messages/${sourceType}/${sourceId}/notes`})
 ,addStaffNote:build.mutation<void,{sourceType:string;sourceId:number;text:string}>({query:({sourceType,sourceId,text})=>({url:`/admin/messages/${sourceType}/${sourceId}/notes`,method:"POST",body:{text}})})
})});
export const {useListMessagesQuery,useListChannelsQuery,useUpdateConsentMutation,useCreateTelegramLinkMutation,useUnlinkTelegramMutation,useNeedsAttentionQuery,useReminderSettingsQuery,useUpdateReminderSettingMutation,useSendTrainingBulkMutation,useLazyListStaffNotesQuery,useAddStaffNoteMutation}=messagesApi;
