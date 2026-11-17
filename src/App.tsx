import { useCallback, useEffect, useReducer, useState } from 'react'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { Baby, ClipboardList, ConciergeBell, LayoutDashboard, Menu as MenuIcon, ShieldCheck, ShoppingBasket } from 'lucide-react'
import { HomeView } from '@/components/HomeView'
import { WelcomeView } from '@/components/WelcomeView'
import { CartPanel } from '@/components/CartPanel'
import { CheckoutView } from '@/components/CheckoutView'
import { DemoConsole } from '@/components/DemoConsole'
import { MenuView } from '@/components/MenuView'
import { OrderView } from '@/components/OrderView'
import { ServiceSheet } from '@/components/ServiceSheet'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useElderlyMode } from '@/hooks/useElderlyMode'
import { useKidsMode } from '@/hooks/useKidsMode'
import { initialViewFromHash, useViewRoute } from '@/hooks/useViewRoute'
import { orderReducer, initialState } from '@/state/orderReducer'
import { products } from '@/data/menu'
import { money } from '@/lib/utils'
import type { AppState, ViewName } from '@/types'

function createInitialState(): AppState {
  const search = new URLSearchParams(window.location.search)
  const requestedView = initialViewFromHash()

  // preview=menu：预置一桌带购物车的点餐态，供设计/截图预览
  // preview=kids：直接进入儿童模式菜单预览（useKidsMode 同步识别该参数）
  const preview = search.get('preview')
  if (preview === 'menu' || preview === 'kids') {
    const product = preview === 'kids' ? products.find((item) => item.id === 'p3')! : products[2]
    const spec = [i18next.t('menu.option.full'), i18next.t('menu.option.original')].join(' · ')
    return {
      ...initialState,
      table: 'A08',
      view: 'menu',
      cart: [{ uid: 'preview-item', productId: product.id, name: i18next.t(product.name), price: product.price, quantity: 1, image: product.image, spec, orderedBy: '姚乾' }],
      lastMessage: preview === 'kids' ? i18next.t('message.kids_on') : initialState.lastMessage,
    }
  }

  // 深链接：直接以 #/welcome 等地址打开时，先绑定示例桌台再进入对应视图；
  // home 无需桌台，其余流程视图（welcome/menu/order/checkout）需要桌台上下文。
  if (requestedView && requestedView !== 'home') {
    return { ...initialState, table: 'A08', view: requestedView }
  }

  return initialState
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [state, dispatch] = useReducer(orderReducer, undefined, createInitialState)
  const { enabled: elderly, toggle: toggleElderly } = useElderlyMode()
  const { enabled: kids, setEnabled: setKids } = useKidsMode()
  const [serviceOpen, setServiceOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [kidsGuardOpen, setKidsGuardOpen] = useState(false)
  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const waitingServices = state.services.filter((service) => service.status === 'waiting').length
  const kidsUnsafeCartItems = state.cart.filter((item) => item.kidsUnsafe)

  // 视图 ↔ URL hash 双向同步；未绑定桌台时只有 home 可达，其余地址回落到 home
  const canView = useCallback((view: ViewName) => view === 'home' || !!state.table, [state.table])
  const navigate = useCallback((view: ViewName) => dispatch({ type: 'SET_VIEW', view }), [])
  useViewRoute(state.view, { onNavigate: navigate, canView })

  useEffect(() => {
    document.documentElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en'
    document.title = t('common.title')
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', t('common.meta_desc'))
    try {
      localStorage.setItem('i18nextLng', i18n.language)
    } catch {
      // localStorage 不可用时降级为内存态，不报错不阻塞
    }
  }, [i18n.language, t])

  const changeView = (view: ViewName) => dispatch({ type: 'SET_VIEW', view })
  const submitOrder = () => {
    dispatch({ type: 'SUBMIT_ORDER' })
    setCartOpen(false)
  }
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  }
  const handleToggleElderly = () => {
    toggleElderly()
    dispatch({ type: 'SET_MESSAGE', message: elderly ? t('message.elderly_off') : t('message.elderly_on') })
  }
  const handleToggleKids = () => {
    if (kids) {
      setKids(false)
      dispatch({ type: 'SET_MESSAGE', message: t('message.kids_off') })
      return
    }
    // 购物车已有超级辣时，先让家长确认移除，再开启儿童模式
    if (kidsUnsafeCartItems.length > 0) {
      setKidsGuardOpen(true)
      return
    }
    setKids(true)
    dispatch({ type: 'SET_MESSAGE', message: t('message.kids_on') })
  }
  const confirmEnableKids = () => {
    kidsUnsafeCartItems.forEach((item) => dispatch({ type: 'REMOVE_CART', uid: item.uid }))
    setKids(true)
    setKidsGuardOpen(false)
    dispatch({ type: 'SET_MESSAGE', message: t('message.kids_unsafe_removed') })
  }

  if (state.view === 'home' || !state.table) {
    return <HomeView onBind={(table) => dispatch({ type: 'BIND_TABLE', table })} />
  }

  if (state.view === 'welcome') {
    return <WelcomeView table={state.table!} onEnter={() => dispatch({ type: 'SET_VIEW', view: 'menu' })} />
  }

  return (
    <div className="min-h-screen bg-rice-100 paper-noise">
      <TopBar
        table={state.table}
        view={state.view}
        serviceCount={waitingServices}
        language={i18n.language}
        elderly={elderly}
        kids={kids}
        onToggleLanguage={toggleLanguage}
        onToggleElderly={handleToggleElderly}
        onToggleKids={handleToggleKids}
        onView={changeView}
        onService={() => setServiceOpen(true)}
        onConsole={() => setConsoleOpen(true)}
      />

      {kids && (
        <div className="mx-auto max-w-7xl px-4 pt-3 lg:px-6">
          <div className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-100/90 px-4 py-3 text-sm font-bold text-charcoal-700" role="status">
            {elderly ? <ShieldCheck size={18} className="shrink-0 text-amber-500" /> : <Baby size={18} className="shrink-0 text-amber-500" />}
            <span>{elderly ? t('common.kids_elderly_active') : t('common.kids_active')}</span>
          </div>
        </div>
      )}

      {state.view === 'menu' && (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-5 pb-28 lg:grid-cols-3 lg:px-6 lg:py-7 lg:pb-8">
          <div className="lg:col-span-2">
            <MenuView diners={state.diners} soldOut={state.soldOut} kids={kids} onAdd={(item) => dispatch({ type: 'ADD_CART', item })} />
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <CartPanel items={state.cart} kids={kids} onQuantity={(uid, delta) => dispatch({ type: 'CHANGE_QTY', uid, delta })} onSubmit={submitOrder} />
              {!kids && (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-100/70 p-4 text-sm text-charcoal-700">
                  <p className="font-bold">{t('common.collab_title')}</p>
                  <p className="mt-1 leading-6 text-charcoal-500">{t('common.collab_desc')}</p>
                </div>
              )}
            </div>
          </aside>
        </main>
      )}

      {state.view === 'order' && (
        <OrderView
          items={state.orderItems}
          stage={state.orderStage}
          onAddMore={() => changeView('menu')}
          onCancel={(uid) => dispatch({ type: 'REQUEST_CANCEL', uid })}
          onCheckout={() => changeView('checkout')}
        />
      )}

      {state.view === 'checkout' && (
        <CheckoutView items={state.orderItems} paid={state.paid} onPay={() => dispatch({ type: 'PAY' })} onBack={() => changeView('order')} />
      )}

      <ServiceSheet open={serviceOpen} requests={state.services} onOpenChange={setServiceOpen} onCall={(service) => dispatch({ type: 'CALL_SERVICE', service })} />
      <DemoConsole
        open={consoleOpen}
        table={state.table}
        stage={state.orderStage}
        soldOut={state.soldOut}
        services={state.services}
        onOpenChange={setConsoleOpen}
        onStage={(stage) => dispatch({ type: 'SET_STAGE', stage })}
        onSoldOut={(productId) => dispatch({ type: 'TOGGLE_SOLD_OUT', productId })}
        onRespond={() => dispatch({ type: 'RESPOND_SERVICES' })}
        onReset={() => { dispatch({ type: 'RESET' }); setConsoleOpen(false) }}
      />

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent title={t('cart.dialog_title')}>
          <div className="mt-5"><CartPanel compact kids={kids} items={state.cart} onQuantity={(uid, delta) => dispatch({ type: 'CHANGE_QTY', uid, delta })} onSubmit={submitOrder} /></div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 lg:hidden">
        {state.view === 'menu' && state.cart.length > 0 && (
          <Button onClick={() => setCartOpen(true)} className="h-12 rounded-full px-5 shadow-float">
            <span className="relative"><ShoppingBasket size={19} /><span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-xs text-charcoal-900">{state.cart.length}</span></span>
            {t('common.view_cart')} · {money(cartTotal)}
          </Button>
        )}
      </div>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-charcoal-900/5 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
        <MobileNav active={state.view === 'menu'} icon={MenuIcon} label={t('common.nav_menu')} onClick={() => changeView('menu')} />
        <MobileNav active={state.view === 'order'} icon={ClipboardList} label={t('common.nav_order')} onClick={() => changeView('order')} />
        <MobileNav active={serviceOpen} icon={ConciergeBell} label={t('common.nav_service')} badge={waitingServices} onClick={() => setServiceOpen(true)} />
        <MobileNav active={consoleOpen} icon={LayoutDashboard} label={t('common.nav_demo')} onClick={() => setConsoleOpen(true)} />
      </nav>

      <Dialog open={kidsGuardOpen} onOpenChange={setKidsGuardOpen}>
        <DialogContent title={t('cart.kids_guard_title')}>
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm leading-6 text-charcoal-700">{t('cart.kids_guard_desc')}</p>
            <ul className="space-y-2 rounded-2xl bg-rice-100 p-3 text-sm">
              {kidsUnsafeCartItems.map((item) => (
                <li key={item.uid} className="flex items-center justify-between gap-3 font-bold text-charcoal-900">
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 text-xs text-chili-600">{item.spec}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setKidsGuardOpen(false)}>{t('cart.kids_guard_cancel')}</Button>
              <Button className="flex-1" onClick={confirmEnableKids}>{t('cart.kids_guard_remove')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2 rounded-full bg-charcoal-900/90 px-4 py-2 text-xs font-semibold text-white shadow-float">
        {state.lastMessage}
      </div>
    </div>
  )
}

function MobileNav({ active, icon: Icon, label, badge, onClick }: { active: boolean; icon: typeof MenuIcon; label: string; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition ${active ? 'bg-chili-50 text-chili-500' : 'text-charcoal-500'}`}>
      <Icon size={20} />{label}{badge ? <span className="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-chili-500 px-1 text-white">{badge}</span> : null}
    </button>
  )
}
