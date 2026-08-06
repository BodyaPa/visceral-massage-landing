import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer";
import { newsApi } from "@/features/news/news.api";
import { usersApi } from "@/features/users/users.api";
import { officesApi } from "@/features/offices/offices.api";
import { servicesApi } from "@/features/services/services.api";
import { scheduleApi } from "@/features/schedule/schedule.api";
import { workScheduleApi } from "@/features/workSchedule/workSchedule.api";
import { bookingsApi } from "@/features/bookings/bookings.api";
import { siteSettingsApi } from "@/features/siteSettings/siteSettings.api";
import { membershipsApi } from "@/features/memberships/memberships.api";
import { promosApi } from "@/features/promos/promos.api";
import {loyaltyApi} from "@/features/loyalty/loyalty.api";
import {trainingApi} from "@/features/training/training.api";
import {reviewsApi} from "@/features/reviews/reviews.api";
import {clientsApi} from "@/features/clients/clients.api";
import {paymentsApi} from "@/features/payments/payments.api";
import {messagesApi} from "@/features/messages/messages.api";
import {legalApi} from "@/features/legal/legal.api";
import {certificatesApi} from "@/features/certificates/certificates.api";

export const makeStore = () =>
    configureStore({
        reducer: rootReducer,
        middleware: (getDefault) => getDefault().concat(
            newsApi.middleware,
            usersApi.middleware,
            officesApi.middleware,
            servicesApi.middleware,
            scheduleApi.middleware,
            workScheduleApi.middleware,
            bookingsApi.middleware,
            membershipsApi.middleware,
            promosApi.middleware,
            loyaltyApi.middleware,
            trainingApi.middleware,
            reviewsApi.middleware,
            clientsApi.middleware,
            paymentsApi.middleware,
            messagesApi.middleware,
            legalApi.middleware,
            certificatesApi.middleware,
            siteSettingsApi.middleware
        ),
        devTools: process.env.NODE_ENV !== "production",
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppState = ReturnType<AppStore["getState"]>;
