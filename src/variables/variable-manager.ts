import { VariableConfig, VariableData, HistoryDataPoint, DataQuality } from '../types/device'
import { ValueSimulator } from './value-simulator'

/**
 * 变量管理器 - 管理所有变量的生命周期和值更新
 */
export class VariableManager {
  private variables: Map<string, VariableData> = new Map() // Internal storage by id
  private addressToIdMap: Map<string, string> = new Map() // Address -> Id mapping
  private autoUpdateTimer: NodeJS.Timeout | null = null
  private updateInterval: number = 500 // 默认500ms更新一次
  private historyRetention: number = 1000 // 保留最近1000条历史记录
  private subscribers: Map<string, Set<string>> = new Map() // variableId -> clientIds

  constructor() {}

  /**
   * 初始化变量
   */
  async initialize(configs: VariableConfig[]): Promise<void> {
    console.log('[VariableManager] Initializing variables...')
    
    configs.forEach(config => {
      const initialValue = this.generateInitialValue(config)
      this.variables.set(config.id, {
        config,
        currentValue: initialValue,
        quality: 'good',
        lastUpdate: new Date().toISOString(),
        history: []
      })
      // Build address to id mapping
      this.addressToIdMap.set(config.address, config.id)
    })

    console.log(`[VariableManager] Initialized ${configs.length} variables`)
    
    // 启动自动更新引擎
    this.startAutoUpdate()
  }

  /**
   * 生成初始值
   */
  private generateInitialValue(config: VariableConfig): any {
    switch (config.dataType) {
      case 'BOOL':
        return false
      case 'INT':
      case 'DINT':
        return 0
      case 'REAL':
        return 0.0
      case 'STRING':
        return ''
      default:
        return null
    }
  }

  /**
   * 启动自动更新引擎
   */
  private startAutoUpdate(): void {
    if (this.autoUpdateTimer) return

    console.log('[VariableManager] Starting auto update engine...')
    this.autoUpdateTimer = setInterval(() => {
      this.updateAutoVariables()
    }, this.updateInterval)
  }

  /**
   * 更新自动模式变量
   */
  private updateAutoVariables(): void {
    const now = new Date()
    let updatedCount = 0

    this.variables.forEach((data, id) => {
      if (data.config.simulationMode === 'auto') {
        const newValue = ValueSimulator.calculateNewValue(data.config, data.currentValue)
        
        // 只有值真正改变时才更新
        if (newValue !== data.currentValue) {
          data.currentValue = newValue
          data.lastUpdate = now.toISOString()
          
          // 记录历史
          this.addHistory(id, newValue, now)
          
          // 通知WebSocket订阅者
          this.notifySubscribers(id, newValue, now)
          
          updatedCount++
        }
      }
    })

    // 可选：输出更新统计
    // if (updatedCount > 0) {
    //   console.log(`[VariableManager] Updated ${updatedCount} variables`)
    // }
  }

  /**
   * 添加历史记录
   */
  private addHistory(variableId: string, value: any, timestamp: Date): void {
    const data = this.variables.get(variableId)
    if (!data) return

    data.history.push({
      variableId,
      timestamp: timestamp.toISOString(),
      value,
      quality: data.quality
    })

    // 限制历史记录数量
    if (data.history.length > this.historyRetention) {
      data.history = data.history.slice(-this.historyRetention)
    }
  }

  /**
   * 通知WebSocket订阅者
   */
  private notifySubscribers(variableId: string, value: any, timestamp: Date): void {
    // 这个方法将在WebSocket模块中实现
    // 这里预留接口
  }

  /**
   * 获取变量值（实时）
   */
  getVariableValue(variableId: string): any {
    const data = this.variables.get(variableId)
    if (!data) {
      throw new Error(`Variable ${variableId} not found`)
    }

    // 如果是自动模式，实时计算
    if (data.config.simulationMode === 'auto') {
      const newValue = ValueSimulator.calculateNewValue(data.config, data.currentValue)
      if (newValue !== data.currentValue) {
        data.currentValue = newValue
        data.lastUpdate = new Date().toISOString()
        this.addHistory(variableId, newValue, new Date())
      }
    }

    return data.currentValue
  }

  /**
   * 设置变量值（手动模式）
   */
  setVariableValue(variableId: string, value: any): void {
    const data = this.variables.get(variableId)
    if (!data) {
      throw new Error(`Variable ${variableId} not found`)
    }

    // 切换到手动模式
    data.config.simulationMode = 'manual'

    if (data.config.dataType === 'BOOL') {
      if (typeof value === 'string') {
        value = value.toLowerCase() === 'true' || value === '1'
      } else {
        value = Boolean(value)
      }
      data.currentValue = Boolean(value)
    } else if (data.config.dataType === 'INT' || data.config.dataType === 'DINT') {
      data.currentValue = parseInt(value)
    } else if (data.config.dataType === 'REAL') {
      data.currentValue = parseFloat(value)
    } else {
      data.currentValue = value
    }
    data.lastUpdate = new Date().toISOString()
    this.addHistory(variableId, value, new Date())

    // 通知订阅者
    this.notifySubscribers(variableId, value, new Date())
  }

