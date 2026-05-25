import {beforeEach, describe, expect, it, vi} from "vitest";

describe("baseQuery", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllGlobals();
    });

    it("adds the CSRF header to API mutations", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(
                JSON.stringify({token: "admin-token"}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ))
            .mockResolvedValueOnce(new Response(
                JSON.stringify({id: 1}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ));
        vi.stubGlobal("fetch", fetchMock);

        const {baseQuery} = await import("./baseQuery");

        await baseQuery(
            {url: "/admin/news", method: "POST", body: {title: "Secured"}},
            {
                signal: new AbortController().signal,
                abort: vi.fn(),
                dispatch: vi.fn(),
                getState: vi.fn(),
                extra: undefined,
                endpoint: "createNews",
                type: "mutation",
                forced: false
            },
            {}
        );

        const mutationRequest = fetchMock.mock.calls[1][0] as Request;
        expect(mutationRequest.headers.get("X-XSRF-TOKEN")).toBe("admin-token");
    });
});
