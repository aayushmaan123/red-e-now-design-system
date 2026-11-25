/**
 * Red-E Now demo loop, end to end, through the real UI and the real API.
 *
 *   1. resident signs up with the building code, signs out, signs back in
 *   2. staff register a package for that resident and release it
 *   3. resident books a slot, moves it, cancels it, books again
 *   4. staff see the booking and prepare the package
 *   5. check-in, identity, sign-off, complete, with receipt and audit trail
 *
 * Needs the front desk to be open (a pickup slot in progress or coming up
 * today), because step 5 checks in for real. Every run creates one resident
 * and one package; `python scripts/db_bootstrap.py --reset` clears them.
 *
 * Controls are found by role and accessible name. If a redesign renames one
 * of them, update the name here in the same change.
 */
import { expect, test, type Page } from "@playwright/test";

const STAFF_EMAIL = process.env["E2E_STAFF_EMAIL"] ?? "staff@redenow.com";
const STAFF_PASSWORD = process.env["E2E_STAFF_PASSWORD"] ?? "password123";
const BUILDING_CODE = process.env["E2E_BUILDING_CODE"] ?? "REDENOW";

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Console errors, uncaught exceptions, hydration warnings and 5xx responses. */
function watch(page: Page, label: string, problems: string[]) {
  page.on("console", (message) => {
    const text = message.text();
    // 4xx responses are part of the script (wrong building code, etc.).
    if (text.startsWith("Failed to load resource")) return;
    if (message.type() === "error" || /hydrat/i.test(text)) {
      problems.push(`[${label}] console ${message.type()}: ${text.slice(0, 300)}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`[${label}] uncaught: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) problems.push(`[${label}] ${response.status()} ${response.url()}`);
  });
}

/** Pages are server-rendered: wait until React owns the DOM before typing. */
async function hydrated(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const node = document.querySelector(sel);
    return !!node && Object.keys(node).some((key) => key.startsWith("__reactProps$"));
  }, selector);
}

