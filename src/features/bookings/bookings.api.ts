import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {
    Booking,
    BookingInput,
    BookingStatus,
    AdminBookingRecord,
    BookingSource,
    RecordAuditEntry,
    FinanceBooking,
    FinanceTrainingParticipant,
    FinanceExpense,
    FinanceExpenseInput,
    FinanceSettings,
    FinanceSettingsInput,
    FinanceSpecialistSettings,
    FinanceSpecialistSettingsInput,
    FinanceSummary,
    FinancialTransaction,
    FinanceReconciliation,
    FinanceAnalytics,
    ManualBookingInput,
    ManualBookingConflictPreview,
    SpecialistBooking,
    SpecialistFinanceOverview
} from "@/types/bookings";
import type {PageResponse} from "@/types/news";

type ListFinanceBookingsArgs = {
    status?: BookingStatus | "";
    officeId?: number;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
};

export type ListAdminBookingRecordsArgs = {
    status?: BookingStatus | "";
    source?: BookingSource | "";
    direction?: "MASSAGE" | "TRAINING" | "";
    query?: string;
    visitFrom?: string;
    visitTo?: string;
    officeId?: number | "";
    resourceId?: number | "";
    specialistId?: number | "";
    serviceId?: number | "";
    sort?: "startsAt,desc" | "startsAt,asc" | "createdAt,desc" | "createdAt,asc";
    page?: number;
    size?: number;
};

type ListFinanceTrainingParticipantsArgs = {
    status?: "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "ATTENDED" | "NO_SHOW" | "";
    officeId?: number;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
};

type FinanceSummaryArgs = {
    officeId?: number;
    from?: string;
    to?: string;
    expenseFrom?: string;
    expenseTo?: string;
};

type SpecialistFinanceOverviewArgs = {
    from?: string;
    to?: string;
};

function listFinanceBookingsPath({status, officeId, from, to, page = 0, size = 25}: ListFinanceBookingsArgs) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc"
    });

    if (status) params.set("status", status);
    if (officeId) params.set("officeId", String(officeId));
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    return `/admin/finance/bookings?${params.toString()}`;
}

function listFinanceTrainingParticipantsPath({status, officeId, from, to, page = 0, size = 25}: ListFinanceTrainingParticipantsArgs) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc"
    });

    if (status) params.set("status", status);
    if (officeId) params.set("officeId", String(officeId));
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    return `/admin/finance/training-participants?${params.toString()}`;
}

