import { expect, test } from '@playwright/test'
import { signUpLead } from './helpers'

// The decisive check: example data with known biases must come out as the right labels.
test('the example team shows the injected biases in the calibration report', async ({ page }) => {
  await signUpLead(page, 'demo')
  await page.getByRole('link', { name: 'Калибровка команды' }).click()
  await expect(page.getByText('Пока нечего калибровать')).toBeVisible()

  await page.getByTestId('demo').click()
  const fact = page.getByTestId('bias-fact')
  await expect(fact).toBeVisible({ timeout: 45_000 })
  const label = (name: string) => fact.getByTestId('bias-row').filter({ hasText: name }).getByTestId('bias-label')
  await expect(label('Ann')).toHaveText(/^занижает в 1\.[4-9]×$/)
  await expect(label('Bob')).toHaveText(/^калиброван/)
  await expect(label('Cid')).toHaveText(/^завышает в 1\.[3-8]×$/)
  await expect(page.getByTestId('coverage')).toContainText(/из 72/)
  await page.screenshot({ path: 'test-results/report.png', fullPage: true })
})
