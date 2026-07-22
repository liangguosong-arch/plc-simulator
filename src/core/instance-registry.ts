import { DeviceStatusSimulator } from '../simulator/device-status'
import { AlarmGenerator } from '../simulator/alarm-generator'
import { VariableManager } from '../variables/variable-manager'
import { CommandExecutor } from '../commands/command-executor'
import { DeviceInstanceConfig, VariableConfig } from '../types/device'

/**
 * 仿真实例完整状态
 */
export interface SimulationInstance {
  instanceId: string
  config: DeviceInstanceConfig
  deviceStatus: DeviceStatusSimulator
  variableManager: VariableManager
  alarmGenerator: AlarmGenerator
  commandExecutor: CommandExecutor
  status: 'running' | 'stopped' | 'error'
  createdAt: string
  startedAt?: string
  errorMessage?: string
}

/**
 * 实例注册表 - 管理所有仿真实例的生命周期
 * 
 * 特性:
 * - 互斥锁保护并发创建/销毁操作
 * - 每个实例拥有独立的引擎（设备状态、变量、报警、命令执行）
 * - 支持创建、启动、停止、移除全生命周期
 */
export class InstanceRegistry {
  private instances: Map<string, SimulationInstance> = new Map()
  private lock: Promise<void> = Promise.resolve()

  /**
   * 获取互斥锁（防止并发创建/删除冲突）
   */
  private async acquireLock(): Promise<() => void> {
    let release: () => void
    const prev = this.lock
    this.lock = new Promise<void>(resolve => {
      release = resolve
    })
    await prev
    return release!
  }

  /**
   * 创建新实例（状态初始为 stopped）
   * @param config 设备实例配置
   * @param variables 变量配置（可选，传入时初始化但自动更新不启动）
   */
  async create(
    config: DeviceInstanceConfig,
    variables?: VariableConfig[]
  ): Promise<SimulationInstance> {
    const release = await this.acquireLock()
    try {
      if (this.instances.has(config.id)) {
        throw new Error(`Instance "${config.id}" already exists`)
      }

      const deviceStatus = new DeviceStatusSimulator(config.id)
      const variableManager = new VariableManager()
      const alarmGenerator = new AlarmGenerator(config.id)
      const commandExecutor = new CommandExecutor(deviceStatus)

      // 如果有变量配置，初始化变量但不自动启动更新引擎
      if (variables && variables.length > 0) {
        await variableManager.initialize(variables, false)
      }

      const instance: SimulationInstance = {
        instanceId: config.id,
        config,
        deviceStatus,
        variableManager,
        alarmGenerator,
        commandExecutor,
        status: 'stopped',
        createdAt: new Date().toISOString()
      }

      this.instances.set(config.id, instance)
      console.log(`[InstanceRegistry] Created instance: ${config.id}`)
      return instance
    } finally {
      release()
    }
  }

  /**
   * 启动实例
   */
  start(instanceId: string): SimulationInstance {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance "${instanceId}" not found`)
    }
    if (instance.status === 'running') {
      return instance // 幂等：已运行则忽略
    }

    instance.deviceStatus.start()
    instance.variableManager.startAutoUpdate()
    instance.status = 'running'
    instance.startedAt = new Date().toISOString()
    instance.errorMessage = undefined
    console.log(`[InstanceRegistry] Started instance: ${instanceId}`)
    return instance
  }

  /**
   * 停止实例
   */
  stop(instanceId: string): SimulationInstance {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance "${instanceId}" not found`)
    }
    if (instance.status !== 'running') {
      return instance // 幂等
    }

    instance.deviceStatus.stop()
    instance.variableManager.stop()
    instance.alarmGenerator.cleanupClearedAlarms()
    instance.status = 'stopped'
    console.log(`[InstanceRegistry] Stopped instance: ${instanceId}`)
    return instance
  }

  /**
   * 移除实例（自动停止）
   */
  remove(instanceId: string): void {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance "${instanceId}" not found`)
    }

    if (instance.status === 'running') {
      this.stop(instanceId)
    }

    instance.variableManager.stop()
    instance.deviceStatus.dispose()
    this.instances.delete(instanceId)
    console.log(`[InstanceRegistry] Removed instance: ${instanceId}`)
  }

  /**
   * 获取单个实例
   */
  get(instanceId: string): SimulationInstance | undefined {
    return this.instances.get(instanceId)
  }

  /**
   * 获取所有实例
   */
  getAll(): SimulationInstance[] {
    return Array.from(this.instances.values())
  }

  /**
   * 同步运行中实例的配置（不重启实例，仅更新内存中的config）
   */
  syncConfig(instanceId: string, config: DeviceInstanceConfig): SimulationInstance {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found in registry`)
    }
    instance.config = config
    return instance
  }

  /**
   * 检查实例是否存在
   */
  has(instanceId: string): boolean {
    return this.instances.has(instanceId)
  }

  /**
   * 获取运行中的实例ID列表
   */
  getRunningIds(): string[] {
    const running: string[] = []
    this.instances.forEach((inst, id) => {
      if (inst.status === 'running') {
        running.push(id)
      }
    })
    return running
  }

  /**
   * 获取实例摘要（用于API响应）
   */
  getSummaries(): Array<{
    instanceId: string
    name: string
    status: string
    deviceType: string
    createdAt: string
    startedAt?: string
  }> {
    return Array.from(this.instances.values()).map(inst => ({
      instanceId: inst.instanceId,
      name: inst.config.instanceName ?? inst.config.deviceModel ?? inst.instanceId,
      status: inst.status,
      deviceType: inst.config.type ?? 'unknown',
      createdAt: inst.createdAt,
      startedAt: inst.startedAt
    }))
  }

  get size(): number {
    return this.instances.size
  }
}

/** 全局唯一的注册表单例（server 生命周期内复用） */
let _registry: InstanceRegistry | null = null

export function getInstanceRegistry(): InstanceRegistry {
  if (!_registry) {
    _registry = new InstanceRegistry()
  }
  return _registry
}