export const bookingsApi = createApi({
    reducerPath: "bookingsApi",
    baseQuery,
    tagTypes: ["Bookings", "Expenses", "FinanceSettings", "FinanceSummary", "FinancialTransactions"],
    endpoints: (build) => ({
        listMyBookings: build.query<PageResponse<Booking>, {page?: number; size?: number} | void>({
            query: (args) => {
                const page = args?.page ?? 0;
                const size = args?.size ?? 20;
                return `/bookings/my?page=${page}&size=${size}&sort=createdAt,desc`;
            },
            providesTags: [{type: "Bookings", id: "LIST"}]
        }),
        listAdminBookingRecords: build.query<PageResponse<AdminBookingRecord>, ListAdminBookingRecordsArgs>({
            query: ({status, source, direction, query, visitFrom, visitTo, officeId, resourceId, specialistId, serviceId, sort = "startsAt,desc", page = 0, size = 25}) => {
                const params = new URLSearchParams({page: String(page), size: String(size), sort});
                if (status) params.set("status", status);
                if (source) params.set("source", source);
                if (direction) params.set("direction", direction);
                if (query?.trim()) params.set("query", query.trim());
                if (visitFrom) params.set("visitFrom", visitFrom);
                if (visitTo) params.set("visitTo", visitTo);
                if (officeId) params.set("officeId", String(officeId));
                if (resourceId) params.set("resourceId", String(resourceId));
                if (specialistId) params.set("specialistId", String(specialistId));
                if (serviceId) params.set("serviceId", String(serviceId));
                return `/admin/records/bookings?${params.toString()}`;
            },
            providesTags: [{type: "Bookings", id: "ADMIN_REGISTRY"}]
        }),
        getAdminBookingTimeline: build.query<RecordAuditEntry[], number>({
            query: (id) => `/admin/records/bookings/${id}/timeline`
        }),
        setBookingAttendance: build.mutation<void, {id: number; status: "ATTENDED" | "NO_SHOW"}>({
            query: ({id, status}) => ({
                url: `/admin/records/bookings/${id}/attendance?status=${status}`,
                method: "POST"
            }),
            invalidatesTags: [{type: "Bookings", id: "ADMIN_REGISTRY"}]
        }),
        listFinanceBookings: build.query<PageResponse<FinanceBooking>, ListFinanceBookingsArgs>({
            query: listFinanceBookingsPath,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((booking) => ({type: "Bookings" as const, id: booking.id})),
                        {type: "Bookings" as const, id: "LIST"}
                    ]
                    : [{type: "Bookings" as const, id: "LIST"}]
        }),
        listFinanceTrainingParticipants: build.query<PageResponse<FinanceTrainingParticipant>, ListFinanceTrainingParticipantsArgs>({
            query: listFinanceTrainingParticipantsPath,
            providesTags: [{type: "Bookings", id: "TRAINING_PARTICIPANTS"}]
        }),
        confirmTrainingParticipantPayment: build.mutation<FinanceTrainingParticipant, number>({
            query: (id) => ({url: `/admin/finance/training-participants/${id}/confirm-payment`, method: "POST"}),
            invalidatesTags: [{type: "Bookings", id: "TRAINING_PARTICIPANTS"}]
        }),
        getFinanceSummary: build.query<FinanceSummary, FinanceSummaryArgs>({
            query: ({officeId, from, to, expenseFrom, expenseTo}) => {
                const params = new URLSearchParams();
                if (officeId) params.set("officeId", String(officeId));
                if (from) params.set("from", from);
                if (to) params.set("to", to);
                if (expenseFrom) params.set("expenseFrom", expenseFrom);
                if (expenseTo) params.set("expenseTo", expenseTo);
                return `/admin/finance/summary?${params.toString()}`;
            },
            providesTags: [{type: "FinanceSummary", id: "CURRENT"}]
        }),
        listFinancialTransactions: build.query<PageResponse<FinancialTransaction>, {page?: number; size?: number}>({
            query: ({page = 0, size = 25}) =>
                `/admin/finance/transactions?page=${page}&size=${size}&sort=occurredAt,desc`,
            providesTags: [{type: "FinancialTransactions", id: "LIST"}]
        }),
        listPendingRefunds: build.query<PageResponse<FinancialTransaction>, {page?: number; size?: number}>({
            query: ({page = 0, size = 25}) =>
                `/admin/finance/transactions/refunds/pending?page=${page}&size=${size}&sort=occurredAt,asc`,
            providesTags: [{type: "FinancialTransactions", id: "REFUNDS"}]
        }),
        completeRefund: build.mutation<FinancialTransaction, {id: number; externalReference?: string}>({
            query: ({id, externalReference}) => ({
                url: `/admin/finance/transactions/${id}/complete-refund`,
                method: "POST",
                body: {externalReference: externalReference || null}
            }),
            invalidatesTags: [
                {type: "FinancialTransactions", id: "LIST"},
                {type: "FinancialTransactions", id: "REFUNDS"},
                {type: "FinanceSummary", id: "CURRENT"}
            ]
        }),
        getFinanceReconciliation: build.query<FinanceReconciliation, void>({
            query: () => "/admin/finance/transactions/reconciliation",
            providesTags: [{type: "FinancialTransactions", id: "RECONCILIATION"}]
        }),
        getFinanceAnalytics: build.query<FinanceAnalytics, {from: string; to: string; direction?: string; officeId?: number; specialistId?: number}>({
            query: ({from, to, direction, officeId, specialistId}) => {
                const params = new URLSearchParams({from, to});
                if (direction) params.set("direction", direction);
                if (officeId) params.set("officeId", String(officeId));
                if (specialistId) params.set("specialistId", String(specialistId));
                return `/admin/finance/analytics?${params.toString()}`;
            }
        }),
        getFinanceSettings: build.query<FinanceSettings, void>({
            query: () => "/admin/finance/settings",
            providesTags: [{type: "FinanceSettings", id: "GLOBAL"}]
        }),
        updateFinanceSettings: build.mutation<FinanceSettings, FinanceSettingsInput>({
            query: (body) => ({url: "/admin/finance/settings", method: "PUT", body}),
            invalidatesTags: [
                {type: "FinanceSettings", id: "GLOBAL"},
                {type: "FinanceSummary", id: "CURRENT"}
            ]
        }),
        listSpecialistFinanceSettings: build.query<FinanceSpecialistSettings[], void>({
            query: () => "/admin/finance/specialists",
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((settings) => ({type: "FinanceSettings" as const, id: settings.specialistId})),
                        {type: "FinanceSettings" as const, id: "LIST"}
                    ]
                    : [{type: "FinanceSettings" as const, id: "LIST"}]
        }),
        updateSpecialistFinanceSettings: build.mutation<FinanceSpecialistSettings, {specialistId: number} & FinanceSpecialistSettingsInput>({
            query: ({specialistId, ...body}) => ({
                url: `/admin/finance/specialists/${specialistId}/settings`,
                method: "PUT",
                body
            }),
            invalidatesTags: (result, error, {specialistId}) => [
                {type: "FinanceSettings", id: specialistId},
                {type: "FinanceSettings", id: "LIST"},
                {type: "Bookings", id: "LIST"},
                {type: "FinanceSummary", id: "CURRENT"}
            ]
        }),
        listSpecialistBookings: build.query<SpecialistBooking[], {from: string; to: string; specialistId?: number | ""; officeId?: number | ""; serviceId?: number | ""; status?: BookingStatus | "AVAILABLE" | "BLOCKED" | "ACTIVE_EVENT" | "INACTIVE_EVENT" | "PAST" | ""}>({
            query: ({from, to, specialistId, officeId, serviceId, status}) => {
                const params = new URLSearchParams({from, to});
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (serviceId !== "" && serviceId !== undefined) params.set("serviceId", String(serviceId));
                if (status === "AWAITING_PAYMENT_CONFIRMATION" || status === "CONFIRMED" || status === "CANCELLED") params.set("status", status);
                return `/admin/schedule/bookings?${params.toString()}`;
            },
            providesTags: [{type: "Bookings", id: "LIST"}]
        }),
        getSpecialistBooking: build.query<SpecialistBooking, number>({
            query: (bookingId) => `/admin/schedule/bookings/${bookingId}`
        }),
        getSpecialistFinanceOverview: build.query<SpecialistFinanceOverview, SpecialistFinanceOverviewArgs>({
            query: ({from, to}) => {
                const params = new URLSearchParams();
                if (from) params.set("from", from);
                if (to) params.set("to", to);
                return `/specialist/finance/overview?${params.toString()}`;
            },
            providesTags: [{type: "FinanceSummary", id: "SPECIALIST_OVERVIEW"}]
        }),
        createManualBooking: build.mutation<SpecialistBooking, ManualBookingInput>({
            query: (body) => ({url: "/admin/schedule/bookings", method: "POST", body}),
            invalidatesTags: [
                {type: "Bookings", id: "LIST"},
                {type: "FinanceSummary", id: "SPECIALIST_OVERVIEW"}
            ]
        }),
        previewManualBooking: build.mutation<ManualBookingConflictPreview, ManualBookingInput>({
            query: (body) => ({url: "/admin/schedule/bookings/preview", method: "POST", body})
        }),
        listFinanceExpenses: build.query<PageResponse<FinanceExpense>, {officeId?: number; from?: string; to?: string; page?: number; size?: number}>({
            query: ({officeId, from, to, page = 0, size = 20}) => {
                const params = new URLSearchParams({page: String(page), size: String(size), sort: "expenseDate,desc"});
                if (officeId) params.set("officeId", String(officeId));
                if (from) params.set("from", from);
                if (to) params.set("to", to);
                return `/admin/finance/expenses?${params.toString()}`;
            },
            providesTags: [{type: "Expenses", id: "LIST"}]
        }),
        createFinanceExpense: build.mutation<FinanceExpense, FinanceExpenseInput>({
            query: (body) => ({url: "/admin/finance/expenses", method: "POST", body}),
            invalidatesTags: [
                {type: "Expenses", id: "LIST"},
                {type: "FinanceSummary", id: "CURRENT"}
            ]
        }),
        deleteFinanceExpense: build.mutation<void, number>({
            query: (id) => ({url: `/admin/finance/expenses/${id}`, method: "DELETE"}),
            invalidatesTags: [
                {type: "Expenses", id: "LIST"},
                {type: "FinanceSummary", id: "CURRENT"}
            ]
        }),
        confirmPayment: build.mutation<FinanceBooking, number>({
            query: (id) => ({url: `/admin/finance/bookings/${id}/confirm-payment`, method: "POST"}),
            invalidatesTags: (result, error, id) => [
                {type: "Bookings", id},
                {type: "Bookings", id: "LIST"},
                {type: "FinanceSummary", id: "CURRENT"},
                {type: "FinanceSummary", id: "SPECIALIST_OVERVIEW"}
            ]
        }),
        markSpecialistPayoutPaid: build.mutation<FinanceBooking, number>({
            query: (id) => ({url: `/admin/finance/bookings/${id}/specialist-payout/mark-paid`, method: "POST"}),
            invalidatesTags: (result, error, id) => [
                {type: "Bookings", id},
                {type: "Bookings", id: "LIST"},
                {type: "FinanceSummary", id: "SPECIALIST_OVERVIEW"}
            ]
        }),
        cancelBooking: build.mutation<Booking, {id: number; reason: string; details?: string | null}>({
            query: ({id, reason, details}) => ({url: `/bookings/${id}/cancel`, method: "POST", body: {reason, details}}),
            invalidatesTags: (result, error, request) => [
                {type: "Bookings", id: request.id},
                {type: "Bookings", id: "LIST"}
            ]
        }),
        createBooking: build.mutation<Booking, BookingInput>({
            query: (body) => ({url: "/bookings", method: "POST", body}),
            invalidatesTags: [{type: "Bookings", id: "LIST"}]
        })
    })
});

