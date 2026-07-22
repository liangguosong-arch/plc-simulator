import express, { Express } from 'express'
import http from 'http'
import cors from 'cors'
import * as path from 'path'
import * as fs from 'fs'

// 导入模块
import { SubscriptionManager } from './websocket/subscription-manager'
import { ConfigManager } from './config/config-manager'
import { DatabaseManager } from './database/database-manager'
import { getInstanceRegistry, InstanceRegistry } from './core/instance-registry'

// 路由
import authRouter from './routes/auth'
import monitoringRouter, { initializeMonitoring } from './routes/monitoring'
import controlRouter, { initializeControl } from './routes/control'
import deviceCatalogRouter from './routes/device-catalog'
import projectsRouter, { setCurrentProjectPath, getCurrentProjectPath, initializeProjectsRouter } from './routes/projects'
import instancesRouter, { initializeInstancesRouter } from './routes/instances'

// 类型
import { VariableConfig } from './types/device'

// 错误处理
import { notFoundHandler, errorHandler } from './middleware/errorHandler'

/**
 * PLC模拟器主服务器类
 */
export class PLCSimulatorServer {
  private app: Express
  private server: http.Server
  private port: number
  private host: string

  // 核心模块
  private configManager: ConfigManager
  private databaseManager: DatabaseManager
  private registry: InstanceRegistry
  private subscriptionManager: SubscriptionManager

  constructor(port: number = 8080, host: string = '0.0.0.0') {
    this.port = port
    this.host = host
    this.app = express()
    this.server = http.createServer(this.app)

    // 初始化模块
    this.configManager = new ConfigManager()
    this.databaseManager = DatabaseManager.getInstance()
    this.registry = getInstanceRegistry()

    // SubscriptionManager 将在 start() 中初始化（需要 config 中的 instanceId）
    this.subscriptionManager = null!

    this.setupMiddleware()
    this.setupRoutes()
  }

