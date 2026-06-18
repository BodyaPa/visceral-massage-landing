import { combineReducers } from "@reduxjs/toolkit";
import { newsApi } from "@/features/news/news.api";
import { usersApi } from "@/features/users/users.api";
import { officesApi } from "@/features/offices/offices.api";
import { servicesApi } from "@/features/services/services.api";
import { scheduleApi } from "@/features/schedule/schedule.api";
import { bookingsApi } from "@/features/bookings/bookings.api";
import { siteSettingsApi } from "@/features/siteSettings/siteSettings.api";

export const rootReducer = combineReducers({
    [newsApi.reducerPath]: newsApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [officesApi.reducerPath]: officesApi.reducer,
    [servicesApi.reducerPath]: servicesApi.reducer,
    [scheduleApi.reducerPath]: scheduleApi.reducer,
    [bookingsApi.reducerPath]: bookingsApi.reducer,
    [siteSettingsApi.reducerPath]: siteSettingsApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
