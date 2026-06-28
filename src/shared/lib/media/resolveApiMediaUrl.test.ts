import {describe, expect, it} from "vitest";
import {resolveApiMediaUrl} from "./resolveApiMediaUrl";

describe("resolveApiMediaUrl", () => {
    it("prefixes API media paths with the configured API URL", () => {
        expect(resolveApiMediaUrl("/api/media/avatar.png")).toBe("http://localhost:8080/api/media/avatar.png");
    });

    it("keeps non-API media URLs unchanged", () => {
        expect(resolveApiMediaUrl("https://cdn.example.com/avatar.png")).toBe("https://cdn.example.com/avatar.png");
        expect(resolveApiMediaUrl("/uploads/avatar.png")).toBe("/uploads/avatar.png");
    });
});
