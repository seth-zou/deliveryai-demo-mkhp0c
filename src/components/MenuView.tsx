import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Baby, Check, Flame, Plus, Search, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { categories, products } from '@/data/menu'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { money, uid } from '@/lib/utils'
import type { CartItem, Product } from '@/types'

interface MenuViewProps {
  diners: string[]
  soldOut: string[]
  kids: boolean
  onAdd: (item: CartItem) => void
}

export function MenuView({ diners, soldOut, kids, onAdd }: MenuViewProps) {
  const { t } = useTranslation()
  const [category, setCategory] = useState('menu.cat.recommend')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [portion, setPortion] = useState('menu.option.full')
  const [flavor, setFlavor] = useState('')
  const [spicy, setSpicy] = useState('menu.option.mild')
  const [showRiskWarning, setShowRiskWarning] = useState(false)
  const [diner, setDiner] = useState(diners[0])

  const handleSpicyChange = (option: string) => {
    // 儿童模式下超级辣不渲染；这里再次拦截，防止键盘/程序触发
    if (kids && option === 'menu.option.super_spicy') return
    if (option === 'menu.option.super_spicy') {
      setShowRiskWarning(true)
    } else {
      setSpicy(option)
    }
  }

  const confirmSuperSpicy = () => {
    setSpicy('menu.option.super_spicy')
    setShowRiskWarning(false)
  }

  const cancelSuperSpicy = () => {
    setShowRiskWarning(false)
  }

  const visible = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchCategory = category === 'menu.cat.recommend' || product.category === category
      const productName = t(product.name)
      const productDesc = t(product.description)
      // 儿童模式隐藏搜索框：忽略常规模式下遗留的搜索词，避免“看不见的过滤条件”
      const matchSearch = kids || productName.includes(search) || productDesc.includes(search)
      return matchCategory && matchSearch
    })
    // 儿童模式：儿童友好菜品优先展示，不改变原有分类与数据
    if (kids) {
      filtered.sort((a, b) => Number(Boolean(b.kidFriendly)) - Number(Boolean(a.kidFriendly)))
    }
    return filtered
  }, [category, search, t, kids])

  const openSpec = (product: Product) => {
    setSelected(product)
    setPortion(product.options?.portion?.[1] || product.options?.portion?.[0] || '')
    setFlavor(product.options?.flavor?.[0] || '')
    setSpicy(getSpicyOptions(product, kids)[0] || '')
  }

  const addSelected = () => {
    if (!selected) return
    const portionFactor = portion === 'menu.option.half' ? 0.58 : 1
    const specParts = [portion, flavor, spicy].filter(Boolean).map((key) => t(key))
    if (spicy === 'menu.option.super_spicy') {
      specParts.push(t('cart.confirmed_risk'))
    }
    const spec = specParts.join(' · ') || t('menu.standard')
    onAdd({ uid: uid(), productId: selected.id, name: t(selected.name), price: Math.round(selected.price * portionFactor), quantity: 1, image: selected.image, spec, orderedBy: diner, kidsUnsafe: spicy === 'menu.option.super_spicy' })
    setSelected(null)
  }

  return (
    <section className="min-w-0">
      <div className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-card sm:p-7 ${kids ? 'bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-chili-700' : 'bg-charcoal-900'}`}>
        <div className={`absolute -right-10 -top-20 h-56 w-56 rounded-full blur-3xl ${kids ? 'bg-amber-400/35' : 'bg-chili-500/30'}`} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="flex items-center gap-2 text-xs font-bold text-amber-400">
              {kids ? <Baby size={15} /> : <Sparkles size={14} />}
              {kids ? t('menu.kids_hero_badge') : t('menu.hero_badge')}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{kids ? t('menu.kids_hero_title') : t('menu.hero_title')}</h1>
            <p className="mt-2 text-sm text-rice-200">{kids ? t('menu.kids_hero_desc') : t('menu.hero_diners', { count: diners.length })}</p>
          </div>
          {kids ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-charcoal-900">
              <ShieldCheck size={17} />{t('common.kids_mode')}
            </span>
          ) : (
            <div className="flex -space-x-2">{diners.map((name, index) => <span key={name} title={name} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-charcoal-900 text-xs font-bold ${index === 0 ? 'bg-chili-500' : index === 1 ? 'bg-amber-400 text-charcoal-900' : 'bg-rice-200 text-charcoal-900'}`}>{name.slice(0, 1)}</span>)}</div>
          )}
        </div>
      </div>

      {kids && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-100/80 p-4 text-sm text-charcoal-700" role="note">
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="leading-6">{t('menu.kids_spicy_hidden')}</p>
        </div>
      )}

      <div className={`sticky top-24 z-20 -mx-4 bg-rice-100/95 px-4 pb-3 backdrop-blur lg:mx-0 lg:px-0 ${kids ? 'mt-4' : 'mt-5'}`}>
        {!kids && <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-500" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('menu.search_placeholder')} className="h-12 w-full rounded-2xl border border-charcoal-900/5 bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-chili-500/30 focus:ring-4 focus:ring-chili-50" /></div>}
        <div className={`scrollbar-none flex gap-2 overflow-x-auto pb-1 ${kids ? '' : 'mt-3'}`}>
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full font-bold transition ${kids ? 'px-5 py-3 text-base' : 'px-4 py-2 text-sm'} ${category === item ? 'bg-chili-500 text-white shadow-md' : 'bg-white text-charcoal-500 hover:text-chili-500'}`}>{t(item)}</button>)}
        </div>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {visible.map((product, index) => {
          const unavailable = soldOut.includes(product.id)
          return (
            <article key={product.id} className="group animate-rise overflow-hidden rounded-3xl border border-charcoal-900/5 bg-white shadow-card transition hover:-translate-y-1" style={{ animationDelay: `${index * 40}ms` }}>
              <div className="relative h-40 overflow-hidden">
                <img src={product.image} alt={t(product.name)} className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${unavailable ? 'grayscale' : ''}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/45 to-transparent" />
                {product.badge && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-charcoal-900">{t(product.badge)}</span>}
                {kids && product.kidFriendly && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold text-chili-600 shadow-sm"><Baby size={13} />{t('menu.kids_friendly')}</span>}
                {unavailable && <span className="absolute inset-0 flex items-center justify-center bg-white/55 text-lg font-extrabold text-charcoal-900 backdrop-blur-sm">{t('menu.sold_out')}</span>}
                {product.orderedCount && <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-chili-600"><Check size={13} />{t('menu.ordered_table', { count: product.orderedCount })}</span>}
              </div>
              <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold text-charcoal-900">{t(product.name)}</h3><p className="mt-1 line-clamp-1 text-xs text-charcoal-500">{t(product.description)}</p></div><Button size="icon" disabled={unavailable} onClick={() => openSpec(product)} className={`shrink-0 rounded-full ${kids ? 'h-12 w-12' : 'h-10 w-10'}`}><Plus size={kids ? 22 : 18} /></Button></div><p className="mt-4 text-xl font-extrabold text-chili-500">{money(product.price)} <small className="text-xs font-medium text-charcoal-500">{t('menu.from')}</small></p></div>
            </article>
          )
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setShowRiskWarning(false) } }}>
        <DialogContent title={selected ? t(selected.name) : ''}>
          {selected && <>
            <div className="mt-4 flex gap-4 rounded-2xl bg-white p-3"><img src={selected.image} alt={t(selected.name)} className="h-24 w-24 rounded-xl object-cover" /><div><p className="text-sm leading-6 text-charcoal-500">{t(selected.description)}</p><p className="mt-2 text-xl font-extrabold text-chili-500">{money(selected.price)} <small className="text-xs font-medium text-charcoal-500">{t('menu.from')}</small></p></div></div>
            {selected.options?.portion && <OptionRow label={t('menu.select_portion')} options={selected.options.portion} value={portion} onChange={setPortion} t={t} />}
            {selected.options?.flavor && <OptionRow label={t('menu.select_flavor')} options={selected.options.flavor} value={flavor} onChange={setFlavor} t={t} />}
            {selected.options?.spicy && <OptionRow label={t('menu.select_spicy')} icon={<Flame size={15} className="text-chili-500" />} options={getSpicyOptions(selected, kids)} value={spicy} onChange={handleSpicyChange} t={t} />}
            {kids && selected.options?.spicy && <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-100/80 p-3 text-xs font-semibold leading-5 text-charcoal-700"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-amber-500" />{t('menu.kids_spicy_hidden')}</p>}
            {!kids && <div className="mt-5"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-charcoal-900"><Users size={16} />{t('menu.who_ordered')}</p><div className="flex gap-2">{diners.map((name) => <button key={name} onClick={() => setDiner(name)} className={`rounded-full px-4 py-2 text-sm font-bold ${diner === name ? 'bg-amber-400 text-charcoal-900' : 'bg-white text-charcoal-500'}`}>{name}</button>)}</div></div>}
            <Button onClick={addSelected} className={`mt-6 w-full ${kids ? 'kids-cta text-base' : ''}`}><Plus size={kids ? 20 : 17} />{t('menu.add_to_cart')}</Button>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={showRiskWarning} onOpenChange={(open) => !open && cancelSuperSpicy()}>
        <DialogContent title={t('menu.super_spicy_warning_title')}>
          <div className='mt-4 flex flex-col items-center gap-4'>
            <span className='flex h-14 w-14 items-center justify-center rounded-2xl bg-chili-50 text-chili-500'><AlertTriangle size={28} /></span>
            <p className='text-center text-sm leading-6 text-charcoal-700'>{t('menu.super_spicy_warning')}</p>
            <div className='flex w-full gap-3'>
              <Button variant='outline' className='flex-1' onClick={cancelSuperSpicy}>{t('menu.super_spicy_cancel')}</Button>
              <Button className='flex-1' onClick={confirmSuperSpicy}>{t('menu.super_spicy_confirm')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function getSpicyOptions(product: Product, kids: boolean): string[] {
  const options = product.options?.spicy ?? []
  return kids ? options.filter((option) => option !== 'menu.option.super_spicy') : options
}

type TFunc = (key: string, options?: Record<string, unknown>) => string

function OptionRow({ label, icon, options, value, onChange, t }: { label: string; icon?: React.ReactNode; options: string[]; value: string; onChange: (value: string) => void; t: TFunc }) {
  return <div className="mt-5"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-charcoal-900">{icon}{label}</p><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} onClick={() => onChange(option)} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${value === option ? 'border-chili-500 bg-chili-50 text-chili-600' : 'border-charcoal-900/10 bg-white text-charcoal-500'}`}>{t(option)}</button>)}</div></div>
}
