import {fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError} from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/shared/constants/env";
import {clearCsrfToken, CSRF_HEADER_NAME, getCsrfToken} from "@/shared/api/csrf";
import {refreshSession} from "@/features/auth/auth.client";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: `${API_URL}/api`,
    credentials: "include",
    prepareHeaders: (headers, {arg}) => {
        const body = typeof arg === "string" ? undefined : arg.body;

        if (!(body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }

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

function isAuthenticationError(result: {error?: FetchBaseQueryError}) {
    return result.error?.status === 401 || result.error?.status === 403;
}

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    try {
        const protectedMutation = requiresCsrfToken(args) && typeof args !== "string";
        let result = protectedMutation
            ? await sendProtectedRequest(args, api, extraOptions)
            : await rawBaseQuery(args, api, extraOptions);

        if (protectedMutation && result.error?.status === 403) {
            clearCsrfToken();
            result = await sendProtectedRequest(args, api, extraOptions);
        }

        if (isAuthenticationError(result)) {
            try {
                await refreshSession();
                result = protectedMutation
                    ? await sendProtectedRequest(args, api, extraOptions)
                    : await rawBaseQuery(args, api, extraOptions);
            } catch {
                // Keep the original unauthorized response when the refresh session is unavailable.
            }
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
