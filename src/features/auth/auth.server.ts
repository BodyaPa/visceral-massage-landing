import "server-only";

import {cookies} from "next/headers";
import {notFound} from "next/navigation";
import {hasAnyRole as hasAnyAssignedRole, hasRole as hasAssignedRole, type UserRole} from "./auth.roles";

export type AuthenticatedUser = {
    id: number;
    phone: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    roles: UserRole[];
};

function getServerApiUrl() {
    return process.env.API_INTERNAL_BASE_URL
        ?? process.env.NEXT_PUBLIC_API_URL
        ?? "http://localhost:8080";
}

async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
    const cookieHeader = (await cookies()).toString();
    const response = await fetch(`${getServerApiUrl()}/api/auth/me`, {
        headers: {
            Cookie: cookieHeader
        },
        cache: "no-store"
    });

    if (response.status === 400 || response.status === 401 || response.status === 403) {
        notFound();
    }

    if (!response.ok) {
        throw new Error("Failed to verify admin access.");
    }

    const user = await response.json() as AuthenticatedUser;

    return user;
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
    return getAuthenticatedUser();
}

export async function requireRole(role: UserRole): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser();

    if (!hasAssignedRole(user, role)) {
        notFound();
    }

    return user;
}

export async function requireAnyRole(roles: UserRole[]): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser();

    if (!hasAnyAssignedRole(user, roles)) {
        notFound();
    }

    return user;
}
