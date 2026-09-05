import { expect, test, type Page } from '@playwright/test'
import { generateSynthetic } from '../src/domain/synthetic'
import { toJiraCsv } from '../src/domain/jiraCsv'
import { DEMO_PARAMS } from '../src/features/generator/GeneratorPage'

async function signUpLead(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Зарегистрироваться/ }).click()
  await page.getByLabel('Email').fill(`e2e-synth-${Date.now()}@calibrator.test`)
  await page.getByLabel('Пароль').fill('E2e-passw0rd')
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page.getByRole('heading', { name: 'Команды' })).toBeVisible()
}

// The decisive check: synthetic sessions with known biases → Jira-shaped CSV → report labels.
test('report recovers the injected biases end to end', async ({ page }) => {
  await signUpLead(page)
  await page.getByLabel('Новая команда').fill('Synthetic team')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.getByRole('link', { name: 'Synthetic team' }).click()
  await page.getByRole('link', { name: 'Синтетика' }).click()

  await page.getByRole('button', { name: 'Создать сессии' }).click()
  await expect(page.getByTestId('seeded')).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: 'К импорту →' }).click()
  await expect(page.getByText('72 оценённых')).toBeVisible()
  const csv = toJiraCsv(generateSynthetic(DEMO_PARAMS).jiraRows)
  await page.getByTestId('csv').setInputFiles({ name: 'synthetic.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.getByTestId('coverage')).toHaveText(/^8\d%$/)
  await page.getByRole('button', { name: /Применить к 72 задачам/ }).click()

  await expect(page).toHaveURL(/\/report$/)
  const fact = page.getByTestId('bias-fact')
  const label = (name: string) => fact.getByTestId('bias-row').filter({ hasText: name }).getByTestId('bias-label')
  await expect(label('Ann')).toHaveText(/^занижает в 1\.[4-9]×$/)
  await expect(label('Bob')).toHaveText(/^калиброван/)
  await expect(label('Cid')).toHaveText(/^завышает в 1\.[3-8]×$/)
})
