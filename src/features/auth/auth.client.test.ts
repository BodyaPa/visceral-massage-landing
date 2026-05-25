import {beforeEach, describe, expect, it, vi} from "vitest";

describe("client authentication requests", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllGlobals();
    });

    it("sends the CSRF header on login mutations", async () => {
        const user = {id: 1, phone: "+380000000001", email: null, firstName: "Iryna", lastName: "Koval", role: "USER"};
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(
                JSON.stringify({token: "secure-token"}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ))
            .mockResolvedValueOnce(new Response(
                JSON.stringify(user),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ));
        vi.stubGlobal("fetch", fetchMock);

        const {login} = await import("./auth.client");

        await expect(login({identifier: user.phone, password: "Passw0rd!Secure"})).resolves.toEqual(user);
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "http://localhost:8080/api/auth/login",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": "secure-token"
                }
            })
        );
        expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
            identifier: user.phone,
            password: "Passw0rd!Secure"
        });
    });

    it("submits logout as a CSRF-protected mutation", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(
                JSON.stringify({token: "logout-token"}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ))
            .mockResolvedValueOnce(new Response(null, {status: 204}));
        vi.stubGlobal("fetch", fetchMock);

        const {logout} = await import("./auth.client");

        await expect(logout()).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "http://localhost:8080/api/auth/logout",
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": "logout-token"
                }
            })
        );
    });

    it("refreshes the CSRF token and retries one rejected login mutation", async () => {
        const user = {id: 1, phone: "+380671234567", email: null, firstName: "Iryna", lastName: "Koval", role: "USER"};
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(
                JSON.stringify({token: "stale-token"}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ))
            .mockResolvedValueOnce(new Response(null, {status: 403}))
            .mockResolvedValueOnce(new Response(
                JSON.stringify({token: "fresh-token"}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ))
            .mockResolvedValueOnce(new Response(
                JSON.stringify(user),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ));
        vi.stubGlobal("fetch", fetchMock);

        const {login} = await import("./auth.client");

        await expect(login({identifier: "0671234567", password: "Passw0rd!Secure"})).resolves.toEqual(user);
        expect(fetchMock).toHaveBeenNthCalledWith(
            4,
            "http://localhost:8080/api/auth/login",
            expect.objectContaining({
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": "fresh-token"
                }
            })
        );
    });
});
