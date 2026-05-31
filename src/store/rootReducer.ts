import { combineReducers } from "@reduxjs/toolkit";
import { newsApi } from "@/features/news/news.api";
import { usersApi } from "@/features/users/users.api";
import { officesApi } from "@/features/offices/offices.api";

export const rootReducer = combineReducers({
    [newsApi.reducerPath]: newsApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [officesApi.reducerPath]: officesApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
