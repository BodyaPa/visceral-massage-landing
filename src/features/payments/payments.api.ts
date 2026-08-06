import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {PaymentCheckout, PaymentDetails} from "@/types/payments";

export const paymentsApi = createApi({
    reducerPath: "paymentsApi",
    baseQuery,
    tagTypes: ["Payment"],
    endpoints: build => ({
        createCheckout: build.mutation<PaymentCheckout, string>({
            query: paymentId => ({url: `/payments/${paymentId}/checkout`, method: "POST"})
        }),
        paymentStatus: build.query<PaymentDetails, string>({
            query: paymentId => `/payments/${paymentId}`,
            providesTags: (result, error, id) => [{type: "Payment", id}]
        })
    })
});

export const {useCreateCheckoutMutation, usePaymentStatusQuery} = paymentsApi;
