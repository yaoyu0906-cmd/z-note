import { test, expect } from "@playwright/test";
import { createCanvasNote, canvasSurface, dragOnCanvas } from "./helpers";

test.describe("Canvas table tool", () => {
  test("draws a default 3x3 table", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Table \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 360, y: 240 });

    // 3 rows x 3 cols = 2 internal column dividers + 2 internal row
    // dividers, drawn as <line> elements inside the table's <g>.
    const dividers = canvasSurface(page).locator("g line");
    await expect(dividers).toHaveCount(4);
  });

  test("editing a cell persists its text", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Table \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 360, y: 240 });
    await page.getByRole("button", { name: /^Move \(/ }).click();

    await canvasSurface(page).dblclick({ position: { x: 150, y: 140 } });
    const cellInput = canvasSurface(page).locator("input");
    await expect(cellInput).toBeVisible();
    await cellInput.fill("Revenue");
    await cellInput.press("Enter");

    await expect(canvasSurface(page).getByText("Revenue")).toBeVisible();
  });

  test("resizing rows/cols from the properties panel updates the grid", async ({ page }) => {
    await createCanvasNote(page);
    await page.getByRole("button", { name: /^Table \(/ }).click();
    await dragOnCanvas(page, { x: 120, y: 120 }, { x: 360, y: 240 });
    await page.getByRole("button", { name: /^Move \(/ }).click();
    await canvasSurface(page).click({ position: { x: 150, y: 140 } });

    const addRow = page.locator("text=Rows").locator("..").getByRole("button").nth(1);
    await addRow.click();
    await addRow.click();

    // Now 5 rows -> 4 internal row dividers, still 2 column dividers = 6 total.
    const dividers = canvasSurface(page).locator("g line");
    await expect(dividers).toHaveCount(6);
  });
});
