import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {
    Booking,
    BookingInput,
    BookingStatus,
    FinanceBooking,
    FinanceEventEnrollment,
    FinanceExpense,
    FinanceExpenseInput,
    FinanceSettings,
    FinanceSettingsInput,
    FinanceSpecialistSettings,
    FinanceSpecialistSettingsInput,
    FinanceSummary,
    ManualBookingInput,
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

type ListFinanceEventEnrollmentsArgs = {
    status?: "ACTIVE" | "CANCELLED" | "";
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

function listFinanceBookingsPath({status, officeId, from, to, page = 0, size = 100}: ListFinanceBookingsArgs) {
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

function listFinanceEventEnrollmentsPath({status, officeId, from, to, page = 0, size = 100}: ListFinanceEventEnrollmentsArgs) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc"
    });

    if (status) params.set("status", status);
    if (officeId) params.set("officeId", String(officeId));
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    return `/admin/finance/event-enrollments?${params.toString()}`;
}

export const bookingsApi = createApi({
    reducerPath: "bookingsApi",
    baseQuery,
    tagTypes: ["Bookings", "Expenses", "FinanceSettings", "FinanceSummary"],
    endpoints: (build) => ({
        listMyBookings: build.query<PageResponse<Booking>, {page?: number; size?: number} | void>({
            query: (args) => {
                const page = args?.page ?? 0;
                const size = args?.size ?? 20;
                return `/bookings/my?page=${page}&size=${size}&sort=startsAt,desc`;
            },
            providesTags: [{type: "Bookings", id: "LIST"}]
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
        listFinanceEventEnrollments: build.query<PageResponse<FinanceEventEnrollment>, ListFinanceEventEnrollmentsArgs>({
            query: listFinanceEventEnrollmentsPath,
            providesTags: [{type: "Bookings", id: "EVENT_ENROLLMENTS"}]
        }),
        confirmEventEnrollmentPayment: build.mutation<FinanceEventEnrollment, number>({
            query: (id) => ({url: `/admin/finance/event-enrollments/${id}/confirm-payment`, method: "POST"}),
            invalidatesTags: [{type: "Bookings", id: "EVENT_ENROLLMENTS"}]
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
        listFinanceExpenses: build.query<PageResponse<FinanceExpense>, {officeId?: number; from?: string; to?: string}>({
            query: ({officeId, from, to}) => {
                const params = new URLSearchParams({page: "0", size: "100", sort: "expenseDate,desc"});
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
        cancelBooking: build.mutation<Booking, number>({
            query: (id) => ({url: `/bookings/${id}/cancel`, method: "POST"}),
            invalidatesTags: (result, error, id) => [
                {type: "Bookings", id},
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
    useConfirmEventEnrollmentPaymentMutation,
    useConfirmPaymentMutation,
    useCreateFinanceExpenseMutation,
    useCreateManualBookingMutation,
    useGetFinanceSummaryQuery,
    useGetFinanceSettingsQuery,
    useGetSpecialistFinanceOverviewQuery,
    useListFinanceBookingsQuery,
    useListFinanceEventEnrollmentsQuery,
    useListFinanceExpensesQuery,
    useListMyBookingsQuery,
    useListSpecialistBookingsQuery,
    useListSpecialistFinanceSettingsQuery,
    useMarkSpecialistPayoutPaidMutation,
    useUpdateFinanceSettingsMutation,
    useUpdateSpecialistFinanceSettingsMutation,
    useCreateBookingMutation
} = bookingsApi;