async function signIn(page: Page, path: string, email: string, password: string) {
  await page.goto(path);
  await hydrated(page, "form");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const residentTab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
const staffNav = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Management navigation" }).getByRole("button", { name, exact: true });
const slotButtons = (page: Page) => page.getByRole("button", { name: /remaining/ });

/** Reload and wait for the signed-in resident shell (data loads on mount). */
async function refreshResident(page: Page, tab: string) {
  await page.reload();
  await expect(residentTab(page, tab)).toBeVisible();
  await hydrated(page, '[role="tablist"]');
  await residentTab(page, tab).click();
  await expect(residentTab(page, tab)).toHaveAttribute("aria-selected", "true");
}

/** Reload the staff console and open one of its sections. */
async function openStaffSection(page: Page, section: string, { reload = true } = {}) {
  if (reload) await page.reload();
  await expect(staffNav(page, section)).toBeVisible();
  await hydrated(page, 'nav[aria-label="Management navigation"]');
  await staffNav(page, section).click();
  await expect(page.getByRole("heading", { level: 1, name: section })).toBeVisible();
}

/** Pick a date in the resident booking form and wait for that day's slots. */
async function chooseDate(page: Page, day: string) {
  const slots = page.waitForResponse((r) => r.url().includes(`/scheduling/slots?date=${day}`));
  await page.getByLabel("Pickup Date").fill(day);
  await slots;
  await expect(page.getByText("Loading available times")).toHaveCount(0);
}

const remainingOf = async (page: Page, time: string) => {
  const text = await slotButtons(page).filter({ hasText: time }).first().innerText();
  return Number(/(\d+)\s+remaining/.exec(text)?.[1]);
};

test("resident and front desk complete a pickup end to end", async ({ browser, page }, testInfo) => {
  const stamp = Date.now().toString().slice(-7);
  const who = testInfo.project.name === "iphone" ? "Phone" : "Desktop";
  const resident = {
    name: `Casey ${who} ${stamp}`,
    email: `e2e-${who.toLowerCase()}-${stamp}@example.com`,
    unit: `E${stamp.slice(-3)}`,
    password: `e2e-pass-${stamp}`,
  };
  const tracking = `E2E${who.toUpperCase()}${stamp}`;
  const location = `SHELF-E${stamp.slice(-2)}`;
  const problems: string[] = [];

  // The staff console is a desk tool: always drive it at desktop size.
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const staff = await staffContext.newPage();
  watch(page, "resident", problems);
  watch(staff, "staff", problems);
  page.on("dialog", (dialog) => void dialog.accept());

  const today = isoDay(new Date());

  await test.step("1. Resident signs up with the building code and signs in", async () => {
    await page.goto("/signup");
    await hydrated(page, "form");
    await page.getByLabel("Full name").fill(resident.name);
    await page.getByLabel("Email address").fill(resident.email);
    await page.getByLabel("Unit number").fill(resident.unit);
    await page.getByLabel("Building code").fill("WRONGCODE");
    await page.getByLabel("Password", { exact: true }).fill(resident.password);
    await page.getByLabel("Confirm password").fill(resident.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert")).toContainText(/building code/i);
    await expect(page).toHaveURL(/\/signup$/);

    await page.getByLabel("Building code").fill(BUILDING_CODE);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Casey");
    await expect(page.getByText("No packages waiting for you right now")).toBeVisible();

    // Hard refresh on a deep link keeps the session.
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(residentTab(page, "Home")).toBeVisible();
    await hydrated(page, '[role="tablist"]');

    // Sign out, then sign back in with the new account.
    await residentTab(page, "Profile").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page, "/login", resident.email, resident.password);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("2. Staff register a package for that resident", async () => {
    await signIn(staff, "/staff/login", STAFF_EMAIL, STAFF_PASSWORD);
    await expect(staff).toHaveURL(/\/staff\/dashboard$/);
    await openStaffSection(staff, "Register Package", { reload: false });

    const form = staff.locator("form");
    await form.getByLabel("Carrier").selectOption("UPS");
    await form.getByLabel("Tracking Code").fill(tracking);
    const option = form.getByLabel("Resident").locator("option", { hasText: resident.name });
    await expect(option).toHaveCount(1);
    await form.getByLabel("Resident").selectOption((await option.getAttribute("value")) ?? "");
    await form.getByLabel("Storage Location").fill(location);
    await form.getByLabel("Description").fill("Medium box");
    await form.getByRole("button", { name: "Register Package" }).click();
    await expect(form.getByRole("status")).toContainText("Package registered");

    // The resident sees it, but cannot book it until the desk releases it.
    await refreshResident(page, "Home");
    await expect(page.getByText(tracking).first()).toBeVisible();
    await expect(page.getByText("received", { exact: true }).first()).toBeVisible();

    await openStaffSection(staff, "Packages", { reload: false });
    await staff.getByPlaceholder(/Search name, tracking/).fill(tracking);
    const row = staff.getByRole("row").filter({ hasText: tracking });
    await expect(row).toHaveCount(1);
    await row.click();
    const drawer = staff.getByRole("dialog");
    await expect(drawer).toContainText(resident.name);
    await drawer.getByRole("button", { name: "Mark Available for Pickup" }).click();
    await expect(drawer.getByText("available", { exact: true })).toBeVisible();
    await staff.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
  });

  await test.step("3. Resident books a slot, moves it, cancels it and books again", async () => {
    await refreshResident(page, "Home");
    // Only this resident's package is listed.
    await expect(page.getByText(tracking).first()).toBeVisible();
    await expect(page.getByText("available", { exact: true }).first()).toBeVisible();

    await residentTab(page, "Schedule").click();
    const packageSelect = page.getByLabel(/^Package/);
    const pickPackage = async () => {
      const option = packageSelect.locator("option", { hasText: tracking });
      await expect(option).toHaveCount(1);
      await packageSelect.selectOption((await option.getAttribute("value")) ?? "");
    };

    // A later day with at least two open slots, for book → move → cancel.
    let laterDay = "";
    for (let offset = 1; offset <= 7 && !laterDay; offset += 1) {
      const day = new Date();
      day.setDate(day.getDate() + offset);
      await chooseDate(page, isoDay(day));
      if ((await slotButtons(page).count()) >= 2) laterDay = isoDay(day);
    }
    expect(laterDay, "a day in the next week with two open pickup slots").not.toBe("");

    await pickPackage();
    const firstTime = (await slotButtons(page).nth(0).innerText()).slice(0, 5);
    const secondTime = (await slotButtons(page).nth(1).innerText()).slice(0, 5);
    const before = await remainingOf(page, firstTime);
    await slotButtons(page).nth(0).click();
    await page.getByRole("button", { name: "Confirm Pickup" }).click();
    await expect(page.getByText("Pickup scheduled successfully!")).toBeVisible();
    // Capacity for that slot drops by one.
    await expect.poll(() => remainingOf(page, firstTime)).toBe(before - 1);

    // Move it.
    await residentTab(page, "Home").click();
    await page.getByRole("button", { name: "Reschedule" }).click();
    await expect(page.getByRole("heading", { name: "Reschedule Pickup" })).toBeVisible();
    await expect(slotButtons(page).first()).toBeVisible();
    await slotButtons(page).filter({ hasText: secondTime }).click();
    await page.getByRole("button", { name: "Confirm Reschedule" }).click();
    await expect(page.getByText("Pickup rescheduled successfully!")).toBeVisible();
    await expect.poll(() => remainingOf(page, firstTime)).toBe(before);

    // Cancel it (the browser confirm dialog is accepted above).
    await page.getByRole("button", { name: "Cancel Pickup" }).click();
    await expect(page.getByText("Pickup cancelled successfully.")).toBeVisible();
    await expect(page.getByText("No pickups scheduled yet.")).toBeVisible();

    // Book again: the earliest open slot today, so the handoff can run now.
    await chooseDate(page, today);
    expect(
      await slotButtons(page).count(),
      "an open pickup slot today (the handoff needs the front desk to be open)",
    ).toBeGreaterThan(0);
    await pickPackage();
    await slotButtons(page).first().click();
    await page.getByRole("button", { name: "Confirm Pickup" }).click();
    await expect(page.getByText("Pickup scheduled successfully!")).toBeVisible();
  });

  await test.step("4. Staff see the booking and prepare the package", async () => {
    await openStaffSection(staff, "Today's Pickups");
    const booking = staff.locator("main").getByText(tracking).first();
    await expect(booking).toBeVisible();
    await expect(staff.getByText("Prepare the package before handoff.").first()).toBeVisible();

    await openStaffSection(staff, "Preparation Queue", { reload: false });
    await expect(staff.getByText(tracking).first()).toBeVisible();
    await expect(staff.getByText(location).first()).toBeVisible();
    // Newest booking for the slot in progress: this resident's card.
    const card = staff.locator("main div").filter({ hasText: tracking }).filter({ has: staff.getByRole("button", { name: "Mark Prepared" }) }).last();
    await card.getByRole("button", { name: "Mark Prepared" }).click();
    await expect(staff.locator("main").getByText(tracking)).toHaveCount(0);

    await openStaffSection(staff, "Today's Pickups", { reload: false });
    await expect(staff.getByText("Waiting for the resident to check in when they arrive.").first()).toBeVisible();
  });

  await test.step("5. Check-in, identity, sign-off and completion", async () => {
    await refreshResident(page, "Pickups");
    await page.getByRole("button", { name: "Check In" }).click();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible();
    await expect(page.getByText("Pending").first()).toBeVisible();

    await openStaffSection(staff, "Handoff");
    await expect(staff.getByText(resident.name).first()).toBeVisible();
    await expect(staff.getByText(location).first()).toBeVisible();
    await staff.getByRole("button", { name: "Verify Identity" }).click();
    await staff.getByRole("button", { name: "Sign Off" }).click();
    await expect(staff.getByLabel("Recipient name")).toHaveValue(resident.name);
    await staff.getByLabel("The recipient acknowledges receiving this package.").check();
    await staff.getByRole("button", { name: "Record Sign-off" }).click();
    await expect(staff.getByText("Signed for by")).toBeVisible();

    await staff.getByRole("button", { name: "Complete Pickup" }).click();
    const confirm = staff.getByRole("alertdialog");
    await expect(confirm).toContainText(tracking);
    await confirm.getByRole("button", { name: "Complete Pickup" }).click();
    await expect(staff.getByRole("heading", { name: "Pickup Confirmed" })).toBeVisible();

    // Audit trail on the package.
    await openStaffSection(staff, "Packages", { reload: false });
    await staff.getByPlaceholder(/Search name, tracking/).fill(tracking);
    const row = staff.getByRole("row").filter({ hasText: tracking });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("picked up");
    await row.click();
    const drawer = staff.getByRole("dialog");
    await expect(drawer.getByText("Audit History")).toBeVisible();
    for (const action of ["created", "signed off"]) {
      await expect(drawer.getByText(action, { exact: true }).first()).toBeVisible();
    }

    // The resident sees the receipt in their history.
    await refreshResident(page, "Pickups");
    const receipts = page.getByRole("heading", { name: "Package Picked Up" });
    await expect(receipts).toHaveCount(1);
    await expect(page.getByText(tracking)).toBeVisible();
    await expect(page.getByText("No pickups scheduled")).toBeVisible();
  });

  await staffContext.close();
  expect(problems, "console errors, hydration warnings or 5xx responses").toEqual([]);
});
