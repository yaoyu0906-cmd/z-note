import { test, expect } from "@playwright/test";
import { createCanvasNote, canvasSurface, dragOnCanvas } from "./helpers";

test.describe("Canvas tool palette", () => {
  test("Select tool is renamed to Move and defaults active", async ({ page }) => {
    await createCanvasNote(page);
    const moveButton = page.getByRole("button", { name: /^Move \(/ });
    await expect(moveButton).toBeVisible();
    await expect(moveButton).toHaveAttribute("aria-pressed", "true");
    // The old "Select" label should be gone entirely.
    await expect(page.getByRole("button", { name: /^Select \(/ })).toHaveCount(0);
  });

  test("Lasso tool is present alongside Move", async ({ page }) => {
    await createCanvasNote(page);
    await expect(page.getByRole("button", { name: /^Lasso \(/ })).toBeVisible();
  });

  test("drawing a rectangle does not auto-select it", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 260, y: 220 });

    // No selection outline (a <rect> with the accent selection stroke
    // class) should be present immediately after the drag ends.
    const selectionOutline = canvasSurface(page).locator("rect.text-accent, rect.dark\\:text-accentDark");
    await expect(selectionOutline).toHaveCount(0);

    // The properties panel should read as "no selection", not "1 selected".
    await expect(page.getByText("Select an element to see its properties")).toBeVisible();
  });

  test("lasso-selecting a freshly drawn shape shows its selection box", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 260, y: 220 });

    await page.getByRole("button", { name: /^Lasso \(/ }).click();
    await dragOnCanvas(page, { x: 80, y: 80 }, { x: 320, y: 260 });

    await expect(page.getByText("1 selected")).toBeVisible();
  });

  test("Move tool pans on empty-space drag instead of marquee-selecting", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 400, y: 400 }, { x: 460, y: 440 });

    // Back to Move (default "switch to Move after tool" behavior).
    await expect(page.getByRole("button", { name: /^Move \(/ })).toHaveAttribute("aria-pressed", "true");

    // Dragging empty space (far from the shape) should pan the camera, not
    // draw a marquee box or select anything.
    await dragOnCanvas(page, { x: 20, y: 20 }, { x: 120, y: 120 });
    await expect(page.getByText("Select an element to see its properties")).toBeVisible();
  });

  test("clicking blank space after typing text keeps the text and only deselects it", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Text \(/ }).click();
    await dragOnCanvas(page, { x: 150, y: 150 }, { x: 150, y: 150 });
    await page.keyboard.type("Hello world");

    // Click far-away blank space — should commit + deselect, not delete.
    await page.mouse.click(600, 500);

    await expect(canvasSurface(page).getByText("Hello world")).toBeVisible();
    await expect(page.getByText("Select an element to see its properties")).toBeVisible();
  });
});
