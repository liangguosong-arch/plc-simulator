import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { AppConfig, VariableConfig } from '../types/device'
import * as path from 'path'
import * as fs from 'fs'

/**
 * 配置管理器 - 管理持久化配置
 */
export class ConfigManager {
  private db: Low<AppConfig> | null = null
  private configPath: string

  constructor() {
    this.configPath = path.join(__dirname, '../../data/config.json')
  }

  /**
   * 初始化配置
   */
  async initialize(): Promise<void> {
    // 确保data目录存在
    const dataDir = path.dirname(this.configPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const adapter = new JSONFile<AppConfig>(this.configPath)
    this.db = new Low(adapter, this.getDefaultConfig())

    await this.db.read()

    // 如果文件不存在，创建默认配置
    if (this.db.data === null) {
      this.db.data = this.getDefaultConfig()
      await this.write()
      console.log('[ConfigManager] Created default configuration')
    }

    console.log('[ConfigManager] Configuration loaded from', this.configPath)
  }

  /**
   * 读取配置
   */
  async getConfig(): Promise<AppConfig> {
    if (!this.db) throw new Error('ConfigManager not initialized')
    
    await this.db.read()
    return this.db.data!
  }

  /**
   * 同步获取当前设备实例ID（从内存读取，不触发磁盘IO）
   */
  getInstanceId(): string {
    if (!this.db?.data) return '0'
    return this.db.data.deviceInstance?.id ?? '0'
  }

  /**
   * 保存配置
   */
  async saveConfig(updates: Partial<AppConfig>): Promise<void> {
    if (!this.db) throw new Error('ConfigManager not initialized')

    const currentConfig = this.db.data!
    this.db.data = {
      ...currentConfig,
      ...updates
    }

    await this.write()
    console.log('[ConfigManager] Configuration saved')
  }

  /**
   * 更新变量配置
   */
  async updateVariable(variableConfig: VariableConfig): Promise<void> {
    if (!this.db) throw new Error('ConfigManager not initialized')

    const index = this.db.data!.variables.findIndex(v => v.id === variableConfig.id)
    
    if (index >= 0) {
      this.db.data!.variables[index] = variableConfig
    } else {
      this.db.data!.variables.push(variableConfig)
    }

    await this.write()
  }

  /**
   * 批量更新变量
   */
  async updateVariables(variables: VariableConfig[]): Promise<void> {
    if (!this.db) throw new Error('ConfigManager not initialized')

    this.db.data!.variables = variables
    await this.write()
    console.log(`[ConfigManager] Updated ${variables.length} variables`)
  }

  /**
   * 写入磁盘
   */
  private async write(): Promise<void> {
    if (!this.db) throw new Error('ConfigManager not initialized')
    await this.db.write()
  }

  /**
   * 生成唯一实例ID
   */
  generateInstanceId(): string {
    const now = Date.now().toString(36)
    const rand = Math.random().toString(36).substring(2, 6)
    return `inst-${now}-${rand}`
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    return {
      variables: this.getDefaultVariables(),
      simulationSettings: {
        updateInterval: 500,
        historyRetention: 1000,
        enableAlarms: true
      },
      deviceInstance: this.getDefaultDeviceInstance()
    }
  }

  /**
   * 获取默认设备实例信息
   */
  private getDefaultDeviceInstance() {
    const now = new Date().toISOString()
    return {
      id: '0',
      projectId: undefined,
      manufacturer: 'Siemens',
      type: 'plc' as const,
      series: 'S7-200 SMART',
      deviceModel: 'CPU SR40',
      instanceName: 'Simulated PLC Device',
      status: 'online' as const,
      ipAddress: '127.0.0.1',
      port: 8080,
      lastConnectedAt: now,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * 获取默认变量列表
   */
  private getDefaultVariables(): VariableConfig[] {
    return [
      // 输入变量
      {
        id: 'var-i0',
        label: '输入点 I0',
        type: 'input',
        address: 'I0.0',
        dataType: 'BOOL',
        description: '数字量输入点 0',
        accessLevel: 'read',
        simulationMode: 'auto',
        simulationConfig: {
          strategy: 'random',
          fluctuationRange: 100
        }
      },
      {
        id: 'var-i1',
        label: '输入点 I1',
        type: 'input',
        address: 'I0.1',
        dataType: 'BOOL',
        description: '数字量输入点 1',
        accessLevel: 'read',
        simulationMode: 'auto',
        simulationConfig: {
          strategy: 'random',
          fluctuationRange: 100
        }
      },
      
      // 输出变量
      {
        id: 'var-q0',
        label: '输出点 Q0',
        type: 'output',
        address: 'Q0.0',
        dataType: 'BOOL',
        description: '数字量输出点 0',
        accessLevel: 'write',
        simulationMode: 'manual'
      },
      {
        id: 'var-q1',
        label: '输出点 Q1',
        type: 'output',
        address: 'Q0.1',
        dataType: 'BOOL',
        description: '数字量输出点 1',
        accessLevel: 'write',
        simulationMode: 'manual'
      },
      
      // 内存变量
      {
        id: 'var-m0',
        label: '温度设定',
        type: 'memory',
        address: 'MW10',
        dataType: 'REAL',
        unit: '°C',
        minValue: 0,
        maxValue: 100,
        description: '温度设定值',
        accessLevel: 'read-write',
        simulationMode: 'auto',
        simulationConfig: {
          strategy: 'sine',
          minValue: 20,
          maxValue: 80
        }
      },
      {
        id: 'var-m1',
        label: '压力值',
        type: 'memory',
        address: 'MW14',
        dataType: 'REAL',
        unit: 'kPa',
        minValue: 0,
        maxValue: 1000,
        description: '系统压力',
        accessLevel: 'read-write',
        simulationMode: 'auto',
        simulationConfig: {
          strategy: 'random',
          fluctuationRange: 10,
          minValue: 400,
          maxValue: 600
        }
      },
      {
        id: 'var-m2',
        label: '运行速度',
        type: 'memory',
        address: 'MW18',
        dataType: 'INT',
        unit: 'rpm',
        minValue: 0,
        maxValue: 3000,
        description: '电机转速',
        accessLevel: 'read-write',
        simulationMode: 'auto',
        simulationConfig: {
          strategy: 'step',
          minValue: 1000,
          maxValue: 2500
        }
      },
      {
        id: 'var-m3',
        label: '计数器',
        type: 'memory',
        address: 'MW22',
        dataType: 'DINT',
        description: '累计计数',
        accessLevel: 'read-write',
        simulationMode: 'auto',
        simulationConfig: {
          strategy: 'random',
          fluctuationRange: 5,
          minValue: 0,
          maxValue: 10000
        }
      }
    ]
  }
}
