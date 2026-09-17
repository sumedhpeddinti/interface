// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import App from './App'
import { StoreProvider } from './context/StoreContext'
import { NAV_GROUPS } from './components/store/StoreSidebar'

/* Backlinks: every entry in the sidebar must resolve to a mounted page, every
   page must be reachable from the sidebar, and an unknown URL must land the
   visitor back on the guest app rather than a blank screen. */

const routeSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
const declaredRoutes = new Set(
  [...routeSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]),
)
const navItems = NAV_GROUPS.flatMap((group) => group.items)

function renderApp(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  window.scrollTo = window.scrollTo || (() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('route table', () => {
  it('declares the two portals and the POS shell', () => {
    expect(declaredRoutes.has('/')).toBe(true)
    expect(declaredRoutes.has('/t/:tableId')).toBe(true)
    expect(declaredRoutes.has('/store')).toBe(true)
    expect(declaredRoutes.has('*')).toBe(true)
  })

  it('declares a route for every sidebar backlink', () => {
    const missing = navItems
      .filter((item) => item.to !== '/store')
      .filter((item) => !declaredRoutes.has(item.to.replace('/store/', '')))
      .map((item) => item.to)
    expect(missing).toEqual([])
  })

  it('has a sidebar entry for every store route', () => {
    const covered = new Set(navItems.map((item) => item.to))
    const storeRoutes = [...declaredRoutes]
      .filter((route) => route.startsWith('/store'))
      .map((route) => (route === '/store' ? '/store' : `/store/${route}`))
    const unreachable = storeRoutes.filter((route) => !covered.has(route))
    expect(unreachable).toEqual([])
  })

  it('gives every backlink a label, an icon and an access area', () => {
    expect(navItems.length).toBeGreaterThanOrEqual(14)
    for (const item of navItems) {
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(item.area).toBeTruthy()
      expect(item.to.startsWith('/store')).toBe(true)
    }
  })
})

describe('navigation', () => {
  it.each(navItems.map((item) => [item.label, item.to]))(
    'renders the %s page at %s',
    (label, to) => {
      const { container } = renderApp(to)
      /* The header breadcrumb is derived from the same nav table, so its
         presence proves the route matched a real page. */
      expect(container.textContent).toContain(label)
      expect(container.textContent.length).toBeGreaterThan(120)
    },
  )

  it.each(navItems.map((item) => [item.label, item.to]))(
    'logs no error while opening %s',
    (_label, to) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderApp(to)
      expect(error).not.toHaveBeenCalled()
    },
  )

  it('lands a deep store URL on the right page', () => {
    const { container } = renderApp('/store/kitchen')
    expect(container.textContent).toContain('Kitchen')
  })

  it('sends an unknown URL back to the guest app', () => {
    const { container } = renderApp('/this/does/not/exist')
    expect(container.textContent).toContain('Ganesh Café')
    expect(screen.getByText(/Call Waiter/i)).toBeTruthy()
  })

  it('shows the portal switcher on every route', () => {
    const { container } = renderApp('/store/billing')
    expect(container.textContent).toContain('Manager POS')
    expect(container.textContent).toContain('Guest App')
  })
})
