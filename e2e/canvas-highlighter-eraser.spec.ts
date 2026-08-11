import { test, expect } from "@playwright/test";
import { createCanvasNote, canvasSurface, dragOnCanvas } from "./helpers";

test.describe("Canvas highlighter and eraser", () => {
  test("highlighter draws a translucent multiply-blended stroke", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Highlighter \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 });

    const stroke = canvasSurface(page).locator('path[style*="mix-blend-mode"]');
    await expect(stroke).toHaveCount(1);
    await expect(stroke).toHaveAttribute("stroke-linecap", "butt");
  });

  test("eraser removes freehand drawings and shapes alike", async ({ page }) => {
    await createCanvasNote(page);

    // Draw a rectangle at one location.
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 400, y: 400 }, { x: 500, y: 460 });

    // Draw a freehand scribble at a distinct location.
    await page.getByRole("button", { name: /^Draw \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 180, y: 140 });

    await expect(canvasSurface(page).locator("rect")).toHaveCount(1);
    await expect(canvasSurface(page).locator("path")).toHaveCount(1);

    // Erasing over the freehand stroke only removes that stroke.
    await page.getByRole("button", { name: /^Eraser \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 180, y: 140 });
    await expect(canvasSurface(page).locator("path")).toHaveCount(0);
    await expect(canvasSurface(page).locator("rect")).toHaveCount(1);

    // The eraser also removes shapes it touches (not drawings-only anymore).
    await dragOnCanvas(page, { x: 420, y: 420 }, { x: 480, y: 440 });
    await expect(canvasSurface(page).locator("rect")).toHaveCount(0);
  });

  test("erasing an entire stroke undoes in a single step", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Draw \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 180, y: 140 });
    await expect(canvasSurface(page).locator("path")).toHaveCount(1);

    await page.getByRole("button", { name: /^Eraser \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 180, y: 140 });
    await expect(canvasSurface(page).locator("path")).toHaveCount(0);

    await page.keyboard.press("Control+z");
    await expect(canvasSurface(page).locator("path")).toHaveCount(1);
  });
});
