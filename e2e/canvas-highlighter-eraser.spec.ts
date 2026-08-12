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

test.describe("Canvas eraser scope", () => {
  test("eraser ignores text but still removes shapes", async ({ page }) => {
    await createCanvasNote(page);

    // A rectangle should still be erasable (in-scope).
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 400, y: 400 }, { x: 500, y: 460 });

    // Text should NOT be erasable.
    await page.getByRole("button", { name: /^Text \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 100, y: 100 });
    await page.keyboard.type("Hello");
    await page.mouse.click(700, 500); // click blank space to commit + deselect

    await expect(canvasSurface(page).getByText("Hello")).toBeVisible();
    await expect(canvasSurface(page).locator("rect")).toHaveCount(1);

    // Erase over the text — it must survive.
    await page.getByRole("button", { name: /^Eraser \(/ }).click();
    await dragOnCanvas(page, { x: 90, y: 95 }, { x: 150, y: 105 });
    await expect(canvasSurface(page).getByText("Hello")).toBeVisible();

    // Erase over the rectangle — it must be removed (still in-scope).
    await dragOnCanvas(page, { x: 420, y: 420 }, { x: 480, y: 440 });
    await expect(canvasSurface(page).locator("rect")).toHaveCount(0);
  });
});
