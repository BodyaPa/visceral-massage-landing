import {describe, expect, it} from "vitest";
import {financeExportUrl, formatAmount, formatPercent, toNextDayIso, toStartOfDayIso} from "./financeFormatting";

describe("financeFormatting", () => {
    it("converts date filters to the same local-day ISO values used by finance queries", () => {
        expect(toStartOfDayIso("2035-05-10")).toBe(new Date("2035-05-10T00:00:00").toISOString());

        const nextDay = new Date("2035-05-10T00:00:00");
        nextDay.setDate(nextDay.getDate() + 1);
        expect(toNextDayIso("2035-05-10")).toBe(nextDay.toISOString());
    });

    it("keeps empty date filters unset", () => {
        expect(toStartOfDayIso("")).toBeUndefined();
        expect(toNextDayIso("")).toBeUndefined();
    });

    it("builds admin finance export URLs with normalized locale and filters", () => {
        const url = new URL(financeExportUrl("pdf", {
            from: "2035-05-10",
            locale: "ua",
            officeId: "7",
            status: "CONFIRMED",
            to: "2035-05-12"
        }));

        expect(url.origin).toBe("http://localhost:8080");
        expect(url.pathname).toBe("/api/admin/finance/export/pdf");
        expect(url.searchParams.get("locale")).toBe("ua");
        expect(url.searchParams.get("status")).toBe("CONFIRMED");
        expect(url.searchParams.get("officeId")).toBe("7");
        expect(url.searchParams.get("from")).toBe(toStartOfDayIso("2035-05-10"));
        expect(url.searchParams.get("to")).toBe(toNextDayIso("2035-05-12"));
    });

    it("formats finance numbers with existing locale conventions", () => {
        expect(formatAmount(1200, "en")).toContain("UAH");
        expect(formatPercent(25, "en")).toBe("25%");
    });
});
