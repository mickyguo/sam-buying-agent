import {
  jsonErrorResponses,
  jsonSuccessResponse,
  openapiSchemas,
  openapiSecuritySchemes,
} from './schemas'

export function buildOpenApiSpec(baseUrl?: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: '山姆代购 API',
      description:
        '山姆代购小程序/店铺后端 API。统一响应格式：`{ success: true, data }` 或 `{ success: false, message }`（支付回调除外）。',
      version: '1.0.0',
    },
    servers: baseUrl
      ? [{ url: baseUrl, description: '当前环境' }]
      : [{ url: '/', description: '相对当前站点根路径' }],
    tags: [
      { name: '商品', description: '商品列表与 CRUD' },
      { name: '订单', description: '用户直购订单' },
      { name: '拼单', description: '拼单开团、参团' },
      { name: '支付', description: '微信支付与回调' },
      { name: '认证', description: '短信、微信小程序、公众号 OAuth' },
      { name: '店铺', description: '店铺配置' },
      { name: '管理后台', description: '管理员接口' },
      { name: '定时任务', description: '过期拼单/订单清理' },
      { name: '通知', description: '订阅消息' },
    ],
    paths: {
      '/api/products': {
        get: {
          tags: ['商品'],
          summary: '商品列表',
          parameters: [
            {
              name: 'all',
              in: 'query',
              schema: { type: 'string', enum: ['1'] },
              description: '传 1 时包含已下架商品，需管理员密码',
            },
          ],
          security: [{}, { adminPassword: [] }],
          responses: {
            '200': jsonSuccessResponse({
              type: 'array',
              items: { $ref: '#/components/schemas/Product' },
            }),
            ...jsonErrorResponses(403, 500),
          },
        },
        post: {
          tags: ['商品'],
          summary: '创建商品（管理员）',
          security: [{ adminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductInput' },
              },
            },
          },
          responses: {
            '201': jsonSuccessResponse({ $ref: '#/components/schemas/Product' }),
            ...jsonErrorResponses(400, 403, 409, 500),
          },
        },
      },
      '/api/products/{id}': {
        get: {
          tags: ['商品'],
          summary: '商品详情',
          parameters: [pathIdParam()],
          responses: {
            '200': jsonSuccessResponse({ $ref: '#/components/schemas/Product' }),
            ...jsonErrorResponses(404, 500),
          },
        },
        put: {
          tags: ['商品'],
          summary: '更新商品（管理员）',
          security: [{ adminPassword: [] }],
          parameters: [pathIdParam()],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductInput' },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({ $ref: '#/components/schemas/Product' }),
            ...jsonErrorResponses(400, 403, 404, 500),
          },
        },
        delete: {
          tags: ['商品'],
          summary: '删除或下架商品（管理员）',
          security: [{ adminPassword: [] }],
          parameters: [pathIdParam()],
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                id: { type: 'string' },
                mode: { type: 'string', enum: ['deleted', 'deactivated'] },
              },
            }),
            ...jsonErrorResponses(403, 404, 500),
          },
        },
      },
      '/api/orders': {
        get: {
          tags: ['订单'],
          summary: '我的订单列表',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': jsonSuccessResponse({
              type: 'array',
              items: { $ref: '#/components/schemas/OrderSummary' },
            }),
            ...jsonErrorResponses(401, 500),
          },
        },
        post: {
          tags: ['订单'],
          summary: '创建直购订单（不可拆分商品）',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId'],
                  properties: { productId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '201': jsonSuccessResponse({
              type: 'object',
              properties: {
                orderId: { type: 'string' },
                amount: { type: 'integer' },
                outTradeNo: { type: 'string' },
                order: { $ref: '#/components/schemas/OrderSummary' },
              },
            }),
            ...jsonErrorResponses(400, 401, 404, 500),
          },
        },
      },
      '/api/group-orders': {
        get: {
          tags: ['拼单'],
          summary: '拼单列表',
          parameters: [
            {
              name: 'productId',
              in: 'query',
              schema: { type: 'string' },
              description: '按商品筛选',
            },
            {
              name: 'status',
              in: 'query',
              schema: { $ref: '#/components/schemas/GroupStatus' },
              description: '默认 OPEN',
            },
          ],
          responses: {
            '200': jsonSuccessResponse({
              type: 'array',
              items: { $ref: '#/components/schemas/GroupOrder' },
            }),
            ...jsonErrorResponses(500),
          },
        },
        post: {
          tags: ['拼单'],
          summary: '发起拼单',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'units'],
                  properties: {
                    productId: { type: 'string' },
                    units: { type: 'integer', minimum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '201': jsonSuccessResponse({
              type: 'object',
              properties: {
                groupOrderId: { type: 'string' },
                orderId: { type: 'string' },
                amount: { type: 'integer' },
                outTradeNo: { type: 'string' },
              },
            }),
            ...jsonErrorResponses(400, 401, 500),
          },
        },
      },
      '/api/group-orders/{id}': {
        get: {
          tags: ['拼单'],
          summary: '拼单详情',
          parameters: [pathIdParam('拼单 ID')],
          responses: {
            '200': jsonSuccessResponse({ $ref: '#/components/schemas/GroupOrder' }),
            ...jsonErrorResponses(404, 500),
          },
        },
      },
      '/api/group-orders/{id}/join': {
        post: {
          tags: ['拼单'],
          summary: '加入拼单',
          security: [{ bearerAuth: [] }],
          parameters: [pathIdParam('拼单 ID')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['units'],
                  properties: { units: { type: 'integer', minimum: 1 } },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                groupOrderId: { type: 'string' },
                orderId: { type: 'string' },
                amount: { type: 'integer' },
                outTradeNo: { type: 'string' },
              },
            }),
            ...jsonErrorResponses(400, 401, 500),
          },
        },
      },
      '/api/shop/config': {
        get: {
          tags: ['店铺'],
          summary: '自提点与须知',
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                pickupLocation: { type: 'string' },
                pickupNotice: { type: 'string' },
              },
            }),
          },
        },
      },
      '/api/pay/create': {
        post: {
          tags: ['支付'],
          summary: '单笔订单发起支付',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['orderId'],
                  properties: { orderId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                orderId: { type: 'string' },
                orderIds: { type: 'array', items: { type: 'string' } },
                outTradeNo: { type: 'string' },
                amount: { type: 'integer' },
                devMode: { type: 'boolean' },
                payment: { type: 'object', description: '微信 JSAPI 支付参数' },
              },
            }),
            ...jsonErrorResponses(400, 401, 404, 500),
          },
        },
        put: {
          tags: ['支付'],
          summary: '开发模式模拟支付成功',
          description: '仅 `NODE_ENV=development` 或支付开发模式时可用',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['outTradeNo'],
                  properties: { outTradeNo: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({ type: 'object' }),
            ...jsonErrorResponses(400, 401, 403, 500),
          },
        },
      },
      '/api/pay/merge': {
        post: {
          tags: ['支付'],
          summary: '合并多笔订单支付',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['orderIds'],
                  properties: {
                    orderIds: {
                      type: 'array',
                      items: { type: 'string' },
                      minItems: 1,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                orderIds: { type: 'array', items: { type: 'string' } },
                outTradeNo: { type: 'string' },
                amount: { type: 'integer' },
                devMode: { type: 'boolean' },
                payment: { type: 'object' },
              },
            }),
            ...jsonErrorResponses(400, 401, 500),
          },
        },
        put: {
          tags: ['支付'],
          summary: '开发模式模拟合并支付成功',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['outTradeNo'],
                  properties: { outTradeNo: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({ type: 'object' }),
            ...jsonErrorResponses(400, 401, 403, 500),
          },
        },
      },
      '/api/pay/notify': {
        post: {
          tags: ['支付'],
          summary: '微信支付结果回调',
          description:
            '微信服务器调用，请求体为加密 resource。响应格式为 `{ code, message }`，非标准 success/data。',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    resource: {
                      type: 'object',
                      properties: {
                        ciphertext: { type: 'string' },
                        nonce: { type: 'string' },
                        associated_data: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '微信要求的应答',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WechatPayNotifyResponse' },
                },
              },
            },
          },
        },
      },
      '/api/auth/sms/send': {
        post: {
          tags: ['认证'],
          summary: '发送短信验证码',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['phone'],
                  properties: { phone: { type: 'string', example: '13800138000' } },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                devMode: { type: 'boolean' },
                message: { type: 'string' },
              },
            }),
            ...jsonErrorResponses(400, 500),
          },
        },
      },
      '/api/auth/sms/login': {
        post: {
          tags: ['认证'],
          summary: '手机号验证码登录',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['phone', 'code'],
                  properties: {
                    phone: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                token: { type: 'string' },
                user: { $ref: '#/components/schemas/AuthUser' },
              },
            }),
            ...jsonErrorResponses(400, 500),
          },
        },
      },
      '/api/auth/wechat': {
        get: {
          tags: ['认证'],
          summary: '获取当前登录用户',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': jsonSuccessResponse({ $ref: '#/components/schemas/AuthUser' }),
            ...jsonErrorResponses(401, 500),
          },
        },
        post: {
          tags: ['认证'],
          summary: '微信小程序 code 登录',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string' },
                    nickname: { type: 'string' },
                    avatarUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                token: { type: 'string' },
                user: { $ref: '#/components/schemas/AuthUser' },
              },
            }),
            ...jsonErrorResponses(400, 500),
          },
        },
      },
      '/api/auth/wechat/oauth': {
        get: {
          tags: ['认证'],
          summary: '公众号 OAuth 跳转',
          description: '302 重定向到微信授权页',
          parameters: [
            {
              name: 'redirect',
              in: 'query',
              schema: { type: 'string', default: '/shop/profile' },
              description: '授权完成后的站内路径',
            },
          ],
          responses: {
            '302': { description: '重定向到微信 OAuth' },
          },
        },
      },
      '/api/auth/wechat/callback': {
        get: {
          tags: ['认证'],
          summary: '公众号 OAuth 回调',
          description: '302 重定向回业务页，URL 携带 token、user 参数',
          parameters: [
            { name: 'code', in: 'query', schema: { type: 'string' } },
            { name: 'state', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '302': { description: '重定向到 state 指定页面' },
          },
        },
      },
      '/api/admin/orders': {
        get: {
          tags: ['管理后台'],
          summary: '订单列表（最近 100 条）',
          security: [{ adminPassword: [] }],
          responses: {
            '200': jsonSuccessResponse({
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  orderNo: { type: 'string' },
                  type: { $ref: '#/components/schemas/OrderType' },
                  status: { $ref: '#/components/schemas/OrderStatus' },
                  amount: { type: 'integer' },
                  units: { type: 'integer' },
                  groupOrderId: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  productName: { type: 'string' },
                  userNickname: { type: 'string', nullable: true },
                },
              },
            }),
            ...jsonErrorResponses(403, 500),
          },
        },
        patch: {
          tags: ['管理后台'],
          summary: '更新订单或拼单状态',
          security: [{ adminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      required: ['orderId', 'status'],
                      properties: {
                        orderId: { type: 'string' },
                        status: { $ref: '#/components/schemas/OrderStatus' },
                      },
                    },
                    {
                      type: 'object',
                      required: ['groupOrderId', 'groupStatus'],
                      properties: {
                        groupOrderId: { type: 'string' },
                        groupStatus: {
                          type: 'string',
                          enum: ['PURCHASING', 'COMPLETED'],
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({ type: 'object' }),
            ...jsonErrorResponses(400, 403, 500),
          },
        },
      },
      '/api/admin/products/import': {
        post: {
          tags: ['管理后台'],
          summary: '从山姆链接预览/导入商品',
          security: [{ adminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: { url: { type: 'string', format: 'uri' } },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({ type: 'object' }),
            ...jsonErrorResponses(400, 403, 500),
          },
        },
      },
      '/api/admin/products/{id}/sync': {
        post: {
          tags: ['管理后台'],
          summary: '按 externalId 同步山姆商品信息',
          security: [{ adminPassword: [] }],
          parameters: [pathIdParam('商品 ID')],
          responses: {
            '200': jsonSuccessResponse({ $ref: '#/components/schemas/Product' }),
            ...jsonErrorResponses(400, 403, 404, 500),
          },
        },
      },
      '/api/cron/expire-groups': {
        get: {
          tags: ['定时任务'],
          summary: '订单状态统计（无需密钥）',
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                orders: { type: 'array', items: { type: 'object' } },
                pendingPay: { type: 'integer' },
              },
            }),
          },
        },
        post: {
          tags: ['定时任务'],
          summary: '清理过期待支付订单与过期拼单',
          security: [{}, { cronSecret: [] }],
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                cancelledCount: { type: 'integer' },
                expiredCount: { type: 'integer' },
              },
            }),
            ...jsonErrorResponses(403, 500),
          },
        },
      },
      '/api/notify/subscribe': {
        post: {
          tags: ['通知'],
          summary: '记录订阅消息意向',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['group_filled', 'group_expired'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': jsonSuccessResponse({
              type: 'object',
              properties: {
                userId: { type: 'string' },
                type: { type: 'string' },
                message: { type: 'string' },
              },
            }),
            ...jsonErrorResponses(401, 500),
          },
        },
      },
    },
    components: {
      securitySchemes: openapiSecuritySchemes,
      schemas: openapiSchemas,
    },
  }
}

function pathIdParam(description = '资源 ID') {
  return {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description,
  }
}
