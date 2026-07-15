import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.stubGlobal(
  "supabaseSessionToken",
  null,
);

const mockSession = { data: { session: { access_token: "tok-123" } } };

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => mockSession,
    },
  },
}));

import {
  fetchFeed,
  toggleLike,
  toggleFavorite,
  toggleRemix,
  createRemix,
  getPosts,
} from "../src/lib/feedApi";

function mockFetchOnce(payload: unknown, opts: { ok?: boolean; status?: number } = {}) {
  const res = {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    json: async () => payload,
  };
  return vi.fn(async () => res as unknown as Response);
}

describe("feedApi", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchFeed builds query string and parses posts + nextCursor", async () => {
    fetchSpy.mockImplementation(
      mockFetchOnce({ posts: [{ id: "p1" }], nextCursor: "p1" }),
    );
    const page = await fetchFeed({ genre: "rock", sort: "popular", limit: 10 });
    expect(page.posts).toEqual([{ id: "p1" }]);
    expect(page.nextCursor).toBe("p1");
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/feed?");
    expect(calledUrl).toContain("genre=rock");
    expect(calledUrl).toContain("sort=popular");
    expect(calledUrl).toContain("limit=10");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok-123" });
  });

  it("toggleLike posts to the like endpoint", async () => {
    fetchSpy.mockImplementation(mockFetchOnce({ liked: true, likes: 4 }));
    const res = await toggleLike("p1");
    expect(res).toEqual({ liked: true, likes: 4 });
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/feed/p1/like");
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe("POST");
  });

  it("toggleRemix mirrors createRemix and posts to remix endpoint", async () => {
    fetchSpy.mockImplementation(
      mockFetchOnce({ remixedProjectId: "remix-1", remixUrl: "/studio/remix-1" }),
    );
    const res = await toggleRemix("p1", "remix-1");
    expect(res.remixedProjectId).toBe("remix-1");
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/feed/p1/remix");
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe("POST");
  });

  it("createRemix sends newProjectId in body", async () => {
    fetchSpy.mockImplementation(
      mockFetchOnce({ remixedProjectId: "remix-1", remixUrl: "/studio/remix-1" }),
    );
    await createRemix("p1", "remix-1");
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ newProjectId: "remix-1" });
  });

  it("toggleFavorite returns server response when fetch succeeds", async () => {
    fetchSpy.mockImplementation(mockFetchOnce({ favorited: true, favorites: 2 }));
    const res = await toggleFavorite("p1");
    expect(res).toEqual({ favorited: true, favorites: 2 });
  });

  it("toggleFavorite falls back to local toggle when fetch rejects", async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error("network down");
    });
    const first = await toggleFavorite("p1");
    expect(first.favorited).toBe(true);
    expect(first.favorites).toBe(1);
    const second = await toggleFavorite("p1");
    expect(second.favorited).toBe(false);
    expect(second.favorites).toBe(0);
  });

  it("getPosts returns only the posts array", async () => {
    fetchSpy.mockImplementation(
      mockFetchOnce({ posts: [{ id: "a" }, { id: "b" }], nextCursor: null }),
    );
    const posts = await getPosts({ type: "moment" });
    expect(posts).toEqual([{ id: "a" }, { id: "b" }]);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("type=moment");
  });
});
