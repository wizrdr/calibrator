import { expect, test } from '@playwright/test'
import { signUpLead, startPlanning } from './helpers'

test('Jira CSV import matches issues by key and reports coverage', async ({ page }) => {
  await signUpLead(page, 'import')
  await startPlanning(page, 'Sprint 1', 'IMP-1 One\nIMP-2 Two\nIMP-3 Three')

  await page.getByRole('link', { name: 'Факт из Jira' }).click()
  await expect(page.getByText(/с 3 задачами/)).toBeVisible()

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
  await expect(page).toHaveURL(/\/calibration$/)
})
