import { expect, test } from "@playwright/test";

const authState = process.env.E2E_AUTH_STORAGE_STATE;
const factoryId = process.env.E2E_FACTORY_ID;

test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  test.skip(
    !authState,
    "Set E2E_AUTH_STORAGE_STATE to a Playwright storage state file for an authenticated user.",
  );
});

test("creates a factory without requiring a Codex auth fixture", async ({
  page,
}) => {
  await page.goto("/factories/new");

  await page.getByLabel("Factory name").fill(`E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Add a Codex agent").uncheck();
  await page.getByRole("button", { name: /Create factory/ }).click();

  await expect(page).toHaveURL(/\/factory\/[^/?#]+$/, {
    timeout: 120_000,
  });
  await expect(
    page.getByRole("heading", { name: /Spawn a new worker/ }),
  ).toBeVisible();
});

test.describe("existing factory flows", () => {
  test.beforeEach(() => {
    test.skip(!factoryId, "Set E2E_FACTORY_ID to exercise factory flows.");
  });

  test("starts a worker from a factory prompt", async ({ page }) => {
    await page.goto(`/factory/${factoryId}`);

    await page
      .getByPlaceholder(/Send a message to the worker/i)
      .fill("Reply with a short readiness check.");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page).toHaveURL(/\/workers\/[^/?#]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByText(/queued|running|idle|failed/i).first(),
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test("saves a factory secret", async ({ page }) => {
    const secretName = `E2E_SECRET_${Date.now()}`;

    await page.goto(`/factory/${factoryId}/secrets`);
    await page.getByLabel("Secret name").fill(secretName);
    await page.getByLabel("Secret value").fill("e2e-secret-value");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(secretName)).toBeVisible();
  });

  test("validates MCP connection setup", async ({ page }) => {
    await page.goto(`/factory/${factoryId}/mcp`);
    await page.getByPlaceholder("linear").fill("e2e-invalid-mcp");
    await page.getByPlaceholder("https://example.com/mcp").fill("not-a-url");
    await page.getByRole("button", { name: "Add MCP" }).click();

    await expect(
      page.getByText(
        /MCP URL must be a valid URL|MCP setup could not be started/i,
      ),
    ).toBeVisible();
  });

  test("opens the billing handoff through the billing API", async ({
    page,
  }) => {
    await page.goto(`/factory/${factoryId}/settings/billing`);

    const billingButton = page.getByRole("button", {
      name: /Upgrade|Manage billing/,
    });
    const buttonText = (await billingButton.textContent()) ?? "";
    const action = /Manage billing/i.test(buttonText) ? "portal" : "upgrade";
    const handoffPath = `/billing-e2e-${action}`;

    await page.route(
      `**/api/factories/${factoryId}/billing/${action}`,
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          json: { url: `${page.url().split("/factory/")[0]}${handoffPath}` },
          status: 200,
        });
      },
    );

    await billingButton.click();
    await expect(page).toHaveURL(new RegExp(`${handoffPath}$`));
  });
});
