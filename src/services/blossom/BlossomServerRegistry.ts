import { TIMING } from '@/lib/constants'

export interface ServerMetrics {
  url: string
  lastChecked: number
  isAvailable: boolean
  averageLatency: number
  successRate: number
  totalUploads: number
  failedUploads: number
}

export interface ServerCapabilities {
  maxFileSize: number
  supportedMimeTypes?: string[]
  requiresAuth: boolean
  supportedFeatures: string[]
}

export interface BlossomServerInfo {
  url: string
  name: string
  metrics: ServerMetrics
  capabilities: ServerCapabilities
  priority: number // Lower number = higher priority
}

export class BlossomServerRegistry {
  private static instance: BlossomServerRegistry | null = null
  private servers: Map<string, BlossomServerInfo> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly HEALTH_CHECK_INTERVAL = TIMING.HEALTH_CHECK_INTERVAL
  private readonly LATENCY_CHECK_TIMEOUT = TIMING.LATENCY_CHECK_TIMEOUT

  private defaultServers: BlossomServerInfo[] = [
    {
      url: 'https://blossom.primal.net',
      name: 'Primal Blossom',
      priority: 1,
      metrics: {
        url: 'https://blossom.primal.net',
        lastChecked: 0,
        isAvailable: true,
        averageLatency: 0,
        successRate: 1,
        totalUploads: 0,
        failedUploads: 0,
      },
      capabilities: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        supportedMimeTypes: ['image/*', 'video/*'],
        requiresAuth: true,
        supportedFeatures: ['resize', 'thumbnail'],
      },
    },
    {
      url: 'https://files.satellite.earth',
      name: 'Satellite Files',
      priority: 2,
      metrics: {
        url: 'https://files.satellite.earth',
        lastChecked: 0,
        isAvailable: true,
        averageLatency: 0,
        successRate: 1,
        totalUploads: 0,
        failedUploads: 0,
      },
      capabilities: {
        maxFileSize: 20 * 1024 * 1024, // 20MB
        supportedMimeTypes: ['image/*', 'video/*', 'audio/*'],
        requiresAuth: true,
        supportedFeatures: ['resize', 'thumbnail', 'transcode'],
      },
    },
    {
      url: 'https://blossom.oxtr.dev',
      name: 'Oxtr Blossom',
      priority: 3,
      metrics: {
        url: 'https://blossom.oxtr.dev',
        lastChecked: 0,
        isAvailable: true,
        averageLatency: 0,
        successRate: 1,
        totalUploads: 0,
        failedUploads: 0,
      },
      capabilities: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        supportedMimeTypes: ['*/*'],
        requiresAuth: true,
        supportedFeatures: ['resize', 'thumbnail'],
      },
    },
  ]

  private constructor() {
    this.initializeServers()
    this.startHealthChecks()
  }

  static getInstance(): BlossomServerRegistry {
    if (!BlossomServerRegistry.instance) {
      BlossomServerRegistry.instance = new BlossomServerRegistry()
    }
    return BlossomServerRegistry.instance
  }

  private initializeServers(): void {
    for (const server of this.defaultServers) {
      this.servers.set(server.url, server)
    }
  }

  private startHealthChecks(): void {
    // Initial health check
    this.performHealthChecks()

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.HEALTH_CHECK_INTERVAL)
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.servers.values()).map(server =>
      this.checkServerHealth(server)
    )
    await Promise.allSettled(promises)
  }

  private async checkServerHealth(server: BlossomServerInfo): Promise<void> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.LATENCY_CHECK_TIMEOUT
      )

      // Perform a simple HEAD request to check availability
      const response = await fetch(server.url, {
        method: 'HEAD',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const latency = Date.now() - startTime
      const isAvailable = response.ok || response.status === 405 // Some servers don't support HEAD

      // Update metrics
      server.metrics.lastChecked = Date.now()
      server.metrics.isAvailable = isAvailable

      // Update average latency (exponential moving average)
      if (server.metrics.averageLatency === 0) {
        server.metrics.averageLatency = latency
      } else {
        server.metrics.averageLatency =
          server.metrics.averageLatency * 0.7 + latency * 0.3
      }
    } catch (error) {
      // Server is not available
      server.metrics.lastChecked = Date.now()
      server.metrics.isAvailable = false
    }
  }

  async selectBestServer(
    fileSize: number,
    mimeType?: string
  ): Promise<BlossomServerInfo | null> {
    const availableServers = this.getAvailableServers(fileSize, mimeType || '*/*')

    if (availableServers.length === 0) {
      return null
    }

    // Sort by priority and metrics
    availableServers.sort((a, b) => {
      // First, sort by availability
      if (a.metrics.isAvailable !== b.metrics.isAvailable) {
        return a.metrics.isAvailable ? -1 : 1
      }

      // Then by success rate
      const successDiff = b.metrics.successRate - a.metrics.successRate
      if (Math.abs(successDiff) > 0.1) {
        return successDiff > 0 ? 1 : -1
      }

      // Then by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }

      // Finally by latency
      return a.metrics.averageLatency - b.metrics.averageLatency
    })

    return availableServers[0]
  }

  private getAvailableServers(
    fileSize: number,
    mimeType: string
  ): BlossomServerInfo[] {
    return Array.from(this.servers.values()).filter(server => {
      // Check file size limit
      if (fileSize > server.capabilities.maxFileSize) {
        return false
      }

      // Check mime type support
      if (server.capabilities.supportedMimeTypes) {
        const supported = server.capabilities.supportedMimeTypes.some(
          pattern => {
            if (pattern === '*/*') return true
            if (pattern.endsWith('/*')) {
              const prefix = pattern.slice(0, -2)
              return mimeType.startsWith(prefix)
            }
            return pattern === mimeType
          }
        )
        if (!supported) return false
      }

      return true
    })
  }

  recordUploadSuccess(serverUrl: string): void {
    const server = this.servers.get(serverUrl)
    if (!server) return

    server.metrics.totalUploads++
    server.metrics.successRate =
      (server.metrics.totalUploads - server.metrics.failedUploads) /
      server.metrics.totalUploads
  }

  recordUploadFailure(serverUrl: string): void {
    const server = this.servers.get(serverUrl)
    if (!server) return

    server.metrics.totalUploads++
    server.metrics.failedUploads++
    server.metrics.successRate =
      (server.metrics.totalUploads - server.metrics.failedUploads) /
      server.metrics.totalUploads
  }

  addServer(serverInfo: Omit<BlossomServerInfo, 'metrics'>): void {
    const server: BlossomServerInfo = {
      ...serverInfo,
      metrics: {
        url: serverInfo.url,
        lastChecked: 0,
        isAvailable: true,
        averageLatency: 0,
        successRate: 1,
        totalUploads: 0,
        failedUploads: 0,
      },
    }
    this.servers.set(serverInfo.url, server)
    
    // Immediately check health of new server
    this.checkServerHealth(server)
  }

  removeServer(url: string): void {
    this.servers.delete(url)
  }

  getServers(): BlossomServerInfo[] {
    return Array.from(this.servers.values())
  }

  getServerInfo(url: string): BlossomServerInfo | undefined {
    return this.servers.get(url)
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}