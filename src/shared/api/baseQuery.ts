import {fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError} from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/shared/constants/env";
import {CSRF_HEADER_NAME, getCsrfToken} from "@/shared/api/csrf";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: `${API_URL}/api`,
    credentials: "include",
    prepareHeaders: (headers) => {
        headers.set("Content-Type", "application/json");
        return headers;
    },
});

function requiresCsrfToken(args: string | FetchArgs) {
    if (typeof args === "string") {
        return false;
    }

    const method = (args.method ?? "GET").toUpperCase();
    return !["GET", "HEAD", "OPTIONS"].includes(method);
}

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    if (!requiresCsrfToken(args) || typeof args === "string") {
        return rawBaseQuery(args, api, extraOptions);
    }

    try {
        const csrfToken = await getCsrfToken();
        const headers = new Headers(args.headers as HeadersInit | undefined);
        headers.set(CSRF_HEADER_NAME, csrfToken);

        return rawBaseQuery({...args, headers}, api, extraOptions);
    } catch (error) {
        return {
            error: {
                status: "CUSTOM_ERROR",
                error: error instanceof Error ? error.message : "Unable to prepare secure request."
            }
        };
    }
};
