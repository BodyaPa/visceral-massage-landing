import {describe, expect, it} from "vitest";
import {formatCurrencyAmount, formatPercentAmount, formatWholeCurrencyAmount} from "./formatNumbers";

describe("formatNumbers", () => {
    it("formats full currency amounts with existing English finance conventions", () => {
        expect(formatCurrencyAmount(1200, "en")).toContain("UAH");
    });

    it("formats whole currency amounts for public price surfaces", () => {
        expect(formatWholeCurrencyAmount(1200.5, "en")).toBe("UAH\u00a01,201");
    });

    it("formats percent values from whole percent inputs", () => {
        expect(formatPercentAmount(25, "en")).toBe("25%");
    });
});
