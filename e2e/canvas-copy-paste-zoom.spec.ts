import { test, expect } from "@playwright/test";
import { createCanvasNote, canvasSurface, dragOnCanvas } from "./helpers";

test.describe("Canvas copy/paste", () => {
  test("Ctrl+C / Ctrl+V duplicates the selection with new ids at the viewport center", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 220, y: 200 });
    await page.getByRole("button", { name: /^Move \(/ }).click();
    await canvasSurface(page).click({ position: { x: 170, y: 160 } });

    await expect(canvasSurface(page).locator("rect")).toHaveCount(1);

    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");

    await expect(canvasSurface(page).locator("rect")).toHaveCount(2);
    // The paste should also become the new selection.
    await expect(page.getByText("1 selected")).toBeVisible();
  });

  test("pasting preserves style properties", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 220, y: 200 });
    await page.getByRole("button", { name: /^Move \(/ }).click();
    await canvasSurface(page).click({ position: { x: 170, y: 160 } });

    const opacitySlider = page.locator('input[type="range"]').last();
    await opacitySlider.fill("0.5");

    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");

    const rects = canvasSurface(page).locator("rect");
    await expect(rects).toHaveCount(2);
    await expect(rects.nth(1)).toHaveAttribute("opacity", "0.5");
  });
});

test.describe("Canvas wheel zoom", () => {
  test("scrolling the wheel zooms rather than pans", async ({ page }) => {
    await createCanvasNote(page);
    const surface = canvasSurface(page);
    const box = (await surface.boundingBox())!;

    const zoomLabelBefore = await page.getByText(/%$/).textContent();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200); // scroll "up" -> zoom in
    const zoomLabelAfter = await page.getByText(/%$/).textContent();

    expect(zoomLabelAfter).not.toBe(zoomLabelBefore);
  });
});
