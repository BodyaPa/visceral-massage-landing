export type UserRole = "USER" | "MASTER" | "SPECIALIST" | "FINANCE_MANAGER" | "SMM";

export type RoleBearingUser = {
    roles?: readonly UserRole[];
};

export function hasRole(user: RoleBearingUser | null | undefined, role: UserRole) {
    return Boolean(user?.roles?.includes(role));
}

export function hasAnyRole(user: RoleBearingUser | null | undefined, roles: UserRole[]) {
    return roles.some((role) => hasRole(user, role));
}

export function hasManagementRole(user: RoleBearingUser | null | undefined) {
    return hasAnyRole(user, ["MASTER", "SPECIALIST", "FINANCE_MANAGER", "SMM"]);
}

export function hasAdministrationSection(user: RoleBearingUser | null | undefined) {
    return hasAnyRole(user, ["SMM", "MASTER", "SPECIALIST", "FINANCE_MANAGER"]);
}