  /**
   * 批量获取变量值
   */
  getVariableValues(variableIds: string[]): Array<{ variableId: string; value: any; quality: DataQuality; timestamp: string }> {
    return variableIds.map(id => {
      const data = this.variables.get(id)
      if (!data) {
        return {
          variableId: id,
          value: null,
          quality: 'bad' as DataQuality,
          timestamp: new Date().toISOString()
        }
      }

      // 触发实时计算
      const value = this.getVariableValue(id)
      
      return {
        variableId: id,
        value,
        quality: data.quality,
        timestamp: data.lastUpdate
      }
    })
  }

  /**
   * 批量设置变量值
   */
  setVariableValues(writes: Array<{ variableId: string; value: any }>): Array<{ variableId: string; success: boolean; message?: string }> {
    return writes.map(write => {
      try {
        this.setVariableValue(write.variableId, write.value)
        return {
          variableId: write.variableId,
          success: true
        }
      } catch (error: any) {
        return {
          variableId: write.variableId,
          success: false,
          message: error.message
        }
      }
    })
  }

  /**
   * 获取变量配置
   */
  getVariableConfig(variableId: string): VariableConfig | undefined {
    const data = this.variables.get(variableId)
    return data?.config
  }

  /**
   * 更新变量配置
   */
  updateVariableConfig(variableId: string, updates: Partial<VariableConfig>): void {
    const data = this.variables.get(variableId)
    if (!data) {
      throw new Error(`Variable ${variableId} not found`)
    }

    Object.assign(data.config, updates)
    data.lastUpdate = new Date().toISOString()

    // 如果切换到自动模式，重置值
    if (updates.simulationMode === 'auto') {
      data.currentValue = this.generateInitialValue(data.config)
    }
  }

  /**
   * 获取所有变量
   */
  getAllVariables(): VariableData[] {
    return Array.from(this.variables.values())
  }

  /**
   * 获取变量列表（仅配置信息）
   */
  getVariableList(): VariableConfig[] {
    return Array.from(this.variables.values()).map(v => v.config)
  }

  /**
   * 获取历史数据（通过地址）
   */
  getHistoryByAddress(
    address: string,
    startTime: string,
    endTime: string,
    interval?: number
  ): HistoryDataPoint[] {
    const variableId = this.getIdByAddress(address)
    if (!variableId) return []
    return this.getHistory(variableId, startTime, endTime, interval)
  }

  /**
   * 获取历史数据
   */
  getHistory(
    variableId: string,
    startTime: string,
    endTime: string,
    interval?: number
  ): HistoryDataPoint[] {
    const data = this.variables.get(variableId)
    if (!data) return []

    let history = data.history.filter(point => {
      return point.timestamp >= startTime && point.timestamp <= endTime
    })

    // 如果指定了间隔，进行聚合
    if (interval && interval > 0) {
      history = this.aggregateHistory(history, interval)
    }

    return history
  }

  /**
   * 聚合历史数据
   */
  private aggregateHistory(history: HistoryDataPoint[], interval: number): HistoryDataPoint[] {
    if (history.length === 0) return []

    const aggregated: HistoryDataPoint[] = []
    let currentGroup: HistoryDataPoint[] = []
    let groupStartTime = new Date(history[0].timestamp).getTime()

    history.forEach(point => {
      const pointTime = new Date(point.timestamp).getTime()
      
      if (pointTime - groupStartTime < interval) {
        currentGroup.push(point)
      } else {
        // 处理当前组
        if (currentGroup.length > 0) {
          aggregated.push(this.averageGroup(currentGroup))
        }
        currentGroup = [point]
        groupStartTime = pointTime
      }
    })

    // 处理最后一组
    if (currentGroup.length > 0) {
      aggregated.push(this.averageGroup(currentGroup))
    }

    return aggregated
  }

  /**
   * 计算组的平均值
   */
  private averageGroup(points: HistoryDataPoint[]): HistoryDataPoint {
    const numericValues = points.map(p => p.value).filter(v => typeof v === 'number')
    
    if (numericValues.length === 0) {
      return points[0] // 非数值类型返回第一个点
    }

    const avg = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
    
    return {
      variableId: points[0].variableId,
      timestamp: points[Math.floor(points.length / 2)].timestamp,
      value: avg,
      quality: 'good'
    }
  }

  /**
   * 注册订阅者（通过地址）
   */
  subscribeByAddress(clientId: string, address: string): void {
    const variableId = this.getIdByAddress(address)
    if (!variableId) {
      console.warn(`[VariableManager] Cannot subscribe to unknown address: ${address}`)
      return
    }
    this.subscribe(clientId, variableId)
  }

