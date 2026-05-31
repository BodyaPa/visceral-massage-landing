import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer";
import { newsApi } from "@/features/news/news.api";
import { usersApi } from "@/features/users/users.api";

export const makeStore = () =>
    configureStore({
        reducer: rootReducer,
        middleware: (getDefault) => getDefault().concat(newsApi.middleware, usersApi.middleware),
        devTools: process.env.NODE_ENV !== "production",
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppState = ReturnType<AppStore["getState"]>;
