import { listProductIdsForStaticExport } from '@/lib/esa-static-params'

export async function generateStaticParams() {
  if (process.env.ESA_DEPLOY !== 'true') {
    return []
  }

  const ids = await listProductIdsForStaticExport()
  return ids.map((id) => ({ id }))
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
