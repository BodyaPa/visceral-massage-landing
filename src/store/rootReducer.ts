import { combineReducers } from "@reduxjs/toolkit";
import { articlesApi } from "@/features/articles/articles.api";

export const rootReducer = combineReducers({
    [articlesApi.reducerPath]: articlesApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
