import Image, { type ImageProps } from 'next/image'

/**
 * 外部 CDN 图片在 Vercel 上经 `/_next/image` 代理时常返回 400，
 * 直接加载源站 URL 更稳定（山姆腾讯云 CDN 已提供合适尺寸）。
 */
export default function ShopImage(props: ImageProps) {
  return <Image {...props} unoptimized />
}
