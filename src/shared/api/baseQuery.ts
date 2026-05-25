import {fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError} from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/shared/constants/env";
import {clearCsrfToken, CSRF_HEADER_NAME, getCsrfToken} from "@/shared/api/csrf";

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

async function sendProtectedRequest(
    args: FetchArgs,
    api: Parameters<typeof rawBaseQuery>[1],
    extraOptions: Parameters<typeof rawBaseQuery>[2]
) {
    const headers = new Headers(args.headers as HeadersInit | undefined);
    headers.set(CSRF_HEADER_NAME, await getCsrfToken());

    return rawBaseQuery({...args, headers}, api, extraOptions);
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
        let result = await sendProtectedRequest(args, api, extraOptions);

        if (result.error?.status === 403) {
            clearCsrfToken();
            result = await sendProtectedRequest(args, api, extraOptions);
        }

        return result;
    } catch (error) {
        return {
            error: {
                status: "CUSTOM_ERROR",
                error: error instanceof Error ? error.message : "Unable to prepare secure request."
            }
        };
    }
};
