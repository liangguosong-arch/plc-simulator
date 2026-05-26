import Datastore from 'nedb'
import path from 'path'
import fs from 'fs-extra'
import util from 'util'

// Polyfill for deprecated util functions in newer Node.js versions
if (!(util as any).isDate) {
  (util as any).isDate = function(obj: any): obj is Date {
    return Object.prototype.toString.call(obj) === '[object Date]'
  }
}

if (!(util as any).isRegExp) {
  (util as any).isRegExp = function(obj: any): obj is RegExp {
    return Object.prototype.toString.call(obj) === '[object RegExp]'
  }
}

if (!(util as any).isArray) {
  (util as any).isArray = Array.isArray
}

/**
 * 数据库管理器 - 管理 NeDB 数据库集合
 */
export class DatabaseManager {
  private static instance: DatabaseManager
  private dbPath: string
  
  // 五个集合实例
  private manufacturersDB: Datastore<any>
  private seriesDB: Datastore<any>
  private plcDevicesDB: Datastore<any>
  private hmiDevicesDB: Datastore<any>
  private variablesDB: Datastore<any>
  
  private constructor() {
    this.dbPath = path.join(__dirname, '../../data/nedb')
    
    // 初始化集合
    this.manufacturersDB = this.createCollection('manufacturers')
    this.seriesDB = this.createCollection('series')
    this.plcDevicesDB = this.createCollection('plc-devices')
    this.hmiDevicesDB = this.createCollection('hmi-devices')
    this.variablesDB = this.createCollection('variables')
  }
  
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }
  
  /**
   * 创建集合
   */
  private createCollection(name: string): Datastore<any> {
    const db = new Datastore({
      filename: path.join(this.dbPath, `${name}.db`),
      autoload: true,
    })
    
    fs.ensureDirSync(this.dbPath)
    console.log(`[DatabaseManager] Collection initialized: ${name}`)
    return db
  }
  
  /**
   * Promisify NeDB 方法
   */
  private promisifyDbMethod<T>(method: any, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      method(...args, (err: any, result: T) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }
  
  /**
   * 统计文档数量
   */
  private async countDocuments(db: Datastore<any>, query: any): Promise<number> {
    return this.promisifyDbMethod<number>(db.count.bind(db), query)
  }
  
  /**
   * 检查数据库是否已存在且有数据
   */
  private async hasExistingData(): Promise<boolean> {
    try {
      const manufacturersCount = await this.countDocuments(this.manufacturersDB, {})
      return manufacturersCount > 0
    } catch (error) {
      console.warn('[DatabaseManager] Failed to check existing data:', error)
      return false
    }
  }
  
  /**
   * 从 resources 目录复制预填充的数据库文件
   */
  private async copyPrepopulatedDatabase(): Promise<void> {
    const resourcesDbPath = path.join(__dirname, '../../resources/nedb')
    
    // 检查 resources 中是否有预填充数据库
    if (!await fs.pathExists(resourcesDbPath)) {
      console.log('[DatabaseManager] No prepopulated database found in resources')
      return
    }
    
    console.log('[DatabaseManager] Copying prepopulated database from resources...')
    
    const dbFiles = [
      'manufacturers.db',
      'series.db',
      'plc-devices.db',
      'hmi-devices.db',
      'variables.db'
    ]
    
    for (const file of dbFiles) {
      const sourceFile = path.join(resourcesDbPath, file)
      const targetFile = path.join(this.dbPath, file)
      
      if (await fs.pathExists(sourceFile)) {
        await fs.copy(sourceFile, targetFile, { overwrite: true })
        console.log(`[DatabaseManager] Copied ${file} from resources`)
      } else {
        console.warn(`[DatabaseManager] Prepopulated ${file} not found in resources`)
      }
    }
    
    console.log('[DatabaseManager] Prepopulated database copied successfully')
  }
  
  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    try {
      console.log('[DatabaseManager] Initializing NeDB database...')
      console.log(`[DatabaseManager] Database path: ${this.dbPath}`)
      
      await fs.ensureDir(this.dbPath)
      console.log('[DatabaseManager] Database directory ensured')
      
      // 检查是否有现有数据
      const hasData = await this.hasExistingData()
      
      if (!hasData) {
        console.log('[DatabaseManager] No existing data found, checking for prepopulated database...')
        // 首次运行：从 resources 复制预填充数据库
        await this.copyPrepopulatedDatabase()
        
        // 再次检查是否成功复制
        const hasDataAfterCopy = await this.hasExistingData()
        if (!hasDataAfterCopy) {
          console.warn('[DatabaseManager] Database is empty. Please run "npm run db:import" before building the app.')
        }
      } else {
        console.log('[DatabaseManager] Existing database found, skipping prepopulated copy')
      }
      
      // 建立索引
      console.log('[DatabaseManager] Creating indexes...')
      await this.createIndexes()
      console.log('[DatabaseManager] Indexes created')
      
      console.log('[DatabaseManager] NeDB initialization completed successfully!')
    } catch (error: any) {
      console.error('[DatabaseManager] Database initialization failed:', error.message)
      console.error('[DatabaseManager] Stack trace:', error.stack)
      throw error
    }
  }
  
  /**
   * 创建索引
   */
  private async createIndexes(): Promise<void> {
    // manufacturers
    this.manufacturersDB.ensureIndex({ fieldName: 'device_types' })
    this.manufacturersDB.ensureIndex({ fieldName: 'sort_order' })
    
    // series
    this.seriesDB.ensureIndex({ fieldName: 'manufacturer_id' })
    this.seriesDB.ensureIndex({ fieldName: 'type' })
    
    // plc_devices
    this.plcDevicesDB.ensureIndex({ fieldName: 'series_id' })
    this.plcDevicesDB.ensureIndex({ fieldName: 'model', unique: true })
    
    // hmi_devices
    this.hmiDevicesDB.ensureIndex({ fieldName: 'manufacturer_id' })
    this.hmiDevicesDB.ensureIndex({ fieldName: 'model', unique: true })
    
    // variables
    this.variablesDB.ensureIndex({ fieldName: 'device_model_id' })
    this.variablesDB.ensureIndex({ fieldName: 'type' })
    this.variablesDB.ensureIndex({ fieldName: 'value' })
    
    console.log('[DatabaseManager] All indexes created')
  }
  
  /**
   * 获取集合实例
   */
  getManufacturersDB(): Datastore<any> {
    return this.manufacturersDB
  }
  
  getSeriesDB(): Datastore<any> {
    return this.seriesDB
  }
  
  getPLCDevicesDB(): Datastore<any> {
    return this.plcDevicesDB
  }
  
  getHMIDevicesDB(): Datastore<any> {
    return this.hmiDevicesDB
  }
  
  getVariablesDB(): Datastore<any> {
    return this.variablesDB
  }
  
  /**
   * 关闭数据库
   */
  close(): void {
    console.log('[DatabaseManager] Closing NeDB collections...')
  }
}

export const databaseManager = DatabaseManager.getInstance()
