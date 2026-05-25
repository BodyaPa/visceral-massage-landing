import {API_URL} from "@/shared/constants/env";

export const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

let cachedCsrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
    if (cachedCsrfToken) {
        return cachedCsrfToken;
    }

    if (!csrfTokenRequest) {
        csrfTokenRequest = requestCsrfToken().finally(() => {
            csrfTokenRequest = null;
        });
    }

    return csrfTokenRequest;
}

async function requestCsrfToken(): Promise<string> {
    const response = await fetch(`${API_URL}/api/auth/csrf`, {
        credentials: "include",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Unable to establish a secure request session.");
    }

    const data = await response.json() as {token?: string};
    if (!data.token) {
        throw new Error("Security token was not returned by the server.");
    }

    cachedCsrfToken = data.token;
    return cachedCsrfToken;
}

export function clearCsrfToken() {
    cachedCsrfToken = null;
    csrfTokenRequest = null;
}
