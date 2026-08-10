import { test, expect } from "@playwright/test";

test.describe("Settings → Canvas", () => {
  test("shows behavior toggles and a rebindable keybind list", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Canvas" }).click();

    await expect(page.getByText("Change to Move after using tools")).toBeVisible();
    await expect(page.getByText("Arrow-key pan")).toBeVisible();
    await expect(page.getByText("Pan amount (px)")).toBeVisible();
    await expect(page.getByText("Move Tool")).toBeVisible();
    await expect(page.getByText("V", { exact: true })).toBeVisible();
  });

  test("rebinding a Canvas tool shortcut updates its displayed keys", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Canvas" }).click();

    const row = page.locator("li", { hasText: "Lasso Tool" });
    await row.getByRole("button", { name: "Change" }).click();
    await page.keyboard.press("KeyQ");

    await expect(row.getByText("Q", { exact: true })).toBeVisible();
  });
});
