import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";

export type LegalDocumentType = "BOOKING_TERMS" | "CANCELLATION_REFUND" | "PRIVACY_POLICY";
export type LegalVersion = {
    id: number;
    documentType: LegalDocumentType;
    versionNumber: number;
    status: "DRAFT" | "PUBLISHED";
    titleUa: string;
    titleEn: string;
    contentUa: string;
    contentEn: string;
    createdAt: string;
    publishedAt: string | null;
};
export type LegalVersionSelection = {
    bookingTermsVersionId: number;
    cancellationRefundVersionId: number;
    privacyPolicyVersionId: number;
};
export type PrivacyRequest = {
    id: string;
    clientProfileId: number;
    status: "REQUESTED" | "BLOCKED" | "COMPLETED" | "REJECTED";
    requestNote: string | null;
    decisionReason: string | null;
    requestedAt: string;
    decidedAt: string | null;
    completedAt: string | null;
};
export type PrivacyPreview = {
    activeBookings: number;
    unfinishedPaymentsOrRefunds: number;
    reservedBenefits: number;
    canComplete: boolean;
};

export const legalApi = createApi({
    reducerPath: "legalApi",
    baseQuery,
    tagTypes: ["Legal", "Privacy"],
    endpoints: build => ({
        currentLegal: build.query<LegalVersion[], void>({query: () => "/legal/current", providesTags: ["Legal"]}),
        legalVersions: build.query<LegalVersion[], LegalDocumentType>({query: type => `/admin/legal-documents/${type}/versions`, providesTags: ["Legal"]}),
        createLegalDraft: build.mutation<LegalVersion, {type: LegalDocumentType; body: Pick<LegalVersion, "titleUa" | "titleEn" | "contentUa" | "contentEn">}>({
            query: ({type, body}) => ({url: `/admin/legal-documents/${type}/drafts`, method: "POST", body}),
            invalidatesTags: ["Legal"]
        }),
        updateLegalDraft: build.mutation<LegalVersion, {id: number; body: Pick<LegalVersion, "titleUa" | "titleEn" | "contentUa" | "contentEn">}>({
            query: ({id, body}) => ({url: `/admin/legal-documents/versions/${id}`, method: "PUT", body}),
            invalidatesTags: ["Legal"]
        }),
        publishLegalVersion: build.mutation<LegalVersion, number>({
            query: id => ({url: `/admin/legal-documents/versions/${id}/publish`, method: "POST"}),
            invalidatesTags: ["Legal"]
        }),
        ownPrivacyRequest: build.query<PrivacyRequest | null, void>({query: () => "/account/privacy-request", providesTags: ["Privacy"]}),
        createPrivacyRequest: build.mutation<PrivacyRequest, {note?: string}>({
            query: body => ({url: "/account/privacy-request", method: "POST", body}),
            invalidatesTags: ["Privacy"]
        }),
        privacyRequests: build.query<PrivacyRequest[], void>({query: () => "/admin/privacy-requests", providesTags: ["Privacy"]}),
        privacyPreview: build.query<PrivacyPreview, string>({query: id => `/admin/privacy-requests/${id}/preview`}),
        completePrivacyRequest: build.mutation<PrivacyRequest, {id: string; reason: string}>({
            query: ({id, reason}) => ({url: `/admin/privacy-requests/${id}/complete`, method: "POST", body: {reason}}),
            invalidatesTags: ["Privacy"]
        }),
        rejectPrivacyRequest: build.mutation<PrivacyRequest, {id: string; reason: string}>({
            query: ({id, reason}) => ({url: `/admin/privacy-requests/${id}/reject`, method: "POST", body: {reason}}),
            invalidatesTags: ["Privacy"]
        })
    })
});

export const {
    useCurrentLegalQuery, useLegalVersionsQuery, useCreateLegalDraftMutation,
    useUpdateLegalDraftMutation, usePublishLegalVersionMutation,
    useOwnPrivacyRequestQuery, useCreatePrivacyRequestMutation,
    usePrivacyRequestsQuery, useLazyPrivacyPreviewQuery,
    useCompletePrivacyRequestMutation, useRejectPrivacyRequestMutation
} = legalApi;

export function selectionFromCurrent(items: LegalVersion[] | undefined): LegalVersionSelection | null {
    const id = (type: LegalDocumentType) => items?.find(item => item.documentType === type)?.id;
    const bookingTermsVersionId = id("BOOKING_TERMS");
    const cancellationRefundVersionId = id("CANCELLATION_REFUND");
    const privacyPolicyVersionId = id("PRIVACY_POLICY");
    return bookingTermsVersionId && cancellationRefundVersionId && privacyPolicyVersionId
        ? {bookingTermsVersionId, cancellationRefundVersionId, privacyPolicyVersionId}
        : null;
}
