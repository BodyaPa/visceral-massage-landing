import {describe, expect, it} from "vitest";
import {formatDate, parseDate} from "./dateValue";

describe("date picker local date conversion", () => {
    it("round-trips an ISO calendar date without UTC drift", () => {
        expect(formatDate(parseDate("2026-07-16"))).toBe("2026-07-16");
    });

    it("keeps empty values empty", () => {
        expect(parseDate("")).toBeUndefined();
        expect(formatDate()).toBe("");
    });
});
