import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {
    Booking,
    BookingInput,
    BookingStatus,
    FinanceBooking,
    FinanceExpense,
    FinanceExpenseInput,
    FinanceSummary,
    ManualBookingInput,
    SpecialistBooking
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

type FinanceSummaryArgs = {
    officeId?: number;
    from?: string;
    to?: string;
    expenseFrom?: string;
    expenseTo?: string;
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

export const bookingsApi = createApi({
    reducerPath: "bookingsApi",
    baseQuery,
    tagTypes: ["Bookings", "Expenses", "FinanceSummary"],
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
        listSpecialistBookings: build.query<SpecialistBooking[], {from: string; to: string}>({
            query: ({from, to}) => {
                const params = new URLSearchParams({from, to});
                return `/admin/schedule/bookings?${params.toString()}`;
            },
            providesTags: [{type: "Bookings", id: "LIST"}]
        }),
        createManualBooking: build.mutation<SpecialistBooking, ManualBookingInput>({
            query: (body) => ({url: "/admin/schedule/bookings", method: "POST", body}),
            invalidatesTags: [{type: "Bookings", id: "LIST"}]
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
                {type: "FinanceSummary", id: "CURRENT"}
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
    useConfirmPaymentMutation,
    useCreateFinanceExpenseMutation,
    useCreateManualBookingMutation,
    useGetFinanceSummaryQuery,
    useListFinanceBookingsQuery,
    useListFinanceExpensesQuery,
    useListMyBookingsQuery,
    useListSpecialistBookingsQuery,
    useCreateBookingMutation
} = bookingsApi;
