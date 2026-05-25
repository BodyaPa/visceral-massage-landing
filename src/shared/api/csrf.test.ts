import {beforeEach, describe, expect, it, vi} from "vitest";

describe("getCsrfToken", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllGlobals();
    });

    it("shares a concurrent token request and caches the token in memory", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({token: "secure-token"}),
            {status: 200, headers: {"Content-Type": "application/json"}}
        ));
        vi.stubGlobal("fetch", fetchMock);

        const {getCsrfToken} = await import("./csrf");

        await expect(Promise.all([getCsrfToken(), getCsrfToken()])).resolves.toEqual(["secure-token", "secure-token"]);
        await expect(getCsrfToken()).resolves.toBe("secure-token");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            "http://localhost:8080/api/auth/csrf",
            {credentials: "include", cache: "no-store"}
        );
    });

    it("rejects a response without a token", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
            JSON.stringify({}),
            {status: 200, headers: {"Content-Type": "application/json"}}
        )));

        const {getCsrfToken} = await import("./csrf");

        await expect(getCsrfToken()).rejects.toThrow("Security token was not returned");
    });
});