export const {
    useCancelBookingMutation,
    useConfirmTrainingParticipantPaymentMutation,
    useConfirmPaymentMutation,
    useCreateFinanceExpenseMutation,
    useDeleteFinanceExpenseMutation,
    useCreateManualBookingMutation,
    usePreviewManualBookingMutation,
    useGetFinanceSummaryQuery,
    useGetFinanceReconciliationQuery,
    useGetFinanceAnalyticsQuery,
    useGetFinanceSettingsQuery,
    useGetSpecialistFinanceOverviewQuery,
    useListFinanceBookingsQuery,
    useListFinanceTrainingParticipantsQuery,
    useListFinanceExpensesQuery,
    useListFinancialTransactionsQuery,
    useListPendingRefundsQuery,
    useCompleteRefundMutation,
    useListMyBookingsQuery,
    useListAdminBookingRecordsQuery,
    useGetAdminBookingTimelineQuery,
    useSetBookingAttendanceMutation,
    useListSpecialistBookingsQuery,
    useLazyGetSpecialistBookingQuery,
    useListSpecialistFinanceSettingsQuery,
    useMarkSpecialistPayoutPaidMutation,
    useUpdateFinanceSettingsMutation,
    useUpdateSpecialistFinanceSettingsMutation,
    useCreateBookingMutation
} = bookingsApi;
