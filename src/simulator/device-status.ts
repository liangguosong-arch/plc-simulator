import { DeviceStatus, OperationMode } from '../types/device'

// 设备状态类型（使用字符串字面量）
export type DeviceStatusType = 'running' | 'stopped' | 'error' | 'maintenance' | 'offline'

/**
 * 设备状态模拟器
 */
export class DeviceStatusSimulator {
  private status: DeviceStatus
  private updateInterval: NodeJS.Timeout | null = null
  private isRunning: boolean = false

  constructor(instanceId: string) {
    this.status = {
      instanceId,
      status: 'stopped',
      mode: 'manual',
      uptime: 0,
      cycleTime: 10,
      cpuUsage: 0,
      memoryUsage: 0,
      temperature: 25,
      lastUpdateAt: new Date().toISOString()
    }
  }

  /**
   * 启动模拟
   */
  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    this.status.status = 'running'
    this.status.mode = 'auto'
    
    // 每秒更新状态
    this.updateInterval = setInterval(() => this.update(), 1000)
    
    console.log(`[DeviceSimulator] Started for device: ${this.status.instanceId}`)
  }

  /**
   * 停止模拟
   */
  stop(): void {
    if (!this.isRunning) return
    
    this.isRunning = false
    this.status.status = 'stopped'
    this.status.mode = 'manual'
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    
    console.log(`[DeviceSimulator] Stopped for device: ${this.status.instanceId}`)
  }

  /**
   * 更新状态
   */
  private update(): void {
    if (!this.isRunning) return
    
    // 更新运行时长（秒）
    this.status.uptime += 1
    
    // 模拟CPU使用率波动（30-70%）
    const currentCpu = this.status.cpuUsage || 50
    this.status.cpuUsage = this.clamp(
      currentCpu + this.randomFluctuation(-3, 3),
      30,
      70
    )
    
    // 模拟内存使用率波动（50-75%）
    const currentMem = this.status.memoryUsage || 60
    this.status.memoryUsage = this.clamp(
      currentMem + this.randomFluctuation(-1, 1),
      50,
      75
    )
    
    // 模拟温度变化（40-55°C）
    const currentTemp = this.status.temperature || 45
    this.status.temperature = this.clamp(
      currentTemp + this.randomFluctuation(-0.3, 0.3),
      40,
      55
    )
    
    // 扫描周期波动（8-12ms）
    const currentCycle = this.status.cycleTime || 10
    this.status.cycleTime = this.clamp(
      currentCycle! + this.randomFluctuation(-0.5, 0.5),
      8,
      12
    )
    
    this.status.lastUpdateAt = new Date().toISOString()
  }

  /**
   * 获取当前状态
   */
  getStatus(): DeviceStatus {
    return { ...this.status }
  }

  /**
   * 切换运行模式
   */
  switchMode(mode: OperationMode): void {
    this.status.mode = mode
    this.status.lastUpdateAt = new Date().toISOString()
  }

  /**
   * 设置设备状态
   */
  setStatus(status: DeviceStatusType): void {
    this.status.status = status
    this.status.lastUpdateAt = new Date().toISOString()
    
    if (status === 'running') {
      this.start()
    } else if (status === 'stopped') {
      this.stop()
    }
  }

  /**
   * 重置设备
   */
  reset(): void {
    this.status.uptime = 0
    this.status.cpuUsage = 35
    this.status.memoryUsage = 60
    this.status.temperature = 45
    this.status.cycleTime = 10
    this.status.lastUpdateAt = new Date().toISOString()
  }

  /**
   * 限制数值范围
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  /**
   * 生成随机波动值
   */
  private randomFluctuation(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop()
  }
}
