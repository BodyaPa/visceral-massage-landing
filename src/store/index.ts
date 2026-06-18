import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer";
import { newsApi } from "@/features/news/news.api";
import { usersApi } from "@/features/users/users.api";
import { officesApi } from "@/features/offices/offices.api";
import { servicesApi } from "@/features/services/services.api";
import { scheduleApi } from "@/features/schedule/schedule.api";
import { bookingsApi } from "@/features/bookings/bookings.api";
import { siteSettingsApi } from "@/features/siteSettings/siteSettings.api";

export const makeStore = () =>
    configureStore({
        reducer: rootReducer,
        middleware: (getDefault) => getDefault().concat(
            newsApi.middleware,
            usersApi.middleware,
            officesApi.middleware,
            servicesApi.middleware,
            scheduleApi.middleware,
            bookingsApi.middleware,
            siteSettingsApi.middleware
        ),
        devTools: process.env.NODE_ENV !== "production",
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppState = ReturnType<AppStore["getState"]>;
