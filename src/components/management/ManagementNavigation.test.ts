import {describe, expect, it} from "vitest";
import {createNavigationGroups, isActivePath, type ManagementNavigationVisibility} from "./managementNavigationModel";

const hidden: ManagementNavigationVisibility = {
    showNews: false,
    showUsers: false,
    showOffices: false,
    showServices: false,
    showTraining: false,
    showSpecialist: false,
    showWorkSchedule: false,
    showFinance: false,
    showAnalytics: false,
    showReviews: false,
    showRecords: false,
    showNeedsCompletion: false,
    showClients: false,
    showSiteSettings: false,
    showLegal: false,
    showOwnPayouts: false
};

const label = (key: string) => key;

describe("management navigation groups", () => {
    it("groups the full ADMIN workspace by functional domain", () => {
        const groups = createNavigationGroups({
            ...hidden,
            locale: "ua",
            showUsers: true,
            showOffices: true,
            showServices: true,
            showTraining: true,
            showSpecialist: true,
            showWorkSchedule: true,
            showReviews: true,
            showRecords: true,
            showNeedsCompletion: true,
            showClients: true,
            showSiteSettings: true,
            showLegal: true
        }, label);

        expect(groups.map((group) => group.id)).toEqual(["operations", "clientsUsers", "catalog", "loyalty", "content", "system"]);
        expect(groups.flatMap((group) => group.items.map((item) => item.href))).toContain("/ua/admin/promo-codes");
    });

    it("shows only the operational calendar to a specialist", () => {
        const groups = createNavigationGroups({...hidden, locale: "en", showSpecialist: true}, label);
        expect(groups).toHaveLength(1);
        expect(groups[0].id).toBe("operations");
        expect(groups[0].items.map((item) => item.href)).toEqual(["/en/admin/schedule"]);
    });

    it("keeps finance routes in one finance-only group", () => {
        const groups = createNavigationGroups({...hidden, locale: "ua", showFinance: true, showAnalytics: true}, label);
        expect(groups.map((group) => group.id)).toEqual(["finance"]);
        expect(groups[0].items).toHaveLength(2);
    });

    it("matches nested routes without activating sibling routes", () => {
        expect(isActivePath("/ua/admin/services/12", "/ua/admin/services")).toBe(true);
        expect(isActivePath("/ua/admin/service", "/ua/admin/services")).toBe(false);
    });
});
