import "server-only";

import {cookies} from "next/headers";
import {notFound, redirect} from "next/navigation";
import type {Locale} from "@/i18n";
import {defaultLocale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {hasAnyRole as hasAnyAssignedRole, hasRole as hasAssignedRole, type UserRole} from "./auth.roles";

export type AuthenticatedUser = {
    id: number;
    phone: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    roles: UserRole[];
};

function getServerApiUrl() {
    return process.env.API_INTERNAL_BASE_URL
        ?? process.env.NEXT_PUBLIC_API_URL
        ?? "http://localhost:8080";
}

async function getAuthenticatedUser(locale: Locale = defaultLocale): Promise<AuthenticatedUser> {
    const cookieHeader = (await cookies()).toString();
    const response = await fetch(`${getServerApiUrl()}/api/auth/me`, {
        headers: {
            Cookie: cookieHeader
        },
        cache: "no-store"
    });

    if (response.status === 400 || response.status === 401 || response.status === 403) {
        redirect(withLocale("/auth?mode=login", locale));
    }

    if (!response.ok) {
        throw new Error("Failed to verify authenticated user.");
    }

    const user = await response.json() as AuthenticatedUser;

    return user;
}

export async function requireAuthenticatedUser(locale?: Locale): Promise<AuthenticatedUser> {
    return getAuthenticatedUser(locale);
}

export async function requireRole(role: UserRole, locale?: Locale): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser(locale);

    if (!hasAssignedRole(user, role)) {
        notFound();
    }

    return user;
}

export async function requireAnyRole(roles: UserRole[], locale?: Locale): Promise<AuthenticatedUser> {
    const user = await getAuthenticatedUser(locale);

    if (!hasAnyAssignedRole(user, roles)) {
        notFound();
    }

    return user;
}
