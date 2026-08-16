import { databaseManager } from '../database/database-manager'

/**
 * 实例数据存储服务 - 通过 NeDB 管理实例及变量的持久化读写
 * 每实例一文档，instanceId 为业务主键，所有写操作幂等。
 */
export class InstanceStore {
  private static instance: InstanceStore

  private constructor() {}

  static getInstance(): InstanceStore {
    if (!InstanceStore.instance) {
      InstanceStore.instance = new InstanceStore()
    }
    return InstanceStore.instance
  }

  // ---------- 工具方法 ----------

  private get instancesDB() {
    return databaseManager.getInstancesDB()
  }

  private get instanceVariablesDB() {
    return databaseManager.getInstanceVariablesDB()
  }

  private promisify<T>(fn: (...args: any[]) => void): (...args: any[]) => Promise<T> {
    return (...args: any[]) =>
      new Promise<T>((resolve, reject) => {
        fn(...args, (err: any, result: T) => {
          if (err) reject(err)
          else resolve(result)
        })
      })
  }

  // ---------- 实例摘要 ----------

  /**
   * 检查实例是否存在
   */
  async exists(instanceId: string): Promise<boolean> {
    const count = await this.promisify<number>(this.instancesDB.count.bind(this.instancesDB))({ instanceId })
    return count > 0
  }

  /**
   * 列出所有已持久化的实例 ID
   */
  async listIds(): Promise<string[]> {
    const docs = await this.promisify<any[]>(this.instancesDB.find.bind(this.instancesDB))({}, { instanceId: 1 } as any)
    return docs.map(d => d.instanceId)
  }

  /**
   * 获取所有实例摘要（替代 _index.json）
   */
  async getAllSummaries(): Promise<Record<string, { name: string; deviceType: string; createdAt: string }>> {
    const docs = await this.promisify<any[]>(this.instancesDB.find.bind(this.instancesDB))({})
    const result: Record<string, { name: string; deviceType: string; createdAt: string }> = {}
    for (const doc of docs) {
      result[doc.instanceId] = {
        name: doc.name,
        deviceType: doc.deviceType,
        createdAt: doc.createdAt,
      }
    }
    return result
  }

  // ---------- 完整配置 ----------

  /**
   * 保存实例完整配置（config + variables），创建或全量更新
   */
  async saveFullConfig(
    instanceId: string,
    config: Record<string, unknown>,
    variables: unknown[]
  ): Promise<void> {
    const now = new Date().toISOString()
    const name = (config.instanceName as string) || instanceId
    const deviceType = (config.type as string) || 'plc'
    const createdAt = (config.createdAt as string) || now

    // 写入实例摘要文档
    await this.promisify<any>(this.instancesDB.update.bind(this.instancesDB))(
      { instanceId },
      { instanceId, config, name, deviceType, createdAt, updatedAt: now },
      { upsert: true }
    )

    // 写入变量文档
    await this.promisify<any>(this.instanceVariablesDB.update.bind(this.instanceVariablesDB))(
      { instanceId },
      { instanceId, variables, updatedAt: now },
      { upsert: true }
    )

    console.log(`[InstanceStore] Saved full config for instance: ${instanceId}`)
  }

  /**
   * 保存实例配置（仅 config 部分，不动变量）
   */
  async saveConfig(config: Record<string, unknown>): Promise<void> {
    const instanceId = config.id as string
    const now = new Date().toISOString()
    const name = (config.instanceName as string) || instanceId
    const deviceType = (config.type as string) || 'plc'
    const createdAt = (config.createdAt as string) || now

    await this.promisify<any>(this.instancesDB.update.bind(this.instancesDB))(
      { instanceId },
      { instanceId, config, name, deviceType, createdAt, updatedAt: now },
      { upsert: true }
    )

    console.log(`[InstanceStore] Saved config for instance: ${instanceId}`)
  }

  /**
   * 获取实例完整配置（并行查询两个集合后组装）
   */
  async getFullConfig(instanceId: string): Promise<{ config: Record<string, unknown>; variables: unknown[] } | null> {
    const [instDoc, varDoc] = await Promise.all([
      this.promisify<any>(this.instancesDB.findOne.bind(this.instancesDB))({ instanceId }),
      this.promisify<any>(this.instanceVariablesDB.findOne.bind(this.instanceVariablesDB))({ instanceId }),
    ])

    if (!instDoc) return null
    return {
      config: instDoc.config || {},
      variables: varDoc?.variables || [],
    }
  }

  /**
   * 获取所有实例完整配置（启动恢复用，避免 N+1 查询）
   */
  async getAllFullConfigs(): Promise<Array<{ config: Record<string, unknown>; variables: unknown[] }>> {
    const [instDocs, varDocs] = await Promise.all([
      this.promisify<any[]>(this.instancesDB.find.bind(this.instancesDB))({}),
      this.promisify<any[]>(this.instanceVariablesDB.find.bind(this.instanceVariablesDB))({}),
    ])

    const varMap = new Map<string, unknown[]>()
    for (const vd of varDocs) {
      varMap.set(vd.instanceId, vd.variables || [])
    }

    return instDocs.map(d => ({
      config: d.config || {},
      variables: varMap.get(d.instanceId) || [],
    }))
  }

  // ---------- 变量 ----------

  /**
   * 获取实例变量
   */
  async getVariables(instanceId: string): Promise<unknown[]> {
    const doc = await this.promisify<any>(this.instanceVariablesDB.findOne.bind(this.instanceVariablesDB))({ instanceId })
    return doc?.variables || []
  }

  /**
   * 保存实例变量
   */
  async saveVariables(instanceId: string, variables: unknown[]): Promise<void> {
    const now = new Date().toISOString()
    await this.promisify<any>(this.instanceVariablesDB.update.bind(this.instanceVariablesDB))(
      { instanceId },
      { instanceId, variables, updatedAt: now },
      { upsert: true }
    )
    console.log(`[InstanceStore] Saved ${variables.length} variables for instance: ${instanceId}`)
  }

  // ---------- 删除 ----------

  /**
   * 删除实例（配置 + 变量），幂等
   */
  async remove(instanceId: string): Promise<void> {
    await Promise.all([
      this.promisify<number>(this.instancesDB.remove.bind(this.instancesDB))({ instanceId }, {}),
      this.promisify<number>(this.instanceVariablesDB.remove.bind(this.instanceVariablesDB))({ instanceId }, {}),
    ])
    console.log(`[InstanceStore] Removed instance: ${instanceId}`)
  }

  /**
   * 清空所有实例及变量数据（seed --reset 使用）。
   * 注意：NeDB 的 remove 为逻辑删除，若需发行包物理干净，
   * 请由 seed 脚本在调用后删除对应的 .db 文件，由后续写入重建。
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.promisify<number>(this.instancesDB.remove.bind(this.instancesDB))({}, { multi: true }),
      this.promisify<number>(this.instanceVariablesDB.remove.bind(this.instanceVariablesDB))({}, { multi: true }),
    ])
    console.log('[InstanceStore] Cleared all instance data')
  }
}

export const instanceStore = InstanceStore.getInstance()
