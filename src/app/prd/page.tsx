import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '产品需求文档 | 山姆代购 H5 商城',
  description: '山姆代购 H5 商城产品需求文档（PRD）',
}

type Status = 'done' | 'partial' | 'pending'

const STATUS_STYLES: Record<Status, string> = {
  done: 'bg-green-50 text-green-700 ring-green-600/20',
  partial: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  pending: 'bg-orange-50 text-orange-700 ring-orange-600/20',
}

const STATUS_LABELS: Record<Status, string> = {
  done: '已实现',
  partial: '部分完成',
  pending: '待开发',
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function SectionCard({
  id,
  title,
  status,
  children,
}: {
  id: string
  title: string
  status?: Status
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-[#333333]">{title}</h2>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {children}
    </section>
  )
}

const NAV_ITEMS = [
  { href: '#overview', label: '概述' },
  { href: '#users', label: '用户场景' },
  { href: '#ia', label: '信息架构' },
  { href: '#visual', label: '视觉规范' },
  { href: '#modules', label: '功能模块' },
  { href: '#flows', label: '业务流程' },
  { href: '#rules', label: '业务规则' },
  { href: '#data', label: '数据模型' },
  { href: '#nfr', label: '非功能需求' },
  { href: '#gap', label: '实现对照' },
]

const GAP_ROWS: {
  feature: string
  target: string
  current: string
  status: Status
}[] = [
  { feature: '四 Tab 导航', target: '商品/购物车/订单/我的', current: 'ShopTabBar 已实现', status: 'done' },
  { feature: '商品列表', target: '热门商品展示', current: '/shop 已实现', status: 'done' },
  { feature: '商品详情', target: '详情 + 双按钮', current: '已实现，UI 待美化', status: 'partial' },
  { feature: '拼单/整件', target: 'splittable 区分', current: '数据模型 + 全流程已实现', status: 'done' },
  { feature: '加入购物车', target: 'localStorage', current: '已实现', status: 'done' },
  { feature: '左滑删除购物车', target: '手势删除', current: 'SwipeableCartItem 左滑露出删除', status: 'done' },
  { feature: '合并支付', target: '多订单一次支付', current: '/api/pay/merge + 订单页勾选', status: 'done' },
  { feature: '登录', target: '短信/微信/开发模式', current: '已实现', status: 'done' },
  { feature: '山姆色系 UI', target: '全局视觉统一', current: '局部使用 #004b87', status: 'partial' },
  { feature: '商品导入', target: '后台山姆链接抓取', current: 'admin 已实现', status: 'done' },
]

export default function PrdPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Hero */}
      <header className="bg-gradient-to-br from-[#004B87] to-[#0066A1] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-sm text-white/70">Product Requirements Document</p>
          <h1 className="text-3xl font-bold">山姆代购 H5 商城</h1>
          <p className="mt-3 text-white/90">
            面向微信/移动浏览器的山姆热门商品代购平台，支持整件代购与按份拼单
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/80">
            <span className="rounded-full bg-white/10 px-3 py-1">版本 v1.0</span>
            <span className="rounded-full bg-white/10 px-3 py-1">更新 2026-06-02</span>
          </div>
        </div>
      </header>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl overflow-x-auto px-4">
          <ul className="flex gap-1 py-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  className="block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-[#004B87] hover:bg-[#004B87]/5"
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* 1. Overview */}
        <SectionCard id="overview" title="1. 产品概述">
          <dl className="space-y-3 text-sm text-[#333333]">
            <div>
              <dt className="font-semibold text-[#004B87]">产品名称</dt>
              <dd className="mt-1 text-[#666666]">山姆代购 H5 商城</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#004B87]">产品定位</dt>
              <dd className="mt-1 text-[#666666]">
                面向微信/移动浏览器的山姆热门商品代购平台，支持整件代购与按份拼单
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#004B87]">核心价值</dt>
              <dd className="mt-1 text-[#666666]">
                用户无需山姆会员即可购买热门商品；多份商品可与他人拼单分摊，降低单次购买成本
              </dd>
            </div>
          </dl>
        </SectionCard>

        {/* 2. Users */}
        <SectionCard id="users" title="2. 目标用户与使用场景">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[#999999]">
                  <th className="pb-2 pr-4 font-medium">场景</th>
                  <th className="pb-2 font-medium">描述</th>
                </tr>
              </thead>
              <tbody className="text-[#333333]">
                <tr className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-medium">浏览购买</td>
                  <td className="py-3 text-[#666666]">用户打开 H5，浏览山姆热门商品，选品下单</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-medium">拼单</td>
                  <td className="py-3 text-[#666666]">
                    芝麻油 2 瓶/件，用户只需 1 瓶，发起或参与拼单
                  </td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-medium">整件代购</td>
                  <td className="py-3 text-[#666666]">烤鸡等不可拆分商品，仅支持整件购买</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">到店自提</td>
                  <td className="py-3 text-[#666666]">支付后按自提点信息取货</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 3. IA */}
        <SectionCard id="ia" title="3. 信息架构 — 底部四 Tab" status="done">
          <p className="mb-4 text-sm text-[#666666]">
            H5 底部固定四个 Tab，与山姆 App 导航习惯一致：
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { tab: '商品', route: '/shop', desc: '热门商品列表' },
              { tab: '购物车', route: '/shop/cart', desc: '待结算商品、提交订单' },
              { tab: '订单', route: '/shop/orders', desc: '历史/待支付订单' },
              { tab: '我的', route: '/shop/profile', desc: '登录、自提信息' },
            ].map((item) => (
              <div
                key={item.route}
                className="rounded-xl border border-slate-100 bg-[#F5F5F5] p-4"
              >
                <p className="font-semibold text-[#004B87]">{item.tab}</p>
                <p className="mt-1 font-mono text-xs text-[#999999]">{item.route}</p>
                <p className="mt-2 text-sm text-[#666666]">{item.desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 4. Visual */}
        <SectionCard id="visual" title="4. 视觉规范（山姆 App 色系)" status="partial">
          <p className="mb-4 text-sm text-[#666666]">
            PRD 页面及后续 H5 迭代统一参照以下色值：
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { name: '主色', hex: '#004B87', usage: 'Tab 激活态、价格、主按钮' },
              { name: '辅助蓝', hex: '#0066A1', usage: '渐变/悬停' },
              { name: '强调色', hex: '#E31837', usage: '促销、角标（购物车数量）' },
              { name: '背景', hex: '#F5F5F5', usage: '页面底色' },
              { name: '卡片', hex: '#FFFFFF', usage: '商品卡片、内容区' },
              { name: '正文', hex: '#333333', usage: '主文字' },
              { name: '次要文字', hex: '#999999', usage: '描述、辅助信息' },
              { name: '拼单标签', hex: '#E8F5E9 / #2E7D32', usage: '可拼单' },
              { name: '整件标签', hex: '#FFF3E0 / #E65100', usage: '仅整件代购' },
            ].map((color) => (
              <div
                key={color.name}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-black/5"
                  style={{ backgroundColor: color.hex.split(' / ')[0] }}
                />
                <div>
                  <p className="text-sm font-medium text-[#333333]">{color.name}</p>
                  <p className="font-mono text-xs text-[#999999]">{color.hex}</p>
                  <p className="text-xs text-[#666666]">{color.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 5. Modules */}
        <SectionCard id="modules" title="5. 功能模块详述">
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#333333]">5.1 商品列表</h3>
                <StatusBadge status="done" />
                <span className="font-mono text-xs text-[#999999]">/shop</span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#666666]">
                <li>展示山姆热门商品：封面图、名称、价格、拼单/整件标签</li>
                <li>点击进入商品详情</li>
                <li>待增强：分类筛选、搜索</li>
              </ul>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#333333]">5.2 商品详情</h3>
                <StatusBadge status="partial" />
                <span className="font-mono text-xs text-[#999999]">/shop/products/[id]</span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#666666]">
                <li>展示商品图片、名称、价格、描述</li>
                <li>
                  整件商品（splittable=false）：仅「加入购物车」「立即购买」
                </li>
                <li>
                  可拼单商品（splittable=true）：份数选择器 + 发起拼单 / 参与进行中拼单
                </li>
                <li>底部固定双按钮：加入购物车 + 立即购买</li>
                <li>待增强：详情页 UI 对齐山姆风格、底部固定操作栏</li>
              </ul>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#333333]">5.3 拼单规则</h3>
                <StatusBadge status="done" />
              </div>
              <div className="mb-3 space-y-2 rounded-xl bg-[#F5F5F5] p-4 text-sm">
                <p>
                  <span className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-xs text-[#E65100]">
                    整件
                  </span>{' '}
                  <strong className="text-[#333333]">烤鸡</strong>
                  <span className="text-[#666666]"> — splittable=false，只能整件购买</span>
                </p>
                <p>
                  <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-xs text-[#2E7D32]">
                    可拼单
                  </span>{' '}
                  <strong className="text-[#333333]">芝麻油</strong>
                  <span className="text-[#666666]">
                    {' '}
                    — 1 件 = 2 瓶，totalUnits=2, unitLabel=瓶，用户可选 1 瓶参团
                  </span>
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#333333]">5.4 购物车</h3>
                <StatusBadge status="done" />
                <span className="font-mono text-xs text-[#999999]">/shop/cart</span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#666666]">
                <li>展示已加购商品（localStorage）</li>
                <li>
                  <strong className="text-[#333333]">左滑删除</strong>
                  单条记录，左滑露出红色删除按钮
                </li>
                <li>合计金额、提交订单</li>
              </ul>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#333333]">5.5 订单</h3>
                <StatusBadge status="done" />
                <span className="font-mono text-xs text-[#999999]">/shop/orders</span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#666666]">
                <li>展示全部订单及状态（待支付/已支付/采购中/已完成等）</li>
                <li>待支付订单支持支付</li>
                <li>
                  <strong className="text-[#333333]">合并支付</strong>
                  ：勾选多笔待支付订单，一次微信支付完成
                </li>
                <li>已支付订单展示自提点信息</li>
              </ul>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#333333]">5.6 我的</h3>
                <StatusBadge status="done" />
                <span className="font-mono text-xs text-[#999999]">/shop/profile</span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#666666]">
                <li>未登录：短信验证码登录、微信 OAuth 登录</li>
                <li>已登录：头像/昵称/手机号、退出登录、自提说明</li>
              </ul>
            </div>
          </div>
        </SectionCard>

        {/* 6. Flows */}
        <SectionCard id="flows" title="6. 核心业务流程" status="done">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#333333]">拼单流程</h3>
              <ol className="space-y-2 text-sm text-[#666666]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004B87] text-xs text-white">
                    1
                  </span>
                  <span>用户选择份数，发起拼单或参与已有拼单</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004B87] text-xs text-white">
                    2
                  </span>
                  <span>系统立即占位（reservedUnits），防止超卖</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004B87] text-xs text-white">
                    3
                  </span>
                  <span>用户完成微信支付，计入已支付份数（filledUnits）</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004B87] text-xs text-white">
                    4
                  </span>
                  <span>满员 → 状态变为 FILLED，进入采购；超时未满 → EXPIRED 并退款</span>
                </li>
              </ol>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#333333]">整件代购流程</h3>
              <ol className="space-y-2 text-sm text-[#666666]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E65100] text-xs text-white">
                    1
                  </span>
                  <span>用户点击「立即购买」或「加入购物车」</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E65100] text-xs text-white">
                    2
                  </span>
                  <span>创建 DIRECT 类型订单，微信支付</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E65100] text-xs text-white">
                    3
                  </span>
                  <span>支付成功 → 采购中 → 到店自提</span>
                </li>
              </ol>
            </div>
          </div>
        </SectionCard>

        {/* 7. Rules */}
        <SectionCard id="rules" title="7. 业务规则">
          <ol className="list-inside list-decimal space-y-2 text-sm text-[#666666]">
            <li>可拆分商品设置 totalUnits（如瑞士卷 10 块、芝麻油 2 瓶）</li>
            <li>发起/参团时立即占用份数（含待支付），防止超卖</li>
            <li>支付成功后计入已支付份数；满员后状态变为 FILLED（拼单成功）</li>
            <li>未支付订单超过 30 分钟自动取消并释放占位</li>
            <li>拼单超时未凑满则 EXPIRED 并退款已支付用户</li>
            <li>仅支持到店自提，订单页展示自提点地址与取货时间</li>
          </ol>
        </SectionCard>

        {/* 8. Data model */}
        <SectionCard id="data" title="8. 数据模型概要">
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="font-semibold text-[#004B87]">Product</p>
              <p className="mt-1 font-mono text-xs text-[#999999]">
                splittable · totalUnits · unitLabel · price · status
              </p>
              <p className="mt-2 text-[#666666]">
                商品基本信息；splittable 决定整件/拼单模式
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="font-semibold text-[#004B87]">GroupOrder</p>
              <p className="mt-1 font-mono text-xs text-[#999999]">
                totalUnits · filledUnits · reservedUnits · status · expiresAt
              </p>
              <p className="mt-2 text-[#666666]">
                拼单主表；status: OPEN → FILLED → PURCHASING → COMPLETED / EXPIRED
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="font-semibold text-[#004B87]">Order</p>
              <p className="mt-1 font-mono text-xs text-[#999999]">
                type (DIRECT/GROUP) · status · amount · wxOutTradeNo
              </p>
              <p className="mt-2 text-[#666666]">
                用户订单；关联商品、拼单参与记录及微信支付信息
              </p>
            </div>
          </div>
        </SectionCard>

        {/* 9. NFR */}
        <SectionCard id="nfr" title="9. 非功能需求">
          <ul className="list-inside list-disc space-y-2 text-sm text-[#666666]">
            <li>移动端优先，适配微信内置浏览器（viewport-fit=cover）</li>
            <li>支付：微信支付 JSAPI；开发模式支持模拟支付</li>
            <li>登录：短信验证码、微信 H5 OAuth、开发模式快捷登录</li>
            <li>商品数据：管理后台粘贴山姆分享链接自动抓取</li>
            <li>定时任务：未支付 30 分钟取消、拼单超时退款</li>
            <li>数据存储：PostgreSQL + Prisma ORM</li>
          </ul>
        </SectionCard>

        {/* 10. Gap table */}
        <SectionCard id="gap" title="10. 实现状态对照表">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[#999999]">
                  <th className="pb-2 pr-3 font-medium">功能</th>
                  <th className="pb-2 pr-3 font-medium">目标</th>
                  <th className="pb-2 pr-3 font-medium">现状</th>
                  <th className="pb-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {GAP_ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-slate-50">
                    <td className="py-3 pr-3 font-medium text-[#333333]">{row.feature}</td>
                    <td className="py-3 pr-3 text-[#666666]">{row.target}</td>
                    <td className="py-3 pr-3 text-[#666666]">{row.current}</td>
                    <td className="py-3">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-[#004B87] to-[#0066A1] p-6 text-center text-white">
          <p className="mb-4 text-white/90">PRD 已就绪，可进入 H5 商城体验现有功能</p>
          <Link
            className="inline-block rounded-xl bg-white px-6 py-3 font-semibold text-[#004B87] shadow-sm transition hover:bg-white/90"
            href="/shop"
          >
            进入 H5 商城
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-[#999999]">
        <Link className="text-[#004B87] hover:underline" href="/">
          返回首页
        </Link>
      </footer>
    </div>
  )
}