  /**
   * 配置中间件
   */
  private setupMiddleware(): void {
    // CORS支持
    this.app.use(cors())

    // JSON解析
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // 请求日志
    this.app.use((req, res, next) => {
      //console.log(`[Request] ${req.method} ${req.path}`)
      next()
    })

    // 静态文件服务（Web管理界面）
    // 优先使用 Vite 构建的新前端，fallback 到旧的前端
    const newWebPath = path.join(__dirname, '../dist/web')
    const oldWebPath = path.join(__dirname, '../web')
    
    if (fs.existsSync(newWebPath)) {
      this.app.use(express.static(newWebPath))
      console.log('[Server] Using new Vite web interface:', newWebPath)
      
      // SPA fallback - 所有非 API 路由返回 index.html
      this.app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next()
        }
        res.sendFile(path.join(newWebPath, 'index.html'))
      })
    } else if (fs.existsSync(oldWebPath)) {
      this.app.use(express.static(oldWebPath))
      console.log('[Server] Using legacy web interface:', oldWebPath)
    } else {
      console.warn('[Server] Web interface directory not found')
    }
  }

  /**
   * 配置路由
   */
  private setupRoutes(): void {
    // API路由
    this.app.use('/api/v1/auth', authRouter)
    this.app.use('/api/v1/devices', deviceCatalogRouter)
    this.app.use('/api/v1/projects', projectsRouter)
    this.app.use('/api/v1', instancesRouter)
    this.app.use('/api/v1', monitoringRouter)
    this.app.use('/api/v1', controlRouter)

    // Web管理界面
    this.app.get('/', (req, res) => {
      const indexPath = path.join(__dirname, '../web/index.html')
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
      } else {
        const instanceId = this.configManager.getInstanceId()
        res.json({
          message: 'PLC Simulator Server is running',
          version: '1.0.0',
          instanceId,
          endpoints: {
            auth: '/api/v1/auth/login',
            config: '/api/v1/config',
            monitoring: `/api/v1/devices/instances/${instanceId}/status`,
            websocket: `ws://localhost:${this.port}/ws/devices/instances/${instanceId}/subscribe`
          }
        })
      }
    })

    // 404处理
    this.app.use(notFoundHandler)

    // 全局错误处理
    this.app.use(errorHandler)
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    try {
      console.log('╔═══════════════════════════════════════════════════════════╗')
      console.log('║           PLC Simulator Server v1.0.0                  ║')
      console.log('╚═══════════════════════════════════════════════════════════╝')
      console.log('')

      // 初始化配置管理器
      console.log('[Server] Initializing configuration manager...')
      await this.configManager.initialize()
      const config = await this.configManager.getConfig()
      const instanceId = config.deviceInstance?.id || '0'

      // 初始化数据库管理器
      console.log('[Server] Initializing database manager...')
      await this.databaseManager.initialize()

      // 恢复持久化的默认实例（若存在则加载，否则用config.json的旧配置创建）
      console.log(`[Server] Loading default instance: ${instanceId}...`)
      const persistedInstances = await this.configManager.listPersistedInstanceIds()
      
      if (persistedInstances.includes(instanceId)) {
        // 从持久化文件恢复实例
        const fullConfig = await this.configManager.getInstanceFullConfig(instanceId)
        if (fullConfig) {
          await this.registry.create(
            fullConfig.config as unknown as any,
            (fullConfig.variables || []) as VariableConfig[]
          )
        }
      } else {
        // 首次启动：用config.json创建默认实例并持久化
        await this.registry.create(
          config.deviceInstance!,
          config.variables || []
        )
        await this.configManager.saveInstanceFullConfig(
          instanceId,
          config.deviceInstance as unknown as Record<string, unknown>,
          config.variables || []
        )
      }

      // 恢复其他持久化的实例（只创建，不自动启动）
      for (const persistedId of persistedInstances) {
        if (persistedId === instanceId) continue // 默认实例已处理
        if (this.registry.has(persistedId)) continue
        const fullConfig = await this.configManager.getInstanceFullConfig(persistedId)
        if (fullConfig) {
          await this.registry.create(
            fullConfig.config as unknown as any,
            (fullConfig.variables || []) as VariableConfig[]
          )
          // 如果之前是running状态，自动重启
          if ((fullConfig.config as any)?.status === 'online') {
            try {
              this.registry.start(persistedId)
            } catch { /* 静默处理 */ }
          }
        }
      }

      // 启动默认实例
      console.log('[Server] Starting default instance...')
      this.registry.start(instanceId)

      // 初始化WebSocket订阅管理（P4: 直接传入 registry 支持多实例路由）
      this.subscriptionManager = new SubscriptionManager(this.registry)
      console.log('[Server] Initializing WebSocket subscription manager...')
      this.subscriptionManager.initialize(this.server)
      this.subscriptionManager.startBroadcast()

      // 初始化路由依赖注入（去除了旧 configRouter）
      initializeMonitoring(this.registry, this.configManager)
      initializeControl(this.registry)
      initializeInstancesRouter(this.registry, this.configManager)
      initializeProjectsRouter(this.subscriptionManager.getWSS())

      // 启动HTTP服务器
      this.server.listen(this.port, this.host, () => {
        console.log('')
        console.log('┌─────────────────────────────────────────────────────┐')
        console.log(`│  Server listening on http://${this.host}:${this.port}       │`)
        console.log('├─────────────────────────────────────────────────────┤')
        console.log(`│  Web Interface: http://localhost:${this.port}/             │`)
        console.log(`│  API Base: http://localhost:${this.port}/api/v1           │`)
        console.log(`│  WebSocket: ws://localhost:${this.port}/ws/...           │`)
        console.log('├─────────────────────────────────────────────────────┤')
        console.log('│  Default Users:                                        │')
        console.log('│    admin / admin123                                    │')
        console.log('│    engineer / eng123                                   │')
        console.log('│    operator / op123                                    │')
        console.log('│    guest / guest123                                    │')
        console.log('└─────────────────────────────────────────────────────┘')
        console.log('')
      })

      // 优雅关闭
      this.setupGracefulShutdown()

    } catch (error) {
      console.error('[Server] Failed to start:', error)
      process.exit(1)
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    console.log('[Server] Stopping...')

    // 停止所有实例
    for (const inst of this.registry.getAll()) {
      this.registry.remove(inst.instanceId)
    }

    // 停止 WebSocket
    if (this.subscriptionManager) {
      this.subscriptionManager.stop()
    }
    this.databaseManager.close()

    // 关闭HTTP服务器
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err)
        } else {
          console.log('[Server] Stopped successfully')
          resolve()
        }
      })
    })
  }

  /**
   * 配置优雅关闭
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`)
      try {
        await this.stop()
        process.exit(0)
      } catch (error) {
        console.error('[Server] Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    
    // Windows兼容
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        shutdown('shutdown')
      }
    })
  }
}
