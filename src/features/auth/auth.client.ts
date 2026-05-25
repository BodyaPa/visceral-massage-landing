import {API_URL} from "@/shared/constants/env";
import {clearCsrfToken, CSRF_HEADER_NAME, getCsrfToken} from "@/shared/api/csrf";

export type AuthenticatedUser = {
    id: number;
    phone: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: "USER" | "ADMIN";
};

type LoginRequest = {
    identifier: string;
    password: string;
};

type RegisterRequest = {
    phone?: string;
    email?: string;
    firstName: string;
    lastName: string;
    password: string;
};

export class AuthRequestError extends Error {
    constructor(readonly serverMessage: string | null) {
        super("Authentication request failed.");
    }
}

async function sendAuthMutation(path: string, body: unknown, csrfToken: string) {
    return fetch(`${API_URL}/api/auth/${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            [CSRF_HEADER_NAME]: csrfToken
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

async function postAuth<T>(path: string, body?: unknown): Promise<T> {
    let response = await sendAuthMutation(path, body, await getCsrfToken());

    if (response.status === 403) {
        clearCsrfToken();
        response = await sendAuthMutation(path, body, await getCsrfToken());
    }

    if (!response.ok) {
        let serverMessage: string | null = null;
        try {
            const data = await response.json() as {message?: string};
            serverMessage = data.message ?? null;
        } catch {
            // Responses without JSON still map to the generic UI message.
        }
        throw new AuthRequestError(serverMessage);
    }

    if (path === "logout") {
        clearCsrfToken();
    }

    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function login(request: LoginRequest) {
    return postAuth<AuthenticatedUser>("login", request);
}

export function register(request: RegisterRequest) {
    return postAuth<AuthenticatedUser>("register", request);
}

export function logout() {
    return postAuth<void>("logout");
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
        cache: "no-store"
    });

    if (response.status === 400 || response.status === 401 || response.status === 403) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Unable to load current user.");
    }

    return response.json() as Promise<AuthenticatedUser>;
}
