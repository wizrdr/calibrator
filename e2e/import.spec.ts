import { expect, test, type Page } from '@playwright/test'

async function signUpLead(page: Page) {
  await page.goto('')
  await page.getByRole('button', { name: /Зарегистрироваться/ }).click()
  await page.getByLabel('Email').fill(`e2e-import-${Date.now()}@calibrator.test`)
  await page.getByLabel('Пароль').fill('E2e-passw0rd')
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page.getByRole('heading', { name: 'Команды' })).toBeVisible()
}

test('Jira CSV import matches issues by key and reports coverage', async ({ page }) => {
  await signUpLead(page)
  await page.getByLabel('Новая команда').fill('Import team')
  await page.getByRole('button', { name: 'Создать' }).click()
  await page.getByRole('link', { name: 'Import team' }).click()
  await page.getByLabel('Спринт').fill('Sprint 1')
  await page.getByLabel(/Задачи/).fill('IMP-1 One\nIMP-2 Two\nIMP-3 Three')
  await page.getByRole('button', { name: 'Создать сессию' }).click()
  await expect(page.getByRole('heading', { name: 'Sprint 1' })).toBeVisible()

  await page.getByRole('link', { name: '← команда' }).click()
  await page.getByRole('link', { name: 'Импорт факта' }).click()
  await expect(page.getByText('3 оценённых')).toBeVisible()

  const csv = [
    'Summary,Issue key,Status,Custom field (Story Points),Time Spent,Sprint,Sprint,Resolved',
    'One,IMP-1,Done,3,10800,Sprint 1,,05/Sep/26 10:12 AM',
    'Two,IMP-2,Done,5,,Sprint 1,Sprint 2,',
    'Other,IMP-9,Done,1,3600,Sprint 1,,',
  ].join('\n')
  await page.getByTestId('csv').setInputFiles({ name: 'jira.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })

  await expect(page.getByTestId('coverage')).toHaveText('33%')
  await expect(page.getByText('IMP-3')).toBeVisible()
  await expect(page.getByText('IMP-9')).toBeVisible()
  await page.getByRole('button', { name: 'Применить к 2 задачам' }).click()
  await expect(page).toHaveURL(/\/report$/)
})
