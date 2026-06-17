'use client'

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

type ApiDocsClientProps = {
  specUrl: string
  tryItOutEnabled: boolean
}

export default function ApiDocsClient({
  specUrl,
  tryItOutEnabled,
}: ApiDocsClientProps) {
  return (
    <SwaggerUI
      url={specUrl}
      docExpansion="list"
      defaultModelsExpandDepth={2}
      displayRequestDuration
      tryItOutEnabled={tryItOutEnabled}
      persistAuthorization
      deepLinking
    />
  )
}
