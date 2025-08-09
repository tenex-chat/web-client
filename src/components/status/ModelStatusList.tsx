import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import { 
  SiOpenai, 
  SiAnthropic,
  SiGoogle,
  SiMeta
} from 'react-icons/si'
import { Cpu } from 'lucide-react'
import type { ProjectModel } from '../../lib/ndk-events/NDKProjectStatus'

interface ModelStatusListProps {
  models: ProjectModel[]
  className?: string
}

export function ModelStatusList({ 
  models, 
  className
}: ModelStatusListProps) {
  if (models.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No models available
      </div>
    )
  }

  const getProviderIcon = (provider: string) => {
    const iconClass = "w-4 h-4"
    switch (provider.toLowerCase()) {
      case 'openai':
        return <SiOpenai className={iconClass} />
      case 'anthropic':
        return <SiAnthropic className={iconClass} />
      case 'google':
      case 'gemini':
        return <SiGoogle className={iconClass} />
      case 'meta':
      case 'llama':
        return <SiMeta className={iconClass} />
      default:
        return <Cpu className={iconClass} />
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'text-green-600 dark:text-green-400'
      case 'anthropic':
        return 'text-orange-600 dark:text-orange-400'
      case 'google':
      case 'gemini':
        return 'text-blue-600 dark:text-blue-400'
      case 'meta':
      case 'llama':
        return 'text-blue-500 dark:text-blue-300'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  // Group models by provider (extract from provider string like "anthropic/claude-sonnet-4")
  const groupedModels = models.reduce((acc, model) => {
    const providerName = model.provider.split('/')[0]
    if (!acc[providerName]) {
      acc[providerName] = []
    }
    acc[providerName].push(model)
    return acc
  }, {} as Record<string, ProjectModel[]>)

  return (
    <div className={cn('space-y-3', className)}>
      {Object.entries(groupedModels).map(([provider, providerModels]) => (
        <div key={provider} className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={getProviderColor(provider)}>
              {getProviderIcon(provider)}
            </span>
            <span className="text-sm font-medium capitalize">
              {provider}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-1.5 pl-6">
            {providerModels.map((model) => (
              <Badge
                key={`${model.provider}-${model.name}`}
                variant="secondary"
                className="text-xs"
              >
                {model.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}