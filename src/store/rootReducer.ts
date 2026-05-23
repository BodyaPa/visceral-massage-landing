import { combineReducers } from "@reduxjs/toolkit";
import { newsApi } from "@/features/news/news.api";

export const rootReducer = combineReducers({
    [newsApi.reducerPath]: newsApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
