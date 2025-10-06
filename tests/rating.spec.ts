import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_PASSWORD || 'password123';

test('Рейтинг: добавление нарушения через модалку', async ({ page }) => {
  // Логин
  await page.goto('/login');
  await page.getByTestId('input-email').fill(ADMIN_EMAIL);
  await page.getByTestId('input-password').fill(ADMIN_PASSWORD);
  await page.getByTestId('button-submit').click();

  // Должны попасть на главную
  await page.waitForURL('**/');

  // Переходим на рейтинг
  await page.goto('/rating');

  // Ждём карточки рейтинга
  const firstCard = page.locator('[data-testid^="rating-card-"]').first();
  await expect(firstCard).toBeVisible();

  // Нажимаем "Добавить нарушение"
  const addBtn = firstCard.getByTestId(/button-add-violation-/);
  await addBtn.click();

  // Выбираем правило
  await page.getByText('Тип нарушения').scrollIntoViewIfNeeded();
  await page.locator('[role="combobox"]').click();
  // Берем первый пункт в списке (правила должны быть заведены)
  const firstOption = page.locator('[role="option"]').first();
  await firstOption.click();

  // Комментарий
  await page.getByPlaceholder('Описание нарушения (необязательно)').fill('e2e тест');

  // Сабмит
  await page.getByRole('button', { name: 'Добавить нарушение' }).click();

  // Проверяем, что модалка закрылась (нет overlay)
  await expect(page.locator('text=Добавить нарушение для').first()).toHaveCount(0);
});


