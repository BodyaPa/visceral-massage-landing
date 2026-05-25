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

    it("retries an admin mutation once with a refreshed CSRF token after a forbidden response", async () => {
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
                JSON.stringify({id: 1}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ));
        vi.stubGlobal("fetch", fetchMock);

        const {baseQuery} = await import("./baseQuery");

        const result = await baseQuery(
            {url: "/admin/news", method: "POST", body: {titleUa: "Новина", contentUa: "Текст"}},
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

        expect(result).toMatchObject({data: {id: 1}});
        const retryRequest = fetchMock.mock.calls[3][0] as Request;
        expect(retryRequest.headers.get("X-XSRF-TOKEN")).toBe("fresh-token");
    });

    it("refreshes an expired access session before retrying an admin query", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(null, {status: 401}))
            .mockResolvedValueOnce(new Response(
                JSON.stringify({token: "session-token"}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ))
            .mockResolvedValueOnce(new Response(null, {status: 204}))
            .mockResolvedValueOnce(new Response(
                JSON.stringify({content: []}),
                {status: 200, headers: {"Content-Type": "application/json"}}
            ));
        vi.stubGlobal("fetch", fetchMock);

        const {baseQuery} = await import("./baseQuery");

        const result = await baseQuery(
            "/admin/news?page=0&size=50",
            {
                signal: new AbortController().signal,
                abort: vi.fn(),
                dispatch: vi.fn(),
                getState: vi.fn(),
                extra: undefined,
                endpoint: "listAdminNews",
                type: "query",
                forced: false
            },
            {}
        );

        expect(result).toMatchObject({data: {content: []}});
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });
});
