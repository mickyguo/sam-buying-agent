# sam

Next.js 后端 API + H5 移动端商城，支持山姆商品链接导入、微信登录、整件代购与按份拼单。

## 功能

- 商品管理：后台粘贴山姆分享链接自动抓取，支持「可拆分拼单 / 整件代购」
- H5 商城：移动端页面，底部 Tab 导航（商品 / 购物车 / 订单 / 我的）
- 登录：短信验证码（本地固定 `123456`）、微信 H5 OAuth、开发模式快捷登录
- 拼单：按份凑满即成团（如瑞士卷 10 块，A 拼 4 块 + B 拼 6 块）
- 采购透明：订单时间轴（支付→满员→采购→到货→取货）
- 拼单海报：一键生成 SVG 分享海报
- 场景套餐：周末聚会/下午茶等一键加购
- 求拼墙：发布许愿、帮凑团
- 降价提醒：价格历史与 30 天最低价标签
- 再来一单 / 常买清单
- 取货时段预约
- 邀请有礼（满减券）
- 团长信用徽章
- 成团预测
- 语音点单自动解析
- 用户提交山姆链接（Admin 审核）
- AI 助手：自然语言推荐商品并解析下单
- 支付：微信支付 JSAPI；开发模式支持模拟支付
- 自提：仅支持到店自提，订单页展示自提点
- 超时退款：拼单到期未凑满自动退款；未支付订单 30 分钟自动取消并释放占位

## 快速开始

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev
```

访问：

- H5 商城：http://localhost:3000/shop
- 管理后台：http://localhost:3000/admin/products（密码见 `.env` 中 `ADMIN_PASSWORD`）

## H5 页面

| 路径                  | 说明     |
| --------------------- | -------- |
| `/shop`               | 商品列表 |
| `/shop/products/[id]` | 商品详情 |
| `/shop/cart`          | 购物车   |
| `/shop/checkout`      | 确认订单 |
| `/shop/groups/[id]`   | 拼单进度 |
| `/shop/orders`        | 我的订单 |
| `/shop/profile`       | 个人中心 |

## 山姆商品链接导入

1. 登录管理后台 `/admin/products`
2. 在「从山姆链接导入」区域粘贴 App/小程序分享链接
3. 点击「抓取预览」，确认名称、图片、价格
4. 设置是否可拆分、总份数（如瑞士卷 10 块）、单位
5. 保存入库；已入库商品可点击「同步价格」更新

开发模式下若无法访问山姆接口，会使用预览数据，入库前请核对价格。

环境变量：

| 变量                   | 说明                                      |
| ---------------------- | ----------------------------------------- |
| `SAMS_PRODUCT_API_URL` | 商品详情 API 模板，如 `.../goods/{id}`    |
| `SAMS_IMPORT_DEV_MODE` | `true` 时抓取失败使用开发预览数据         |

## Python 抓取脚本

山姆 API 需要抓包获取 `auth-token`，项目提供 Python 脚本批量抓取带图片的商品并入库。

```bash
pip install -r scripts/requirements.txt
cp scripts/sams_config.example.json scripts/sams_config.json
# 编辑 sams_config.json，填入 Charles 抓到的 auth-token、device-id
```

| 命令 | 说明 |
| ---- | ---- |
| `python scripts/fetch_sams_products.py search -k 瑞士卷` | 关键词搜索预览 |
| `python scripts/fetch_sams_products.py import --ids 1489392` | 按 spuId 抓取并入库 |
| `python scripts/fetch_sams_products.py import -k 麻薯 --pages 2` | 搜索后批量入库 |
| `python scripts/fetch_sams_products.py serve --port 8765` | 启动本地代理，配合 `SAMS_PRODUCT_API_URL` |
| `python scripts/fetch_sams_products.py test` | 验证 auth-token 是否有效 |
| `python scripts/fetch_sams_products.py parse -f captured.json --import` | 解析抓包 JSON 并入库 |
| `python scripts/fetch_sams_products.py replay -f capture.json --import` | 重放 Charles 完整请求 |

**微信小程序限制**：商品搜索/详情走 Protobuf 网关，`search`/`fetch` 会报「非法请求」。请在小程内打开商品详情，将 Charles 里的 **Response JSON** 保存为文件，用 `parse` 导入；或改用山姆 **App** 抓包（`device_type: ios` + `device_id`）后使用 `search`。

抓包步骤：打开山姆微信小程序 → Charles 代理 → 浏览商品 → 从 `api-sams.walmartmobile.cn` 请求 headers 复制 `auth-token`、`device-id`。

启动代理后可在 `.env` 设置 `SAMS_PRODUCT_API_URL=http://127.0.0.1:8765/api/goods/{id}`，管理后台「从山姆链接导入」即可自动拉取真实图片与价格。

## 环境变量

| 变量                                  | 说明                         |
| ------------------------------------- | ---------------------------- |
| `DATABASE_URL`                        | PostgreSQL 连接字符串        |
| `JWT_SECRET`                          | JWT 密钥                     |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 微信公众号 / 网页授权        |
| `NEXT_PUBLIC_API_BASE_URL`            | 可选；本地开发默认 `http://localhost:3000`。线上 H5 自动用当前域名，可不配 |
| `ADMIN_PASSWORD`                      | 管理后台密码                 |
| `WECHAT_MCH_*`                        | 微信支付商户配置             |
| `PICKUP_LOCATION`                     | 自提点地址与取货时间         |
| `GROUP_ORDER_EXPIRE_HOURS`            | 拼单有效期（小时，默认 24）  |
| `ORDER_PAY_TIMEOUT_MINUTES`           | 未支付订单超时（分钟，默认 30） |

未配置微信支付时，系统自动进入**开发模式**：前端调用模拟支付接口完成下单。

## 短信验证码登录

1. 访问 `/shop/profile`，输入手机号
2. 点击「获取验证码」（开发环境固定为 `123456`）
3. 输入验证码后登录

| 变量           | 说明                          |
| -------------- | ----------------------------- |
| `SMS_DEV_MODE` | `true` 时走开发模式           |
| `SMS_DEV_CODE` | 本地固定验证码，默认 `123456` |

## 微信 H5 登录

1. 配置 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`
2. 在微信公众平台配置 OAuth 回调域
3. 用户访问 `/shop/profile` 点击「微信授权登录」

开发阶段可直接使用「开发模式登录」或短信验证码 `123456`。

## 目录结构

```
src/app/shop/      # H5 商城页面
src/app/api/       # 后端 API
src/app/admin/     # 管理后台
src/lib/shop/      # H5 客户端工具
src/lib/sams/      # 山姆商品导入
drizzle/             # Drizzle 种子数据
src/db/              # Drizzle schema 与枚举
```

## 拼单规则

1. 可拆分商品设置 `totalUnits`（如 10 块）
2. 发起/参团时立即占用份数（含待支付），防止超卖
3. 支付成功后计入已支付份数；满员后状态变为 `FILLED`（拼单成功）
4. 未支付订单超过 30 分钟自动取消并释放占位
5. 拼单超时未凑满则 `EXPIRED` 并退款已支付用户
