import {API_URL} from "@/shared/constants/env";
import {clearCsrfToken, CSRF_HEADER_NAME, getCsrfToken} from "@/shared/api/csrf";
import type {UserRole} from "./auth.roles";
export {hasAdministrationSection, hasAnyRole, hasManagementRole, hasRole} from "./auth.roles";

export type AuthenticatedUser = {
    id: number;
    phone: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    roles: UserRole[];
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

type PasswordRecoveryRequest = {
    email: string;
};

type PasswordRecoveryConfirmRequest = {
    email: string;
    code: string;
    newPassword: string;
};

export class AuthRequestError extends Error {
    constructor(readonly serverMessage: string | null) {
        super("Authentication request failed.");
    }
}

let refreshRequest: Promise<void> | null = null;

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

export function requestPasswordRecovery(request: PasswordRecoveryRequest) {
    return postAuth<void>("password-recovery/request", request);
}

export function confirmPasswordRecovery(request: PasswordRecoveryConfirmRequest) {
    return postAuth<void>("password-recovery/confirm", request);
}

export function logout() {
    return postAuth<void>("logout");
}

export function refreshSession() {
    if (!refreshRequest) {
        refreshRequest = postAuth<void>("refresh").finally(() => {
            refreshRequest = null;
        });
    }

    return refreshRequest;
}

async function requestCurrentUser() {
    return fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
        cache: "no-store"
    });
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
    let response = await requestCurrentUser();

    if (response.status === 400 || response.status === 401 || response.status === 403) {
        try {
            await refreshSession();
            response = await requestCurrentUser();
        } catch {
            return null;
        }
    }

    if (response.status === 400 || response.status === 401 || response.status === 403) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Unable to load current user.");
    }

    return response.json() as Promise<AuthenticatedUser>;
}
