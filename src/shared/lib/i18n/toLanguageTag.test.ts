import {describe, expect, it} from "vitest";
import {toLanguageTag} from "./toLanguageTag";

describe("toLanguageTag", () => {
    it("maps supported app locales to Intl language tags", () => {
        expect(toLanguageTag("ua")).toBe("uk");
        expect(toLanguageTag("en")).toBe("en");
    });

    it("falls back to English for unexpected locale values", () => {
        expect(toLanguageTag("de")).toBe("en");
        expect(toLanguageTag("")).toBe("en");
    });
});
