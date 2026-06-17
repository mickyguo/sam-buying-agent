import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const rootSchema = 'prisma/schema.prisma'
const deploySchema = 'prisma/schema.edgeone.prisma'

const source = readFileSync(rootSchema, 'utf8')
const patched = source.replace(
  /binaryTargets\s*=\s*\[[^\]]*\]/,
  'binaryTargets = ["debian-openssl-3.0.x"]',
)
writeFileSync(deploySchema, patched)

function pruneDarwinEngines() {
  execSync(
    'find node_modules -name "libquery_engine-darwin*" -delete 2>/dev/null || true',
    { shell: true },
  )
}

try {
  execSync(`pnpm exec prisma generate --schema=${deploySchema}`, { stdio: 'inherit' })
  pruneDarwinEngines()
  execSync('pnpm exec next build', { stdio: 'inherit' })
} finally {
  unlinkSync(deploySchema)
}
