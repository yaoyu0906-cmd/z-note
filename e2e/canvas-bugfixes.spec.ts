import { test, expect } from "@playwright/test";
import { createCanvasNote, canvasSurface, dragOnCanvas } from "./helpers";

test.describe("Canvas View / Edit mode", () => {
  test("View mode hides the tool palette and properties panel", async ({ page }) => {
    await createCanvasNote(page);
    await expect(page.getByRole("button", { name: /^Move \(/ })).toBeVisible();

    await page.getByLabel("View mode").click();
    await expect(page.getByRole("button", { name: /^Move \(/ })).toHaveCount(0);
    await expect(page.getByText("Select an element to see its properties")).toHaveCount(0);
  });

  test("View mode blocks drawing and dragging", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 220, y: 200 });
    await expect(canvasSurface(page).locator("rect")).toHaveCount(1);

    await page.getByLabel("View mode").click();
    // Try to draw another rectangle-shaped drag; nothing should appear.
    await dragOnCanvas(page, { x: 300, y: 300 }, { x: 400, y: 380 });
    await expect(canvasSurface(page).locator("rect")).toHaveCount(1);

    await page.getByLabel("Edit mode").click();
    await expect(page.getByRole("button", { name: /^Move \(/ })).toBeVisible();
  });
});

test.describe("Canvas eraser on shapes", () => {
  test("eraser deletes a rectangle it touches", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 220, y: 200 });
    await expect(canvasSurface(page).locator("rect")).toHaveCount(1);

    await page.getByRole("button", { name: /^Eraser \(/ }).click();
    await dragOnCanvas(page, { x: 160, y: 160 }, { x: 180, y: 180 });
    await expect(canvasSurface(page).locator("rect")).toHaveCount(0);
  });
});

test.describe("Canvas drawing/highlighter stay active", () => {
  test("Draw tool remains selected after finishing a stroke", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Draw \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 180, y: 140 });
    await expect(page.getByRole("button", { name: /^Draw \(/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("Highlighter tool remains selected after finishing a stroke", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Highlighter \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 200 }, { x: 300, y: 200 });
    await expect(page.getByRole("button", { name: /^Highlighter \(/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("Rectangle tool switches back to Move after drawing", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Rectangle \(/ }).click();
    await dragOnCanvas(page, { x: 100, y: 100 }, { x: 180, y: 140 });
    await expect(page.getByRole("button", { name: /^Move \(/ })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Canvas table cell editing", () => {
  test("clicking an already-selected table cell opens it for editing without a double-click", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Table \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 360, y: 240 });
    await page.getByRole("button", { name: /^Move \(/ }).click();

    // First click selects the table.
    await canvasSurface(page).click({ position: { x: 150, y: 140 } });
    // Second click on the same cell (now selected) should open it directly.
    await canvasSurface(page).click({ position: { x: 150, y: 140 } });

    const cellInput = canvasSurface(page).locator("input");
    await expect(cellInput).toBeVisible();
    await cellInput.fill("Hello");
    await cellInput.press("Enter");
    await expect(canvasSurface(page).getByText("Hello")).toBeVisible();
  });
});
