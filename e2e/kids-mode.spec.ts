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

  test('REQ-003.1: 儿童模式忽略常规模式遗留的搜索词', async ({ page }) => {
    await enterMenu(page)
    await page.getByPlaceholder('搜索锅底、菜品或饮品').fill('鎏金')
    await expect(page.locator('article')).toHaveCount(1)

    await enableKids(page)
    await expect(page.getByPlaceholder('搜索锅底、菜品或饮品')).not.toBeVisible()
    // 搜索框已隐藏，菜单不应继续被不可见的搜索条件过滤
    expect(await page.locator('article').count()).toBeGreaterThan(1)
    await expect(page.getByText('儿童友好').first()).toBeVisible()
  })

  test('REQ-010.1: ?preview=kids 直达儿童模式且不写入持久化状态', async ({ page }) => {
    await page.goto('/?preview=kids')

    await expect(page.locator('html')).toHaveClass(/kids/)
    await expect(page.getByText('小朋友专属点餐')).toBeVisible()
    await expect(page.getByText('琥珀嫩牛肉').first()).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kids-mode'))).toBeNull()
  })

  test('NFR-001: 移动端顶部栏收敛后会员入口仍可达（R-01）', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await enterMenu(page)

    await page.getByRole('button', { name: '会员' }).click()
    await expect(page.getByText('会员与排号')).toBeVisible()
    await expect(page.getByText('当前排号')).toBeVisible()
    await page.keyboard.press('Escape')

    await enableKids(page)
    await page.getByRole('button', { name: '会员' }).click()
    await expect(page.getByText('会员与排号')).toBeVisible()
  })

  test('NFR-002: 移动端儿童模式无横向溢出且入口可见', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await enterMenu(page)
    await enableKids(page)

    await expect(page.getByRole('button', { name: '关闭儿童模式' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('NFR-003: 儿童模式关键触控目标不小于 44px / 52px', async ({ page }) => {
    await enterMenu(page)
    await enableKids(page)

    const addButton = page.locator('article').first().locator('button').last()
    await expect.poll(async () => (await addButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)

    await addButton.click()
    const cta = page.getByRole('button', { name: '加入本桌购物车' })
    await expect.poll(async () => (await cta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(52)
  })
})
