import { test, expect } from "@playwright/test";
import { createCanvasNote, canvasSurface, dragOnCanvas } from "./helpers";

test.describe("Canvas save/load", () => {
  test("a table, highlighter, and shape all survive Ctrl+S -> reload", async ({ page }) => {
    await createCanvasNote(page);

    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 180, y: 160 });

    await page.getByRole("button", { name: /^Table \(/ }).click();
    await dragOnCanvas(page, { x: 220, y: 80 }, { x: 420, y: 200 });

    await page.getByRole("button", { name: /^Move \(/ }).click();
    await canvasSurface(page).dblclick({ position: { x: 250, y: 100 } });
    await canvasSurface(page).locator("input").fill("Q1");
    await canvasSurface(page).locator("input").press("Enter");

    await page.getByRole("button", { name: /^Highlighter \(/ }).click();
    await dragOnCanvas(page, { x: 80, y: 300 }, { x: 280, y: 300 });

    await page.keyboard.press("Control+s");
    await page.waitForTimeout(300); // let the save settle before reloading

    await page.reload();
    await canvasSurface(page).waitFor({ state: "visible" });

    await expect(canvasSurface(page).locator("rect").first()).toBeVisible();
    await expect(canvasSurface(page).getByText("Q1")).toBeVisible();
    await expect(canvasSurface(page).locator('path[style*="mix-blend-mode"]')).toHaveCount(1);
  });
});
