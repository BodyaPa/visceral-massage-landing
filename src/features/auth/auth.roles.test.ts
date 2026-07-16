import {describe, expect, it} from "vitest";
import {hasAdministrationSection, hasManagementRole, hasRole} from "./auth.roles";

describe("auth role helpers", () => {
    it("checks additive roles directly", () => {
        const user = {roles: ["USER", "SMM"] as const};

        expect(hasRole(user, "SMM")).toBe(true);
        expect(hasRole(user, "ADMIN")).toBe(false);
        expect(hasManagementRole(user)).toBe(true);
        expect(hasAdministrationSection(user)).toBe(true);
    });

    it("exposes administration for placeholder-backed sections", () => {
        const user = {roles: ["USER", "SPECIALIST", "FINANCE_MANAGER"] as const};

        expect(hasManagementRole(user)).toBe(true);
        expect(hasAdministrationSection(user)).toBe(true);
    });

    it("does not grant management access without assigned roles", () => {
        const user = {};

        expect(hasRole(user, "SMM")).toBe(false);
        expect(hasRole(user, "FINANCE_MANAGER")).toBe(false);
        expect(hasManagementRole(user)).toBe(false);
        expect(hasAdministrationSection(user)).toBe(false);
    });
});
