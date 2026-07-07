import { access, mkdir, rename, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const stashDir = join(root, '.esa-build')

/** ESA 静态托管不包含服务端路由，构建时暂存这些目录 */
const routesToStash = [
  'src/app/api',
  'src/app/dashboard',
  'src/app/admin',
  'src/app/api-docs',
] as const

function stashPath(route: (typeof routesToStash)[number]) {
  return join(stashDir, route.replace(/\//g, '_'))
}

async function exists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function stashServerRoutes() {
  await mkdir(stashDir, { recursive: true })

  for (const route of routesToStash) {
    const source = join(root, route)
    const target = stashPath(route)
    if (!(await exists(source))) {
      continue
    }
    await rm(target, { recursive: true, force: true })
    await rename(source, target)
  }
}

async function restoreServerRoutes() {
  for (const route of [...routesToStash].reverse()) {
    const source = join(root, route)
    const target = stashPath(route)
    if (!(await exists(target))) {
      continue
    }
    await rm(source, { recursive: true, force: true })
    await rename(target, source)
  }

  if (await exists(stashDir)) {
    await rm(stashDir, { recursive: true, force: true })
  }
}

async function main() {
  console.log('[esa] 暂存服务端路由（API / 管理后台需单独部署，见 README ESA 章节）')
  await stashServerRoutes()

  try {
    const result = spawnSync('pnpm', ['exec', 'next', 'build'], {
      cwd: root,
      env: { ...process.env, ESA_DEPLOY: 'true' },
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      process.exit(result.status ?? 1)
    }
    console.log('[esa] 静态产物已输出到 ./out')
  } finally {
    console.log('[esa] 恢复服务端路由')
    await restoreServerRoutes()
  }
}

main().catch(async (error) => {
  console.error('[esa] 构建失败:', error)
  try {
    await restoreServerRoutes()
  } catch {
    // ignore restore errors
  }
  process.exit(1)
})
