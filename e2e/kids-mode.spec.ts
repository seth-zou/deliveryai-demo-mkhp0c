import { test, expect, type Page } from '@playwright/test'

/** 从首页绑定 A08 桌台并进入点餐视图（menu）。 */
async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
}

async function enableKids(page: Page) {
  await page.getByRole('button', { name: '开启儿童模式' }).click()
}

test.describe('儿童模式 - E2E 验收测试', () => {
  test('REQ-001: 顶栏儿童模式入口可见，开启后有状态反馈并持久化', async ({ page }) => {
    await enterMenu(page)
    await expect(page.getByRole('button', { name: '开启儿童模式' })).toBeVisible()
    await enableKids(page)

    await expect(page.locator('html')).toHaveClass(/kids/)
    await expect(page.getByRole('button', { name: '关闭儿童模式' })).toBeVisible()
    await expect(page.getByText('儿童模式已开启 · 已为小朋友简化界面，家长可随时关闭')).toBeVisible()
    await expect(page.getByText('小朋友专属点餐')).toBeVisible()
    await expect(page.getByPlaceholder('搜索锅底、菜品或饮品')).not.toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kids-mode'))).toBe('true')
  })

  test('REQ-002: 儿童模式刷新后保持开启', async ({ page }) => {
    await enterMenu(page)
    await enableKids(page)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/kids/)
    await expect(page.getByText('儿童模式已开启 · 已为小朋友简化界面，家长可随时关闭')).toBeVisible()
  })

  test('REQ-003: 儿童模式下超级辣不可选，其他辣度仍可选', async ({ page }) => {
    await enterMenu(page)
    await enableKids(page)
    await page.getByRole('button', { name: '锅底' }).click()
    await page.locator('article').first().locator('button').last().click()

    await expect(page.getByRole('button', { name: '微辣' })).toBeVisible()
    await expect(page.getByRole('button', { name: '中辣' })).toBeVisible()
    await expect(page.getByRole('button', { name: '超级辣' })).not.toBeVisible()
    await expect(page.getByText('儿童模式下已隐藏「超级辣」，家长可协助选择微辣或中辣。').first()).toBeVisible()

    await page.getByRole('button', { name: '中辣' }).click()
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await expect(page.getByText('中辣').first()).toBeVisible()
    await expect(page.getByText('客户已确认风险')).not.toBeVisible()
  })

  test('REQ-004: 关闭儿童模式后恢复超级辣选项与风险提示', async ({ page }) => {
    await enterMenu(page)
    await enableKids(page)
    await page.getByRole('button', { name: '关闭儿童模式' }).click()
    await expect(page.locator('html')).not.toHaveClass(/kids/)

    await page.getByRole('button', { name: '锅底' }).click()
    await page.locator('article').first().locator('button').last().click()
    await page.getByRole('button', { name: '超级辣' }).click()
    await expect(page.getByText('风险提示')).toBeVisible()
  })

  test('REQ-005: 购物车已有超级辣时，开启儿童模式需家长确认移除', async ({ page }) => {
    await enterMenu(page)
    await page.getByRole('button', { name: '锅底' }).click()
    await page.locator('article').first().locator('button').last().click()
    await page.getByRole('button', { name: '超级辣' }).click()
    await page.getByRole('button', { name: '我已了解，继续下单' }).click()
    await page.getByRole('button', { name: '加入本桌购物车' }).click()

    await enableKids(page)
    await expect(page.getByText('购物车里有超级辣菜品')).toBeVisible()
    await page.getByRole('button', { name: '移除并开启儿童模式' }).click()

    await expect(page.locator('html')).toHaveClass(/kids/)
    await expect(page.getByText('这一锅，还差点心动')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kids-mode'))).toBe('true')
  })

  test('REQ-006: 儿童模式与老人模式可独立开关并叠加生效', async ({ page }) => {
    await enterMenu(page)
    await enableKids(page)
    await page.getByRole('button', { name: '开启老人模式' }).click()

    await expect(page.locator('html')).toHaveClass(/kids/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
    await expect(page.getByText('儿童模式与老人模式已同时开启 · 字号按老人模式显示')).toBeVisible()

    await page.getByRole('button', { name: '关闭老人模式' }).click()
    await expect(page.locator('html')).not.toHaveClass(/elderly/)
    await expect(page.locator('html')).toHaveClass(/kids/)
  })

  test('REQ-007: 儿童模式中英文文案同步切换', async ({ page }) => {
    await enterMenu(page)
    await enableKids(page)
    await page.getByRole('button', { name: '切换语言' }).click()

    await expect(page.getByText('Kids Mode is on · The menu is simplified for children. Parents can turn it off anytime.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Turn off Kids Mode' })).toBeVisible()
    await expect(page.getByText('Kids ordering')).toBeVisible()
  })

  test('REQ-008: 儿童模式可完成点餐、提交订单和结账主流程', async ({ page }) => {
    await enterMenu(page)
    await enableKids(page)

    await page.locator('article').first().locator('button').last().click()
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await page.getByRole('button', { name: '确认并提交订单' }).click()
    await expect(page.getByRole('heading', { name: '这一锅，正在抵达' })).toBeVisible()

    await page.getByRole('button', { name: '去结账' }).click()
    await expect(page.getByRole('heading', { name: '核对本桌账单' })).toBeVisible()
    await page.getByRole('button', { name: /确认支付/ }).click()
    await expect(page.getByRole('heading', { name: '付款完成' })).toBeVisible()
  })

  test('REQ-009: localStorage 不可用时儿童模式降级为内存态且不报错', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.addInitScript(() => {
      Storage.prototype.getItem = function () { throw new Error('storage blocked') }
      Storage.prototype.setItem = function () { throw new Error('storage blocked') }
    })

    await enterMenu(page)
    await enableKids(page)
    await expect(page.locator('html')).toHaveClass(/kids/)
    await expect(page.getByText('儿童模式已开启 · 已为小朋友简化界面，家长可随时关闭')).toBeVisible()
    expect(pageErrors).toEqual([])
  })

  test('REQ-010: 常规模式默认关闭且超级辣流程不受影响', async ({ page }) => {
    await enterMenu(page)
    await expect(page.locator('html')).not.toHaveClass(/kids/)
    await expect(page.getByRole('button', { name: '开启儿童模式' })).toBeVisible()

    await page.getByRole('button', { name: '锅底' }).click()
    await page.locator('article').first().locator('button').last().click()
    await page.getByRole('button', { name: '超级辣' }).click()
    await expect(page.getByText('风险提示')).toBeVisible()
  })
})
