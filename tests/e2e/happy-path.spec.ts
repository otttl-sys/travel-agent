import { test, expect, type Page } from "@playwright/test";
import { mockPlanEndpoint } from "./fixtures";

/** Clicks a button and waits for its onClick to actually take effect (checked
 * via `until`), retrying the click if needed. Plain DOM buttons are clickable
 * — and pass Playwright's actionability checks — before React finishes
 * hydrating and attaches its handlers, so a bare `.click()` right after
 * navigation can silently no-op. */
async function clickUntil(page: Page, button: ReturnType<Page["getByRole"]>, until: () => Promise<void>) {
  await expect(async () => {
    await button.click();
    await until();
  }).toPass({ timeout: 10_000 });
}

test.describe("happy path: onboarding → plan wizard → results", () => {
  test("skips onboarding, fills the wizard, and lands on a rendered itinerary", async ({ page }) => {
    await mockPlanEndpoint(page);

    await page.goto("/onboarding");
    await clickUntil(page, page.getByRole("button", { name: "Skip for now →" }), () =>
      expect(page).toHaveURL(/\/plan$/)
    );

    // Step 1 — Destination via quick pick (avoids autocomplete flakiness).
    // This button has no "selected" style of its own, so wait on the
    // consequence instead: the destination input's value, and the "Weiter"
    // button flipping from disabled to enabled.
    await expect(page.getByRole("heading", { name: "Wohin soll die Reise gehen?" })).toBeVisible();
    const destinationInput = page.getByPlaceholder("z.B. Japan, Portugal, Bali...");
    const weiterButton = page.getByRole("button", { name: "Weiter →" });
    await clickUntil(page, page.getByRole("button", { name: "Portugal", exact: true }), async () => {
      await expect(destinationInput).toHaveValue("Portugal");
      await expect(weiterButton).toBeEnabled();
    });
    await weiterButton.click();

    // Step 2 — Dates (optional, just continue)
    await expect(page.getByRole("heading", { name: "Wann möchtest du reisen?" })).toBeVisible();
    await page.getByRole("button", { name: "Weiter →" }).click();

    // Step 3 — Travelers (optional, just continue)
    await expect(page.getByRole("heading", { name: "Wie viele Personen reisen?" })).toBeVisible();
    await page.getByRole("button", { name: "Weiter →" }).click();

    // Step 4 — Interests (optional, just continue)
    await expect(page.getByRole("heading", { name: "Was sind deine Interessen?" })).toBeVisible();
    await page.getByRole("button", { name: "Weiter →" }).click();

    // Step 5 — Budget preset
    await expect(page.getByRole("heading", { name: "Was ist dein Budget?" })).toBeVisible();
    const budgetPreset = page.getByRole("button", { name: "€2,000" });
    await clickUntil(page, budgetPreset, () => expect(budgetPreset).toHaveClass(/bg-foreground/));
    await page.getByRole("button", { name: "Weiter →" }).click();

    // Step 6 — Summary → submit
    await expect(page.getByRole("heading", { name: "Alles klar. Los geht's!" })).toBeVisible();
    await page.getByRole("button", { name: "AI starten →" }).click();

    // Results page — mocked itinerary should render with its sections
    await expect(page).toHaveURL(/\/results\?/);
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Itinerary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Packing List" })).toBeVisible();
    await expect(page.getByText("Pena Palace")).toBeVisible();
  });
});