  /**
   * 取消订阅（通过地址）
   */
  unsubscribeByAddress(clientId: string, address: string): void {
    const variableId = this.getIdByAddress(address)
    if (!variableId) return
    this.unsubscribe(clientId, variableId)
  }

  /**
   * 注册订阅者
   */
  subscribe(clientId: string, variableId: string): void {
    if (!this.subscribers.has(variableId)) {
      this.subscribers.set(variableId, new Set())
    }
    this.subscribers.get(variableId)!.add(clientId)
  }

  /**
   * 取消订阅
   */
  unsubscribe(clientId: string, variableId: string): void {
    const subscribers = this.subscribers.get(variableId)
    if (subscribers) {
      subscribers.delete(clientId)
      if (subscribers.size === 0) {
        this.subscribers.delete(variableId)
      }
    }
  }

  /**
   * 获取变量的订阅者列表
   */
  getSubscribers(variableId: string): Set<string> {
    return this.subscribers.get(variableId) || new Set()
  }

  /**
   * 停止自动更新
   */
  stop(): void {
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer)
      this.autoUpdateTimer = null
      console.log('[VariableManager] Auto update stopped')
    }
  }

  /**
   * 根据地址获取变量ID
   */
  private getIdByAddress(address: string): string | undefined {
    return this.addressToIdMap.get(address)
  }

  /**
   * 根据ID获取变量地址
   */
  private getAddressById(id: string): string | undefined {
    const data = this.variables.get(id)
    return data?.config.address
  }

  /**
   * 获取变量值（通过地址）- 实时
   */
  getVariableValueByAddress(address: string): any {
    const variableId = this.getIdByAddress(address)
    if (!variableId) {
      throw new Error(`Variable with address ${address} not found`)
    }
    return this.getVariableValue(variableId)
  }

  /**
   * 设置变量值（通过地址）- 手动模式
   */
  setVariableValueByAddress(address: string, value: any): void {
    const variableId = this.getIdByAddress(address)
    if (!variableId) {
      throw new Error(`Variable with address ${address} not found`)
    }
    this.setVariableValue(variableId, value)
  }

  /**
   * 批量获取变量值（通过地址数组）
   */
  getVariableValuesByAddresses(addresses: string[]): Array<{ variableId: string; address: string; value: any; quality: DataQuality; timestamp: string }> {
    return addresses.map(address => {
      const variableId = this.getIdByAddress(address)
      if (!variableId) {
        return {
          variableId: '',
          address,
          value: null,
          quality: 'bad' as DataQuality,
          timestamp: new Date().toISOString()
        }
      }

      // 触发实时计算
      const value = this.getVariableValue(variableId)
      const data = this.variables.get(variableId)!
      
      return {
        variableId,
        address,
        value,
        quality: data.quality,
        timestamp: data.lastUpdate
      }
    })
  }

  /**
   * 批量设置变量值（通过地址）
   */
  setVariableValuesByAddresses(writes: Array<{ address: string; value: any }>): Array<{ address: string; success: boolean; message?: string }> {
    return writes.map(write => {
      try {
        this.setVariableValueByAddress(write.address, write.value)
        return {
          address: write.address,
          success: true
        }
      } catch (error: any) {
        return {
          address: write.address,
          success: false,
          message: error.message
        }
      }
    })
  }

  /**
   * 同步配置 - 当外部配置更新时调用
   */
  async syncWithConfig(newConfigs: VariableConfig[]): Promise<void> {
    console.log('[VariableManager] Syncing with new configuration...')
    
    const existingIds = new Set(Array.from(this.variables.keys()))
    const newIds = new Set(newConfigs.map(c => c.id))
    
    // Clear and rebuild address map
    this.addressToIdMap.clear()
    
    // 1. 添加新变量
    let addedCount = 0
    newConfigs.forEach(config => {
      if (!existingIds.has(config.id)) {
        const initialValue = this.generateInitialValue(config)
        this.variables.set(config.id, {
          config,
          currentValue: initialValue,
          quality: 'good',
          lastUpdate: new Date().toISOString(),
          history: []
        })
        addedCount++
        console.log(`[VariableManager] Added new variable: ${config.label} (${config.address})`)
      } else {
        // 2. 更新已存在变量的配置
        const data = this.variables.get(config.id)!
        data.config = config
      }
      // Rebuild address mapping
      this.addressToIdMap.set(config.address, config.id)
    })
    
    // 3. 移除已删除的变量
    let removedCount = 0
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        const address = this.getAddressById(id)
        if (address) {
          this.addressToIdMap.delete(address)
        }
        this.variables.delete(id)
        removedCount++
        console.log(`[VariableManager] Removed variable: ${id}`)
      }
    })
    
    console.log(`[VariableManager] Sync complete: +${addedCount} added, -${removedCount} removed`)
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop()
    this.variables.clear()
    this.subscribers.clear()
  }
}
