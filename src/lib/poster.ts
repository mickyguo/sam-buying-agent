import QRCode from 'qrcode'

interface GroupPosterParams {
  productName: string
  productImageUrl: string
  committedUnits: number
  totalUnits: number
  unitLabel: string
  remainingUnits: number
  groupUrl: string
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function generateGroupPosterSvg(params: GroupPosterParams) {
  const progress = Math.round((params.committedUnits / params.totalUnits) * 100)
  const qrSvg = await QRCode.toString(params.groupUrl, {
    type: 'svg',
    margin: 1,
    width: 160,
  })

  const qrInner = qrSvg.replace(/<\?xml[^>]*\?>/, '').trim()

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <rect width="600" height="900" fill="#f8fbfd"/>
  <rect x="0" y="0" width="600" height="80" fill="#004b87"/>
  <text x="300" y="50" text-anchor="middle" fill="white" font-size="28" font-family="sans-serif">山姆拼单</text>
  <image href="${escapeXml(params.productImageUrl)}" x="50" y="110" width="500" height="300" preserveAspectRatio="xMidYMid slice"/>
  <text x="50" y="450" fill="#1e293b" font-size="26" font-weight="bold" font-family="sans-serif">${escapeXml(params.productName.slice(0, 24))}</text>
  <rect x="50" y="470" width="500" height="20" rx="10" fill="#e2e8f0"/>
  <rect x="50" y="470" width="${progress * 5}" height="20" rx="10" fill="#004b87"/>
  <text x="50" y="520" fill="#004b87" font-size="22" font-family="sans-serif">已拼 ${params.committedUnits}/${params.totalUnits} ${escapeXml(params.unitLabel)}</text>
  <text x="50" y="560" fill="#dc2626" font-size="24" font-weight="bold" font-family="sans-serif">还差 ${params.remainingUnits} ${escapeXml(params.unitLabel)} 成团！</text>
  <g transform="translate(220, 590)">${qrInner}</g>
  <text x="300" y="790" text-anchor="middle" fill="#64748b" font-size="18" font-family="sans-serif">长按识别二维码参团</text>
</svg>`
}

interface ShareCardParams {
  productName: string
  productImageUrl: string
  shopName?: string
}

export async function generateOrderShareCardSvg(params: ShareCardParams) {
  const shopName = params.shopName ?? '山姆代购'
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="#ffffff"/>
  <rect x="0" y="0" width="600" height="70" fill="#004b87"/>
  <text x="300" y="45" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif">${escapeXml(shopName)}</text>
  <text x="50" y="120" fill="#1e293b" font-size="22" font-family="sans-serif">今日战利品</text>
  <image href="${escapeXml(params.productImageUrl)}" x="50" y="140" width="500" height="400" preserveAspectRatio="xMidYMid slice"/>
  <text x="50" y="580" fill="#1e293b" font-size="26" font-weight="bold" font-family="sans-serif">${escapeXml(params.productName.slice(0, 30))}</text>
  <text x="50" y="630" fill="#64748b" font-size="18" font-family="sans-serif">山姆好物，拼单更划算</text>
</svg>`
}
