import { listGroupIdsForStaticExport } from '@/lib/esa-static-params'

export async function generateStaticParams() {
  if (process.env.ESA_DEPLOY !== 'true') {
    return []
  }

  const ids = await listGroupIdsForStaticExport()
  return ids.map((id) => ({ id }))
}

export default function GroupDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
