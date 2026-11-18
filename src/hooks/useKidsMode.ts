import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'kids-mode'

/**
 * 儿童模式状态管理 hook。
 * 优先级：URL 预览参数 > localStorage > 默认关闭。
 * localStorage 不可用时降级为内存态，不报错不阻塞。
 */
export function useKidsMode() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const initial = getInitialKidsMode()
    applyKidsMode(initial)
    return initial
  })

  useEffect(() => {
    applyKidsMode(enabled)
  }, [enabled])

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false')
    } catch {
      // localStorage 不可用时降级为内存态，不报错
    }
  }, [])

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false')
      } catch {
        // localStorage 不可用时降级为内存态，不报错
      }
      return next
    })
  }, [])

  return { enabled, setEnabled, toggle }
}

function getInitialKidsMode(): boolean {
  // ?preview=kids 供设计/演示预览直接打开儿童模式，不写入持久化状态
  try {
    const preview = new URLSearchParams(window.location.search).get('preview')
    if (preview === 'kids') return true
  } catch {
    // 地址解析失败时继续读取本地状态
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // localStorage 不可用时降级为默认关闭
  }
  return false
}

function applyKidsMode(enabled: boolean) {
  const root = document.documentElement
  if (enabled) {
    root.classList.add('kids')
  } else {
    root.classList.remove('kids')
  }
}
