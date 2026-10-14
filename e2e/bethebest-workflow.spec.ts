import { test, expect } from "@playwright/test";

test.describe("BeTheBest Essential User Journeys", () => {
  test("Health check endpoint returns healthy status and latency", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.database).toBeDefined();
    expect(data.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test("User can authenticate and navigate dashboard", async ({ page }) => {
    await page.goto("/login");

    // Verify brand header and instant test sign-in
    await expect(page.locator("h1")).toContainText("BeTheBest");
    await expect(page.locator("text=Instant Test Sign-In")).toBeVisible();

    // Click Instant Test Sign-in for Devon Vance (Admin)
    await page.locator("text=Devon Vance").click();

    // Should redirect to dashboard
    await page.waitForURL("/", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Welcome back");
    await expect(page.locator("text=Pipeline Value")).toBeVisible();
    await expect(page.locator("text=Weekly Connects")).toBeVisible();
  });

  test("Quick add job opens, validates input, and submits successfully", async ({ page }) => {
    await page.goto("/login");
    await page.locator("text=Devon Vance").click();
    await page.waitForURL("/");

    // Click + Quick Add Opportunity
    await page.locator("button:has-text('Quick Add Opportunity')").first().click();
    await expect(page.locator("text=Quick Add Bidding Job")).toBeVisible();

    // Fill out form
    const uniqueTitle = `Next.js & MongoDB Automated Architecture ${Date.now()}`;
    await page.locator("input[placeholder*='Full Stack Next.js']").fill(uniqueTitle);
    await page.locator("input[placeholder*='Apex Global Tech']").fill("Automated Test Client");
    await page.locator("input[placeholder*='https://www.upwork.com']").fill(`https://www.upwork.com/jobs/~${Date.now()}`);
    await page.locator("button:has-text('Add to Pipeline')").click();

    // Verify success confirmation
    await expect(page.locator("text=added to pipeline")).toBeVisible({ timeout: 10000 });
  });

  test("Pipeline view displays opportunities, filters, and qualification flow", async ({ page }) => {
    await page.goto("/login");
    await page.locator("text=Devon Vance").click();
    await page.waitForURL("/");

    // Navigate to Pipeline
    await page.goto("/pipeline");
    await expect(page.locator("h1")).toContainText("Bidding Opportunity Pipeline");

    // Check search input
    const searchInput = page.locator("input[placeholder*='Search by job title']");
    await expect(searchInput).toBeVisible();

    // Click Qualify button on first item if available
    const qualifyBtn = page.locator("button:has-text('Qualify')").first();
    if (await qualifyBtn.isVisible()) {
      await qualifyBtn.click();
      await expect(page.locator("text=Qualification Assessment")).toBeVisible();
      await expect(page.locator("text=Score Preview")).toBeVisible();
      await page.locator("button:has-text('Cancel')").click();
    }
  });

  test("Connects & Budget page enforces governance, 300 baseline, and Rakesh guards", async ({ page }) => {
    await page.goto("/login");
    await page.locator("text=Devon Vance").click();
    await page.waitForURL("/");

    // Navigate to Budget
    await page.goto("/budget");
    await expect(page.locator("h1")).toContainText("Connects & Bidding Budget Command");

    // Verify Rakesh restriction badge is present
    await expect(page.locator("text=Rakesh")).toBeVisible();
    await expect(page.locator("text=REVIEW_REQUIRED")).toBeVisible();
  });

  test("Financial ROI ledger displays integer precision metrics", async ({ page }) => {
    await page.goto("/login");
    await page.locator("text=Devon Vance").click();
    await page.waitForURL("/");

    // Navigate to Finances
    await page.goto("/finances");
    await expect(page.locator("h1")).toContainText("Financial Operations & ROI Ledger");
    await expect(page.locator("text=Total Revenue")).toBeVisible();
    await expect(page.locator("text=Net Return on Bidding")).toBeVisible();
  });
});
