import {describe, expect, it} from "vitest";
import {initialsFromName} from "./initials";

describe("initialsFromName", () => {
    it("uses the first two non-empty name parts", () => {
        expect(initialsFromName("Ada Lovelace Byron", "A")).toBe("AL");
        expect(initialsFromName("  ada   lovelace  ", "A")).toBe("AL");
    });

    it("falls back when name has no usable characters", () => {
        expect(initialsFromName("", "A")).toBe("A");
        expect(initialsFromName("   ", "S")).toBe("S");
    });
});
