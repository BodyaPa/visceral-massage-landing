import {describe, expect, it} from "vitest";
import {buttonClassName} from "./buttonStyles";

describe("buttonClassName", () => {
    it("uses the primary medium hierarchy by default", () => {
        const classes = buttonClassName();

        expect(classes).toContain("bg-stone-900");
        expect(classes).toContain("min-h-10");
        expect(classes).not.toContain("w-full");
    });

    it("keeps link actions visually lightweight", () => {
        const classes = buttonClassName({variant: "link", size: "lg"});

        expect(classes).toContain("underline");
        expect(classes).toContain("min-h-0");
        expect(classes).not.toContain("min-h-11");
    });

    it("preserves caller layout classes", () => {
        expect(buttonClassName({fullWidth: true, className: "justify-start"})).toContain("w-full justify-start");
    });
});
