import { test as base, expect } from "@playwright/test";

// Every journey must finish without console errors or uncaught exceptions.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) =>
      errors.push(`${page.url()}: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        errors.push(`${page.url()}: ${message.text()}`);
    });
    await use(page);
    expect(errors, "Browser console errors and uncaught exceptions").toEqual(
      [],
    );
  },
});

export { expect };
