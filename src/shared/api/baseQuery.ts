import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/shared/constants/env";

export const baseQuery = fetchBaseQuery({
    baseUrl: `${API_URL}/api`,
    credentials: "same-origin",
    prepareHeaders: (headers) => {
        headers.set("Content-Type", "application/json");
        return headers;
    },
});
