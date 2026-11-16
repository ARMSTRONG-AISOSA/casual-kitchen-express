import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "", h1: /Tastes like home/ },
  { path: "about.html", h1: /Home cooking/ },
  { path: "app.html", h1: /The CKE app/ },
  { path: "faq.html", h1: /Questions/ },
  { path: "privacy.html", h1: /Privacy/ },
];

// The release lookup is answered offline, so the checks don't depend on GitHub.
test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (r) => r.fulfill({ status: 404, body: "{}" }));
});

for (const p of PAGES) {
  test(`${p.path || "home"}: loads cleanly, fits the screen, and has its sharing tags`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const bad: string[] = [];
    page.on("response", (r) => {
      if (r.url().startsWith("http://localhost") && r.status() >= 400) bad.push(r.url());
    });
    await page.goto(p.path);
    await expect(page.locator("h1")).toHaveText(p.h1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /cke-share\.png$/,
    );
    await expect(page.locator('footer a[href="privacy.html"]').first()).toBeVisible();
    // No sideways scrolling, even on a 360-pixel phone.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // Every image loads.
    const broken = await page.$$eval("img", (imgs) =>
      imgs.filter((i) => i.loading !== "lazy" && !i.naturalWidth).map((i) => i.src),
    );
    expect(broken).toEqual([]);
    expect(bad).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("every internal link points at a page that exists", async ({ page, request }) => {
  const seen = new Set<string>();
  for (const p of PAGES) {
    await page.goto(p.path);
    const hrefs = await page.$$eval("a[href]", (as) =>
      as.map((a) => (a as HTMLAnchorElement).href),
    );
    for (const h of hrefs) if (h.startsWith("http://localhost")) seen.add(h.split("#")[0]!);
  }
  for (const url of seen) expect((await request.get(url)).status(), url).toBe(200);
});

test("the menu button opens the navigation on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only");
  await page.goto("");
  const nav = page.locator("#siteNav");
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "FAQ" }).click();
  await expect(page).toHaveURL(/faq\.html$/);
});

test("the theme switch cycles and is remembered", async ({ page }) => {
  await page.goto("");
  const btn = page.locator("#themeBtn");
  await expect(btn).toHaveText("Theme: follow device");
  await btn.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await btn.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("faq.html");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#themeBtn")).toHaveText("Theme: dark");
});

test("FAQ answers open natively", async ({ page }) => {
  await page.goto("faq.html");
  const first = page.locator("details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expect(page.locator("details")).toHaveCount(13);
});

test("the download shows the latest release and links straight to the app", async ({ page }) => {
  await page.unroute("https://api.github.com/**");
  await page.route("https://api.github.com/**", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tag_name: "v1.0.0",
        published_at: "2026-12-01T10:00:00Z",
        assets: [
          { name: "cke-rider-1.0.0.apk", size: 1, browser_download_url: "https://x/rider.apk" },
          {
            name: "cke-customer-1.0.0.apk",
            size: 31457280,
            digest: "sha256:abc123",
            browser_download_url: "https://x/customer.apk",
          },
        ],
      }),
    }),
  );
  await page.goto("app.html#download");
  const box = page.locator("[data-release-box]");
  await expect(box.locator('[data-release="version"]')).toHaveText("v1.0.0, 1 December 2026");
  await expect(box.locator('[data-release="checksum"]')).toHaveText("SHA-256 abc123");
  await expect(box.locator('[data-release="size"]')).toHaveText("30.0 MB");
  await expect(box.locator("[data-download]")).toHaveAttribute("href", "https://x/customer.apk");
});

test("before the first release, the button opens the release page", async ({ page }) => {
  await page.goto("app.html#download");
  await expect(page.locator('[data-release="version"]')).toHaveText("First release coming soon");
  await expect(page.locator("[data-download]")).toHaveAttribute("href", /releases\/latest$/);
});

test("a missing page shows the site's 404 with working links", async ({ page }) => {
  const res = await page.goto("no/such/page");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Page not found");
  await page.getByRole("link", { name: "home page" }).click();
  await expect(page.locator("h1")).toHaveText(/Tastes like home/);
});

test("About carries the single Claude Code line; other pages don't", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p.path);
    const n = await page.getByText("Claude Code").count();
    expect(n, p.path || "home").toBe(p.path === "about.html" ? 1 : 0);
  }
});
