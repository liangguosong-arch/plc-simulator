import { VariableConfig, VariableData, HistoryDataPoint, DataQuality } from '../types/device'

/**
 * 变量值模拟器
 */
export class ValueSimulator {
  /**
   * 根据配置计算新值
   */
  static calculateNewValue(config: VariableConfig, currentValue: any): any {
    if (!config.simulationConfig) return currentValue

    const { strategy, fluctuationRange, minValue, maxValue } = config.simulationConfig

    switch (strategy) {
      case 'random':
        return this.generateRandomValue(config, fluctuationRange || 5, currentValue)
      
      case 'sine':
        return this.generateSineValue(config)
      
      case 'binary-toggle':
        return this.generateBinaryToggleValue(config, currentValue)
      
      case 'step':
        return this.generateStepValue(config, currentValue)
      
      case 'fixed':
        return currentValue
      
      default:
        return currentValue
    }

  }
  /**
   * 生成随机值
   */
  private static generateRandomValue(config: VariableConfig, range: number, currentValue?: any): any {
    const min = config.simulationConfig?.minValue ?? 0
    const max = config.simulationConfig?.maxValue ?? 100

    if (config.dataType === 'BOOL') {
      return Math.random() > 0.5
    }

    // 基于当前值波动
    const current = typeof currentValue === 'number' ? currentValue : (min + max) / 2
    const variation = (max - min) * (range / 100)
    const newValue = current + (Math.random() - 0.5) * 2 * variation
    if (config.dataType === 'INT' || config.dataType === 'DINT') {
      return this.clamp(Math.round(newValue), min, max)
    }
    return this.clamp(newValue, min, max)
  }

  /**
   * 生成正弦波值
   */
  private static generateSineValue(config: VariableConfig): any {
    const min = config.simulationConfig?.minValue ?? 0
    const max = config.simulationConfig?.maxValue ?? 100
    const amplitude = (max - min) / 2
    const offset = min + amplitude
    const period = 10000 // 10秒周期
    const now = Date.now()

    const value = offset + amplitude * Math.sin((2 * Math.PI * now) / period)

    if (config.dataType === 'INT' || config.dataType === 'DINT') {
      return Math.round(value)
    }

    return value
  }

  /**
   * 生成二值切换值（在最小值和最大值之间交替切换）
   */
  private static generateBinaryToggleValue(config: VariableConfig, currentValue: any): any {
    const min = config.simulationConfig?.minValue ?? 0
    const max = config.simulationConfig?.maxValue ?? 100
    
    // 每5秒切换一次
    const toggleInterval = config.simulationConfig?.updateInterval ?? 5000
    const currentToggle = Math.floor(Date.now() / toggleInterval)
    
    if (config.dataType === 'BOOL') {
      return currentToggle % 2 === 0
    }

    // 在最小值和最大值之间切换
    return currentToggle % 2 === 0 ? min : max
  }

  /**
   * 生成阶梯波值
   * 从最小值开始以step步长递增到最大值，再从最大值递减到最小值，循环往复
   */
  private static generateStepValue(config: VariableConfig, currentValue: any): any {
    const min = config.simulationConfig?.minValue ?? 0
    const max = config.simulationConfig?.maxValue ?? 100
    const step = config.simulationConfig?.step ?? 10  // 默认步长为10
    const stepInterval = config.simulationConfig?.updateInterval ?? 1000  // 默认间隔1秒
    
    if (config.dataType === 'BOOL') {
      // BOOL类型不支持阶梯波，返回false
      return false
    }

    // 计算总步数
    const totalSteps = Math.floor((max - min) / step)
    if (totalSteps <= 0) {
      return min
    }

    // 计算当前处于哪个阶段（递增或递减）
    const cycleDuration = totalSteps * 2 * stepInterval  // 一个完整周期（递增+递减）的时间
    const elapsedInCycle = Date.now() % cycleDuration
    
    // 判断是递增阶段还是递减阶段
    const isIncreasing = elapsedInCycle < (totalSteps * stepInterval)
    
    let currentStepIndex: number
    if (isIncreasing) {
      // 递增阶段：从0到totalSteps
      currentStepIndex = Math.floor(elapsedInCycle / stepInterval)
    } else {
      // 递减阶段：从totalSteps到0
      const elapsedInDecrease = elapsedInCycle - (totalSteps * stepInterval)
      currentStepIndex = totalSteps - Math.floor(elapsedInDecrease / stepInterval)
    }
    
    // 计算当前值
    const value = min + currentStepIndex * step

    // 确保值在范围内
    const clampedValue = this.clamp(value, min, max)
    
    if (config.dataType === 'INT' || config.dataType === 'DINT') {
      return Math.round(clampedValue)
    }
    
    return clampedValue
  }

  /**
   * 限制数值范围
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }
}
