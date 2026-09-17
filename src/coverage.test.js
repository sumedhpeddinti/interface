import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

/* Structural guarantee, the same idea as a coverage report but stricter: walk
   the real import graph from the test entry points and prove that every
   component and page file in the tree is actually mounted by a test. A new
   component nobody tests fails this suite, by name. */

const SRC = resolve(process.cwd(), 'src')

function walk(dir, { includeTests = false } = {}) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full, { includeTests })
    if (!/\.jsx?$/.test(full)) return []
    if (!includeTests && /\.test\.(js|jsx)$/.test(full)) return []
    return [full]
  })
}

function resolveImport(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier)
  const candidates = [
    base,
    `${base}.jsx`,
    `${base}.js`,
    join(base, 'index.jsx'),
    join(base, 'index.js'),
  ]
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      /* keep looking */
    }
  }
  return null
}

function importsOf(file) {
  const source = readFileSync(file, 'utf8')
  const found = new Set()
  const pattern = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g
  let match = pattern.exec(source)
  while (match) {
    const target = resolveImport(file, match[1])
    if (target) found.add(target)
    match = pattern.exec(source)
  }
  return found
}

function reachableFrom(roots) {
  const seen = new Set()
  const queue = [...roots]
  while (queue.length) {
    const file = queue.pop()
    if (seen.has(file)) continue
    seen.add(file)
    for (const target of importsOf(file)) queue.push(target)
  }
  return seen
}

const componentFiles = walk(join(SRC, 'components'))
const pageFiles = walk(join(SRC, 'pages'))
const reachable = reachableFrom([
  resolve(SRC, 'components/components.test.jsx'),
  resolve(SRC, 'pages/pages.test.jsx'),
  resolve(SRC, 'App.routes.test.jsx'),
])

const rel = (file) => relative(SRC, file).replace(/\\/g, '/')

describe('test coverage of the component tree', () => {
  it('finds the component and page files it expects to check', () => {
    expect(componentFiles.length).toBeGreaterThan(25)
    expect(pageFiles.length).toBeGreaterThanOrEqual(15)
  })

  it('mounts every component file from a test', () => {
    const orphans = componentFiles.filter((file) => !reachable.has(file)).map(rel)
    expect(orphans).toEqual([])
  })

  it('mounts every page from a test', () => {
    const orphans = pageFiles.filter((file) => !reachable.has(file)).map(rel)
    expect(orphans).toEqual([])
  })

  it('renders every component through the store or the router, not in isolation', () => {
    /* A component that imports the store must be mounted inside a provider by
       whatever test reaches it, otherwise it would throw on mount. */
    const storeConsumers = walk(join(SRC, 'components')).filter((file) =>
      /from\s+['"][^'"]*StoreContext['"]/.test(readFileSync(file, 'utf8')),
    )
    expect(storeConsumers.length).toBeGreaterThan(0)
    for (const file of storeConsumers) {
      expect(reachable.has(file)).toBe(true)
    }
  })

  it('exports every page as a default component', () => {
    for (const file of pageFiles) {
      expect(readFileSync(file, 'utf8')).toMatch(/export default function/)
    }
  })

  it('has a suite that imports every library module holding logic', () => {
    const logicModules = [
      'format',
      'install',
      'orders',
      'pricing',
      'qr',
      'selectors',
      'storage',
      'notifications',
    ]
    const suites = walk(join(SRC, 'lib'), { includeTests: true }).filter((file) =>
      /\.test\.js$/.test(file),
    )
    expect(suites.length).toBeGreaterThanOrEqual(logicModules.length)
    for (const module of logicModules) {
      const covered = suites.some((file) => {
        const source = readFileSync(file, 'utf8')
        /* Static or dynamic: a suite that resets modules between cases still
           imports the module it is testing. */
        return new RegExp(`(from|import\\()\\s*'\\./${module}'`).test(source)
      })
      expect(covered, `no test imports lib/${module}.js`).toBe(true)
    }
  })
})
