/** OpenAPI 3.0 共用 schema 定义 */

export const openapiSchemas = {
  ApiSuccess: {
    type: 'object',
    required: ['success', 'data'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: {},
    },
  },
  ApiError: {
    type: 'object',
    required: ['success', 'message'],
    properties: {
      success: { type: 'boolean', enum: [false] },
      message: { type: 'string' },
    },
  },
  ProductStatus: {
    type: 'string',
    enum: ['ACTIVE', 'INACTIVE'],
  },
  GroupStatus: {
    type: 'string',
    enum: ['OPEN', 'FILLED', 'EXPIRED', 'PURCHASING', 'COMPLETED'],
  },
  OrderStatus: {
    type: 'string',
    enum: [
      'PENDING_PAY',
      'PAID',
      'PURCHASING',
      'DELIVERING',
      'COMPLETED',
      'REFUNDED',
      'CANCELLED',
    ],
  },
  OrderType: {
    type: 'string',
    enum: ['DIRECT', 'GROUP'],
  },
  Product: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      imageUrl: { type: 'string', format: 'uri' },
      price: { type: 'integer', description: '价格（分）' },
      priceYuan: { type: 'string' },
      splittable: { type: 'boolean' },
      totalUnits: { type: 'integer', nullable: true },
      unitLabel: { type: 'string', nullable: true },
      description: { type: 'string', nullable: true },
      status: { $ref: '#/components/schemas/ProductStatus' },
      sourceUrl: { type: 'string', nullable: true },
      externalId: { type: 'string', nullable: true },
      lastSyncedAt: { type: 'string', format: 'date-time', nullable: true },
      unitPrice: { type: 'integer' },
    },
  },
  ProductInput: {
    type: 'object',
    required: ['name', 'imageUrl', 'price', 'splittable'],
    properties: {
      name: { type: 'string' },
      imageUrl: { type: 'string' },
      price: { type: 'integer', description: '价格（分）' },
      splittable: { type: 'boolean' },
      totalUnits: { type: 'integer', nullable: true },
      unitLabel: { type: 'string', nullable: true },
      description: { type: 'string', nullable: true },
      status: { $ref: '#/components/schemas/ProductStatus' },
      sourceUrl: { type: 'string', nullable: true },
      externalId: { type: 'string', nullable: true },
    },
  },
  AuthUser: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      nickname: { type: 'string', nullable: true },
      avatarUrl: { type: 'string', nullable: true },
      phone: { type: 'string', nullable: true },
    },
  },
  OrderSummary: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      orderNo: { type: 'string' },
      type: { $ref: '#/components/schemas/OrderType' },
      units: { type: 'integer' },
      amount: { type: 'integer' },
      amountYuan: { type: 'string' },
      status: { $ref: '#/components/schemas/OrderStatus' },
      groupOrderId: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      paidAt: { type: 'string', format: 'date-time', nullable: true },
      product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          imageUrl: { type: 'string' },
          unitLabel: { type: 'string', nullable: true },
          splittable: { type: 'boolean' },
          status: { $ref: '#/components/schemas/ProductStatus' },
        },
      },
    },
  },
  GroupParticipation: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      units: { type: 'integer' },
      amount: { type: 'integer' },
      user: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nickname: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
    },
  },
  GroupOrder: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      productId: { type: 'string' },
      productName: { type: 'string' },
      productImage: { type: 'string' },
      unitLabel: { type: 'string' },
      totalUnits: { type: 'integer' },
      filledUnits: { type: 'integer' },
      reservedUnits: { type: 'integer' },
      committedUnits: { type: 'integer' },
      remainingUnits: { type: 'integer' },
      status: { $ref: '#/components/schemas/GroupStatus' },
      expiresAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      participations: {
        type: 'array',
        items: { $ref: '#/components/schemas/GroupParticipation' },
      },
    },
  },
  WechatPayNotifyResponse: {
    type: 'object',
    properties: {
      code: { type: 'string', enum: ['SUCCESS', 'FAIL'] },
      message: { type: 'string' },
    },
  },
} as const

export const openapiSecuritySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: '登录后获得的 token，放在 Authorization: Bearer <token>',
  },
  adminPassword: {
    type: 'apiKey',
    in: 'header',
    name: 'x-admin-password',
    description: '管理员密码，与环境变量 ADMIN_PASSWORD 一致',
  },
  cronSecret: {
    type: 'apiKey',
    in: 'header',
    name: 'x-cron-secret',
    description: '定时任务密钥，与环境变量 CRON_SECRET 一致',
  },
} as const

/** 标准 JSON 成功响应包装 */
export function jsonSuccessResponse(schema: Record<string, unknown>) {
  return {
    description: '成功',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean', enum: [true] },
            data: schema,
          },
        },
      },
    },
  }
}

/** 标准 JSON 错误响应 */
export function jsonErrorResponses(...codes: number[]) {
  const descriptions: Record<number, string> = {
    400: '请求参数或业务错误',
    401: '未登录',
    403: '无权限',
    404: '资源不存在',
    409: '冲突',
    500: '服务器错误',
  }
  return Object.fromEntries(
    codes.map((status) => [
      status,
      {
        description: descriptions[status] ?? '错误',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
          },
        },
      },
    ]),
  )
}
