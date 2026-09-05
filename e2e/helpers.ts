import { expect, type Page } from '@playwright/test'

export async function signUpLead(page: Page, tag: string) {
  await page.goto('')
  await page.getByRole('button', { name: /Зарегистрироваться/ }).click()
  await page.getByLabel('Email').fill(`e2e-${tag}-${Date.now()}@calibrator.test`)
  await page.getByLabel('Пароль').fill('E2e-passw0rd')
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()
  await expect(page.getByRole('heading', { name: 'Планирования' })).toBeVisible()
}

export async function startPlanning(page: Page, sprint: string, issues: string): Promise<string> {
  await page.getByRole('link', { name: 'Новое планирование' }).click()
  await page.getByLabel('Спринт').fill(sprint)
  await page.getByLabel(/Задачи/).fill(issues)
  await page.getByRole('button', { name: /Начать планирование/ }).click()
  await expect(page.getByRole('heading', { name: sprint })).toBeVisible()
  return (await page.getByTestId('join-code').textContent())!.trim()
}
