import { expect, test, type Browser, type Page } from '@playwright/test'
import { signUpLead, startPlanning } from './helpers'

// Runs against the linked Supabase project: every run creates a fresh facilitator account.

async function join(browser: Browser, code: string, name: string): Promise<Page> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`j/${code}`)
  await page.getByLabel('Имя').fill(name)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
  return page
}

test('votes stay hidden until reveal and flow through realtime', async ({ page, browser }) => {
  await signUpLead(page, 'room')
  const code = await startPlanning(page, 'Sprint E2E', 'E2E-1 First\nE2E-2 Second')

  const ann = await join(browser, code, 'Ann')
  const bob = await join(browser, code, 'Bob')
  await expect(page.getByText(/2 участников/)).toBeVisible()

  await page.getByRole('button', { name: 'Начать: E2E-1' }).click()
  await expect(ann.getByTestId('deck')).toBeVisible()
  await expect(bob.getByTestId('deck')).toBeVisible()

  await ann.getByRole('button', { name: '5', exact: true }).click()
  await expect(ann.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(ann.getByText('Ваш голос: 5', { exact: false })).toBeVisible()

  const seat = (name: string) => page.getByTestId('seat').filter({ hasText: name }).last()
  await expect(page.getByTestId('voted-count')).toHaveText('1 из 2 проголосовали')
  await expect(seat('Ann')).toHaveAttribute('data-voted', 'true')
  await expect(seat('Bob')).toHaveAttribute('data-voted', 'false')
  await expect(page.getByTestId('seat-card')).toHaveCount(0)
  await expect(bob.getByTestId('revealed')).toHaveCount(0)
  await expect(bob.getByText('Уже сдали: Ann')).toBeVisible()

  await page.screenshot({ path: 'test-results/room-voting.png', fullPage: true })
  await bob.setViewportSize({ width: 390, height: 844 })
  await bob.screenshot({ path: 'test-results/participant-deck.png' })

  await bob.getByRole('button', { name: '3', exact: true }).click()
  await expect(page.getByTestId('voted-count')).toHaveText('2 из 2 проголосовали')

  await page.getByRole('button', { name: 'Вскрыть карты' }).click()
  await expect(page.getByTestId('seat').filter({ hasText: 'Ann' }).getByTestId('seat-card')).toHaveText('5')
  await expect(page.getByTestId('seat').filter({ hasText: 'Bob' }).getByTestId('seat-card')).toHaveText('3')
  await expect(bob.getByTestId('revealed')).toContainText('Ann')
  await expect(bob.getByTestId('revealed')).toContainText('5')
  await page.screenshot({ path: 'test-results/room-revealed.png', fullPage: true })
  await bob.screenshot({ path: 'test-results/participant-revealed.png' })

  await page.getByRole('button', { name: 'Итог 5' }).click()
  await expect(page.getByText('E2E-2 · сейчас')).toBeVisible()
  await expect(ann.getByText('E2E-2', { exact: false })).toBeVisible()
  await expect(ann.getByTestId('deck')).toBeVisible()
  await page.goto('')
  await expect(page.getByText('Sprint E2E', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/home.png', fullPage: true })
})
