import { expect, test, type Browser, type Page } from '@playwright/test'

// Runs against the linked Supabase project: every run creates a fresh facilitator account.

async function signUpLead(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Зарегистрироваться/ }).click()
  await page.getByLabel('Email').fill(`e2e-${Date.now()}@calibrator.test`)
  await page.getByLabel('Пароль').fill('E2e-passw0rd')
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page.getByRole('heading', { name: 'Команды' })).toBeVisible()
}

async function createSession(page: Page): Promise<string> {
  await page.getByLabel('Новая команда').fill('E2E team')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.getByRole('link', { name: 'E2E team' }).click()
  await page.getByLabel('Спринт').fill('Sprint E2E')
  await page.getByLabel(/Задачи/).fill('E2E-1 First\nE2E-2 Second')
  await page.getByRole('button', { name: 'Создать сессию' }).click()
  await expect(page.getByRole('heading', { name: 'Sprint E2E' })).toBeVisible()
  const code = await page.locator('span.font-mono.text-lg').textContent()
  return code!.trim()
}

async function join(browser: Browser, code: string, name: string): Promise<Page> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`/j/${code}`)
  await page.getByLabel('Имя').fill(name)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
  return page
}

test('votes stay hidden until reveal and flow through realtime', async ({ page, browser }) => {
  await signUpLead(page)
  const code = await createSession(page)

  const ann = await join(browser, code, 'Ann')
  const bob = await join(browser, code, 'Bob')
  await expect(page.getByText('Участников: 2')).toBeVisible()

  await page.getByRole('button', { name: 'Начать: E2E-1' }).click()
  await expect(ann.getByTestId('deck')).toBeVisible()
  await expect(bob.getByTestId('deck')).toBeVisible()

  await ann.getByRole('button', { name: '5', exact: true }).click()
  await expect(ann.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-pressed', 'true')

  const annSeat = page.getByTestId('seat').filter({ hasText: 'Ann' })
  const bobSeat = page.getByTestId('seat').filter({ hasText: 'Bob' })
  await expect(annSeat.getByTestId('seat-card')).toHaveText('✓')
  await expect(bobSeat.getByTestId('seat-card')).toHaveText('…')
  await expect(bob.getByTestId('revealed')).toHaveCount(0)

  await bob.getByRole('button', { name: '3', exact: true }).click()
  await expect(bobSeat.getByTestId('seat-card')).toHaveText('✓')

  await page.getByRole('button', { name: 'Вскрыть' }).click()
  await expect(annSeat.getByTestId('seat-card')).toHaveText('5')
  await expect(bobSeat.getByTestId('seat-card')).toHaveText('3')
  await expect(bob.getByTestId('revealed')).toContainText('Ann')
  await expect(bob.getByTestId('revealed')).toContainText('5')

  await page.getByRole('button', { name: '5', exact: true }).click()
  await expect(page.getByText('E2E-2')).toBeVisible()
  await expect(ann.getByText('E2E-2')).toBeVisible()
  await expect(ann.getByTestId('deck')).toBeVisible()
})
