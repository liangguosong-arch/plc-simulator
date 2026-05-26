import express, { Express } from 'express'
import http from 'http'
import cors from 'cors'
import * as path from 'path'
import * as fs from 'fs'

// 导入模块
import { DeviceStatusSimulator } from './simulator/device-status'
import { VariableManager } from './variables/variable-manager'
import { AlarmGenerator } from './simulator/alarm-generator'
import { CommandExecutor } from './commands/command-executor'
import { SubscriptionManager } from './websocket/subscription-manager'
import { ConfigManager } from './config/config-manager'
import { DatabaseManager } from './database/database-manager'

// 路由
import authRouter from './routes/auth'
import configRouter, { initializeConfigRouter } from './routes/config'
import monitoringRouter, { initializeMonitoring } from './routes/monitoring'
import controlRouter, { initializeControl } from './routes/control'
import deviceCatalogRouter from './routes/device-catalog'
import projectsRouter, { setCurrentProjectPath, getCurrentProjectPath, initializeProjectsRouter } from './routes/projects'

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
  private deviceStatus: DeviceStatusSimulator
  private variableManager: VariableManager
  private alarmGenerator: AlarmGenerator
  private commandExecutor: CommandExecutor
  private subscriptionManager: SubscriptionManager

  constructor(port: number = 8080, host: string = '0.0.0.0') {
    this.port = port
    this.host = host
    this.app = express()
    this.server = http.createServer(this.app)

    // 初始化模块
    this.configManager = new ConfigManager()
    this.databaseManager = DatabaseManager.getInstance()
    this.deviceStatus = new DeviceStatusSimulator('sim-device-001')
    this.variableManager = new VariableManager()
    this.alarmGenerator = new AlarmGenerator('sim-device-001')
    this.commandExecutor = new CommandExecutor(this.deviceStatus)
    this.subscriptionManager = new SubscriptionManager(this.variableManager)

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
    this.app.use('/api/v1/config', configRouter)
    this.app.use('/api/v1/devices', deviceCatalogRouter)
    this.app.use('/api/v1/projects', projectsRouter)
    this.app.use('/api/v1', monitoringRouter)
    this.app.use('/api/v1', controlRouter)

    // Web管理界面
    this.app.get('/', (req, res) => {
      const indexPath = path.join(__dirname, '../web/index.html')
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
      } else {
        res.json({
          message: 'PLC Simulator Server is running',
          version: '1.0.0',
          endpoints: {
            auth: '/api/v1/auth/login',
            config: '/api/v1/config',
            monitoring: '/api/v1/devices/instances/sim-device-001/status',
            websocket: 'ws://localhost:8080/ws/devices/instances/sim-device-001/subscribe'
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

      // 初始化数据库管理器
      console.log('[Server] Initializing database manager...')
      await this.databaseManager.initialize()

      // 初始化变量管理器
      console.log('[Server] Initializing variable manager...')
      await this.variableManager.initialize(config.variables)

      // 启动设备状态模拟
      console.log('[Server] Starting device status simulator...')
      this.deviceStatus.start()

      // 初始化WebSocket订阅管理
      console.log('[Server] Initializing WebSocket subscription manager...')
      this.subscriptionManager.initialize(this.server)
      this.subscriptionManager.startBroadcast()

      // 初始化路由依赖注入
      initializeConfigRouter(this.configManager, (variables) => {
        this.variableManager.syncWithConfig(variables)
      })
      initializeMonitoring(this.deviceStatus, this.variableManager, this.alarmGenerator, this.configManager)
      initializeControl(this.variableManager, this.commandExecutor, this.deviceStatus)
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

    // 停止各模块
    this.deviceStatus.stop()
    this.variableManager.stop()
    this.subscriptionManager.stop()
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
