import { test, expect } from "@playwright/test";
import { mockPlanEndpoint } from "./fixtures";

const RESULTS_URL =
  "/results?destination=Lisbon&startDate=2026-09-01&endDate=2026-09-05&travelers=2&interests=culture,food&budget=2000";

test.describe("collapsible itinerary sections", () => {
  test("sections start expanded and collapse/expand on click", async ({ page }) => {
    await mockPlanEndpoint(page);
    await page.goto(RESULTS_URL);

    const overviewToggle = page.getByRole("button", { name: "Overview" });
    await expect(overviewToggle).toBeVisible();
    const overviewBody = page.getByText(
      "A 5-day introduction to Lisbon covering the historic center, Belém and a day trip to Sintra."
    );

    // Starts expanded
    await expect(overviewBody).toBeVisible();

    // Collapse
    await overviewToggle.click();
    await expect(overviewBody).toBeHidden();

    // Expand again
    await overviewToggle.click();
    await expect(overviewBody).toBeVisible();

    // Other sections are independent — Itinerary stays expanded throughout
    await expect(page.getByText("Pena Palace")).toBeVisible();
  });
});
