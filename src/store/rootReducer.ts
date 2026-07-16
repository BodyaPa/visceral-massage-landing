import { combineReducers } from "@reduxjs/toolkit";
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

export const rootReducer = combineReducers({
    [newsApi.reducerPath]: newsApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [officesApi.reducerPath]: officesApi.reducer,
    [servicesApi.reducerPath]: servicesApi.reducer,
    [scheduleApi.reducerPath]: scheduleApi.reducer,
    [workScheduleApi.reducerPath]: workScheduleApi.reducer,
    [bookingsApi.reducerPath]: bookingsApi.reducer,
    [membershipsApi.reducerPath]: membershipsApi.reducer,
    [promosApi.reducerPath]: promosApi.reducer,
    [loyaltyApi.reducerPath]: loyaltyApi.reducer,
    [trainingApi.reducerPath]: trainingApi.reducer,
    [siteSettingsApi.reducerPath]: siteSettingsApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
