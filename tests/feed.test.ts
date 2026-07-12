import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Server } from "http";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret-feed-123";

vi.mock("../backend/src/lib/supabase", () => {
  const store: Record<string, any[]> = {};

  class QB {
    table: string;
    op: "select" | "insert" | "delete" = "select";
    filters: Array<{ op: "eq" | "neq" | "lt" | "gt"; col: string; val: any }> = [];
    orderBy: Array<{ col: string; asc: boolean }> = [];
    insertData: any = null;
    final: "all" | "single" | "maybe" = "all";

    constructor(table: string) {
      this.table = table;
    }
    select() {
      return this;
    }
    insert(data: any) {
      this.op = "insert";
      this.insertData = data;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    eq(col: string, val: any) {
      this.filters.push({ op: "eq", col, val });
      return this;
    }
    neq(col: string, val: any) {
      this.filters.push({ op: "neq", col, val });
      return this;
    }
    order(col: string, opts?: { ascending?: boolean }) {
      this.orderBy.push({ col, asc: opts?.ascending ?? true });
      return this;
    }
    single() {
      this.final = "single";
      return this;
    }
    maybeSingle() {
      this.final = "maybe";
      return this;
    }
    private matches(r: any): boolean {
      return this.filters.every((f) => {
        const v = r[f.col];
        if (f.op === "eq") return v === f.val;
        if (f.op === "neq") return v !== f.val;
        if (f.op === "lt") return v < f.val;
        if (f.op === "gt") return v > f.val;
        return true;
      });
    }
    then(onfulfilled: (r: { data: any; error: any }) => any) {
      const rows = (store[this.table] = store[this.table] || []);
      let data: any = null;
      let error: any = null;
      try {
        if (this.op === "insert") {
          const arr = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
          const inserted = arr.map((r: any) => ({
            id: r.id || `id-${Math.random().toString(36).slice(2)}`,
            created_at: new Date().toISOString(),
            ...r,
          }));
          rows.push(...inserted);
          data = this.final === "single" ? inserted[0] : inserted;
        } else if (this.op === "delete") {
          store[this.table] = rows.filter((r) => !this.matches(r));
          data = null;
        } else {
          let result = rows.filter((r) => this.matches(r));
          for (const o of this.orderBy) {
            result = result.slice().sort((a: any, b: any) => {
              const av = a[o.col];
              const bv = b[o.col];
              if (av < bv) return o.asc ? -1 : 1;
              if (av > bv) return o.asc ? 1 : -1;
              return 0;
            });
          }
          if (this.final === "single" || this.final === "maybe") data = result[0] || null;
          else data = result;
        }
      } catch (e: any) {
        error = e;
      }
      return onfulfilled({ data, error });
    }
  }

  const supabase = { from: (t: string) => new QB(t) };
  return { supabase, sqlite: {}, __mockStore: store };
});

import app from "../backend/src/app";
import * as supabaseModule from "../backend/src/lib/supabase";

const store = (supabaseModule as any).__mockStore as Record<string, any[]>;

let server: Server;
let baseUrl: string;

function authHeader(userId = "u1"): Record<string, string> {
  const token = jwt.sign({ userId, tier: "FREE" }, process.env.JWT_SECRET as string);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (addr && typeof addr === "object") {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
});

beforeEach(() => {
  store.profiles = [
    { id: "u1", display_name: "João", username: "joao", name: "João", avatar_url: null },
    { id: "u2", display_name: "Ana", username: "ana", name: "Ana", avatar_url: null },
  ];
  store.posts = [
    {
      id: "p1",
      user_id: "u1",
      project_id: null,
      title: "Post Um",
      description: null,
      master_audio_url: "",
      created_at: "2024-01-01T00:00:00Z",
      type: "post",
      genre: "rock",
      key: "E",
      bpm: 120,
      duration: 30,
      color: "bg-orange-500",
      plays: 5,
      caption: null,
      image_url: null,
      song_title: null,
      comments: 0,
      time_ago: "now",
    },
    {
      id: "p2",
      user_id: "u2",
      project_id: null,
      title: "Post Dois",
      description: null,
      master_audio_url: "",
      created_at: "2024-02-01T00:00:00Z",
      type: "post",
      genre: "lofi",
      key: "Am",
      bpm: 90,
      duration: 45,
      color: "bg-amber-500",
      plays: 10,
      caption: null,
      image_url: null,
      song_title: null,
      comments: 0,
      time_ago: "now",
    },
    {
      id: "m1",
      user_id: "u2",
      project_id: null,
      title: "Moment Um",
      description: null,
      master_audio_url: "",
      created_at: "2024-03-01T00:00:00Z",
      type: "moment",
      genre: "",
      key: "",
      bpm: 120,
      duration: 20,
      color: "bg-brand-primary",
      plays: 0,
      caption: "Olha o momento",
      image_url: "https://example.com/img.jpg",
      song_title: "Single",
      comments: 3,
      time_ago: "2h",
    },
  ];
  store.post_likes = [];
  store.remixes = [];
});

describe("GET /api/feed", () => {
  it("returns posts with computed likes and nextCursor when more remain", async () => {
    const resp = await fetch(`${baseUrl}/api/feed?limit=2`);
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(Array.isArray(json.posts)).toBe(true);
    expect(json.posts.length).toBe(2);
    expect(json.nextCursor).not.toBeNull();
    const first = json.posts[0];
    expect(first).toHaveProperty("author");
    expect(first).toHaveProperty("authorHandle");
    expect(first).toHaveProperty("likes");
    expect(first).toHaveProperty("userLiked");
  });

  it("returns a moment mapped to MomentData shape", async () => {
    const resp = await fetch(`${baseUrl}/api/feed?type=moment`);
    const json = await resp.json();
    expect(json.posts.length).toBe(1);
    const moment = json.posts[0];
    expect(moment.artistName).toBe("Ana");
    expect(moment.caption).toBe("Olha o momento");
    expect(moment.songTitle).toBe("Single");
  });

  it("respects the genre filter", async () => {
    const resp = await fetch(`${baseUrl}/api/feed?genre=rock`);
    const json = await resp.json();
    expect(json.posts.length).toBe(1);
    expect(json.posts[0].genre).toBe("rock");
  });
});

describe("POST /api/feed", () => {
  it("creates a post owned by the authenticated user", async () => {
    const resp = await fetch(`${baseUrl}/api/feed`, {
      method: "POST",
      headers: authHeader("u1"),
      body: JSON.stringify({ title: "Novo Post", genre: "edm", bpm: 128 }),
    });
    expect(resp.status).toBe(201);
    const json = await resp.json();
    expect(json.title).toBe("Novo Post");
    expect(json.genre).toBe("edm");
    expect(json.author).toBe("João");

    const feedResp = await fetch(`${baseUrl}/api/feed`);
    const feed = await feedResp.json();
    const created = feed.posts.find((p: any) => p.title === "Novo Post");
    expect(created).toBeTruthy();
  });

  it("rejects unauthenticated publish with 401", async () => {
    const resp = await fetch(`${baseUrl}/api/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X" }),
    });
    expect(resp.status).toBe(401);
  });
});

describe("POST /api/feed/:id/like", () => {
  it("toggles like on and off", async () => {
    const like1 = await fetch(`${baseUrl}/api/feed/p1/like`, {
      method: "POST",
      headers: authHeader("u1"),
    });
    expect(like1.status).toBe(200);
    const j1 = await like1.json();
    expect(j1.liked).toBe(true);
    expect(j1.likes).toBe(1);

    const like2 = await fetch(`${baseUrl}/api/feed/p1/like`, {
      method: "POST",
      headers: authHeader("u1"),
    });
    const j2 = await like2.json();
    expect(j2.liked).toBe(false);
    expect(j2.likes).toBe(0);
  });

  it("returns 401 without auth", async () => {
    const resp = await fetch(`${baseUrl}/api/feed/p1/like`, { method: "POST" });
    expect(resp.status).toBe(401);
  });
});

describe("POST /api/feed/:id/remix", () => {
  it("creates a remix and returns a studio url", async () => {
    store.posts[0].project_id = "proj-original";
    const resp = await fetch(`${baseUrl}/api/feed/p1/remix`, {
      method: "POST",
      headers: authHeader("u1"),
      body: JSON.stringify({ newProjectId: "proj-remix-1" }),
    });
    expect(resp.status).toBe(201);
    const json = await resp.json();
    expect(json.remixedProjectId).toBe("proj-remix-1");
    expect(json.remixUrl).toContain("/studio/proj-remix-1");
    expect(store.remixes.length).toBe(1);
  });
});
