import { describe, expect, it } from 'vitest'
import { parseExternalIdFromInput } from '@/lib/sams/import'

describe('parseExternalIdFromInput', () => {
  it('解析纯数字 ID', () => {
    expect(parseExternalIdFromInput('1489392')).toBe('1489392')
    expect(parseExternalIdFromInput('  12345678  ')).toBe('12345678')
  })

  it('解析 URL 查询参数', () => {
    expect(
      parseExternalIdFromInput(
        'https://m.samsclub.cn/product?spuId=1489392&foo=bar',
      ),
    ).toBe('1489392')
    expect(
      parseExternalIdFromInput('https://example.com/goods?itemId=9876543'),
    ).toBe('9876543')
  })

  it('解析路径中的数字 ID', () => {
    expect(
      parseExternalIdFromInput('https://m.samsclub.cn/product/detail_1489392'),
    ).toBe('1489392')
  })

  it('解析小程序分享链接', () => {
    expect(
      parseExternalIdFromInput('小程序://山姆会员商店/AbCdEf12GhIj'),
    ).toBe('AbCdEf12GhIj')
  })

  it('无法解析时返回 null', () => {
    expect(parseExternalIdFromInput('')).toBeNull()
    expect(parseExternalIdFromInput('   ')).toBeNull()
    expect(parseExternalIdFromInput('不是有效链接')).toBeNull()
  })
})
