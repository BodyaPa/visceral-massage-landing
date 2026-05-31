import {describe, expect, it} from "vitest";
import {hasManagementRole, hasRole} from "./auth.roles";

describe("auth role helpers", () => {
    it("checks additive roles directly", () => {
        const user = {roles: ["USER", "SMM"] as const};

        expect(hasRole(user, "SMM")).toBe(true);
        expect(hasRole(user, "MASTER")).toBe(false);
        expect(hasManagementRole(user)).toBe(true);
    });

    it("does not grant management access without assigned roles", () => {
        const user = {};

        expect(hasRole(user, "SMM")).toBe(false);
        expect(hasRole(user, "FINANCE_MANAGER")).toBe(false);
        expect(hasManagementRole(user)).toBe(false);
    });
});
