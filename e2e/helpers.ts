import type { Page } from "@playwright/test";

/**
 * Creates a brand-new Canvas note and waits for the editor to mount.
 * Deliberately doesn't open any workspace folder first — createNote()
 * falls back to an in-memory note when no workspace is open (see
 * lib/store/useWorkspaceStore.ts), so this never needs real File System
 * Access permission and works headless.
 */
export async function createCanvasNote(page: Page) {
  await page.goto("/");
  await page.getByLabel("New file").click();
  await page.getByText("Canvas", { exact: true }).click();
  await page.getByPlaceholder("Title").fill(`Canvas Test ${Date.now()}`);
  await page.getByRole("button", { name: "Create" }).click();
  await page.locator("[data-canvas-surface]").waitFor({ state: "visible" });
}

export function canvasSurface(page: Page) {
  return page.locator("[data-canvas-surface]");
}

/** Draws a straight drag gesture on the canvas surface, from one canvas-
 *  relative point to another, releasing at the end. */
export async function dragOnCanvas(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  const surface = canvasSurface(page);
  const box = await surface.boundingBox();
  if (!box) throw new Error("Canvas surface not visible");
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 8 });
  await page.mouse.up();
}
