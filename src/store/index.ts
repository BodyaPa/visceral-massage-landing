import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer";
import { articlesApi } from "@/features/articles/articles.api";

export const makeStore = () =>
    configureStore({
        reducer: rootReducer,
        middleware: (getDefault) => getDefault().concat(articlesApi.middleware),
        devTools: process.env.NODE_ENV !== "production",
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppState = ReturnType<AppStore["getState"]>;
