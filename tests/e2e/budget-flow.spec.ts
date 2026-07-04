import { test, expect } from "@playwright/test";
import { mockBudgetEndpoint } from "./fixtures";

test.describe("budget flow: /budget", () => {
  test("analyzes a destination and shows a verdict + breakdown", async ({ page }) => {
    await mockBudgetEndpoint(page);

    await page.goto("/budget");
    await expect(page.getByRole("heading", { name: "Can you afford it?" })).toBeVisible();

    // Quick-pick destination instead of typing (avoids IME/locale flakiness).
    // Wait for hydration: retry the click until React state actually flips the
    // button to its selected style, since the plain DOM button is clickable
    // (and thus passes Playwright's actionability checks) before React attaches
    // its onClick handler.
    const portugalButton = page.getByRole("button", { name: "Portugal", exact: true });
    await expect(async () => {
      await portugalButton.click();
      await expect(portugalButton).toHaveClass(/border-brand/);
    }).toPass({ timeout: 10_000 });

    const analyzeButton = page.getByRole("button", { name: /Analyze budget/ });
    await expect(analyzeButton).toBeEnabled();
    await analyzeButton.click();

    await expect(page.getByText("Tight")).toBeVisible();
    await expect(page.getByText("Doable, but little room for extras.")).toBeVisible();
    await expect(page.getByText("€1.350 / person", { exact: true })).toBeVisible();
  });

  test("disables the analyze button until a destination is entered", async ({ page }) => {
    await page.goto("/budget");
    await expect(page.getByRole("button", { name: /Analyze budget/ })).toBeDisabled();
  });
});
