import { databaseManager } from './database-manager'
import Datastore from 'nedb'

/**
 * 数据库迁移工具 - 将 _id 关联改为业务字段关联
 */
export class DatabaseMigration {
  private dbManager = databaseManager
  
  /**
   * 执行迁移
   */
  async migrate(): Promise<void> {
    try {
      console.log('[Migration] Starting database migration...')
      
      // Step 1: 更新 Series 集合，添加 manufacturer_name 字段
      await this.migrateSeries()
      
      // Step 2: 更新 PLC Devices 集合，添加 manufacturer_name 和 series_name 字段
      await this.migratePLCDevices()
      
      // Step 3: 更新 Variable Templates 集合，添加 device_model 字段
      await this.migrateVariableTemplates()
      
      // Step 4: 创建新的索引
      await this.createNewIndexes()
      
      console.log('[Migration] ✅ Database migration completed successfully!')
    } catch (error: any) {
      console.error('[Migration] ❌ Database migration failed:', error.message)
      throw error
    }
  }
  
  /**
   * 迁移 Series 集合
   */
  private async migrateSeries(): Promise<void> {
    console.log('[Migration] Migrating Series collection...')
    
    const seriesDB = this.dbManager.getSeriesDB()
    const manufacturersDB = this.dbManager.getManufacturersDB()
    
    return new Promise((resolve, reject) => {
      seriesDB.find({}, async (err: any, seriesList: any[]) => {
        if (err) {
          reject(err)
          return
        }
        
        let updatedCount = 0
        
        for (const series of seriesList) {
          try {
            // 查找对应的 manufacturer
            const manufacturer = await this.findById(manufacturersDB, series.manufacturer_id)
            
            if (manufacturer) {
              // 添加 manufacturer_name 字段
              const updates: any = {
                manufacturer_name: manufacturer.name_en || manufacturer.name
              }
              
              await this.updateDocument(seriesDB, series._id, updates)
              updatedCount++
            }
          } catch (error: any) {
            console.warn(`[Migration] Failed to migrate series ${series._id}:`, error.message)
          }
        }
        
        console.log(`[Migration] Updated ${updatedCount} series with manufacturer_name`)
        resolve()
      })
    })
  }
  
  /**
   * 迁移 PLC Devices 集合
   */
  private async migratePLCDevices(): Promise<void> {
    console.log('[Migration] Migrating PLC Devices collection...')
    
    const plcDevicesDB = this.dbManager.getPLCDevicesDB()
    const seriesDB = this.dbManager.getSeriesDB()
    const manufacturersDB = this.dbManager.getManufacturersDB()
    
    return new Promise((resolve, reject) => {
      plcDevicesDB.find({}, async (err: any, devices: any[]) => {
        if (err) {
          reject(err)
          return
        }
        
        let updatedCount = 0
        
        for (const device of devices) {
          try {
            // 查找对应的 series
            const series = await this.findById(seriesDB, device.series_id)
            
            if (series) {
              // 查找对应的 manufacturer
              const manufacturer = await this.findById(manufacturersDB, series.manufacturer_id)
              
              const updates: any = {
                manufacturer_name: manufacturer?.name_en || manufacturer?.name || '',
                series_name: series.name_en || series.name
              }
              
              await this.updateDocument(plcDevicesDB, device._id, updates)
              updatedCount++
            }
          } catch (error: any) {
            console.warn(`[Migration] Failed to migrate device ${device._id}:`, error.message)
          }
        }
        
        console.log(`[Migration] Updated ${updatedCount} PLC devices with manufacturer_name and series_name`)
        resolve()
      })
    })
  }
  
  /**
   * 迁移 Variable Templates 集合
   */
  private async migrateVariableTemplates(): Promise<void> {
    console.log('[Migration] Migrating Variable Templates collection...')
    
    const variablesDB = this.dbManager.getVariablesDB()
    const plcDevicesDB = this.dbManager.getPLCDevicesDB()
    
    return new Promise((resolve, reject) => {
      variablesDB.find({}, async (err: any, templates: any[]) => {
        if (err) {
          reject(err)
          return
        }
        
        let updatedCount = 0
        
        for (const template of templates) {
          try {
            // 查找对应的 device
            const device = await this.findById(plcDevicesDB, template.device_model_id)
            
            if (device) {
              const updates: any = {
                device_model: device.model,
                manufacturer_name: device.manufacturer_name || '',
                series_name: device.series_name || ''
              }
              
              await this.updateDocument(variablesDB, template._id, updates)
              updatedCount++
            }
          } catch (error: any) {
            console.warn(`[Migration] Failed to migrate template ${template._id}:`, error.message)
          }
        }
        
        console.log(`[Migration] Updated ${updatedCount} variable templates with device_model`)
        resolve()
      })
    })
  }
  
  /**
   * 创建新的索引
   */
  private async createNewIndexes(): Promise<void> {
    console.log('[Migration] Creating new indexes...')
    
    const seriesDB = this.dbManager.getSeriesDB()
    const plcDevicesDB = this.dbManager.getPLCDevicesDB()
    const variablesDB = this.dbManager.getVariablesDB()
    
    // Series 集合索引
    seriesDB.ensureIndex({ fieldName: 'manufacturer_name' })
    seriesDB.ensureIndex({ fieldName: 'name_en' })
    
    // PLC Devices 集合索引
    plcDevicesDB.ensureIndex({ fieldName: 'manufacturer_name' })
    plcDevicesDB.ensureIndex({ fieldName: 'series_name' })
    plcDevicesDB.ensureIndex({ fieldName: 'model', unique: true })
    
    // Variables 集合索引
    variablesDB.ensureIndex({ fieldName: 'device_model' })
    variablesDB.ensureIndex({ fieldName: 'manufacturer_name' })
    variablesDB.ensureIndex({ fieldName: 'series_name' })
    
    console.log('[Migration] New indexes created')
  }
  
  /**
   * 根据 _id 查找文档
   */
  private findById(db: Datastore<any>, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      db.findOne({ _id: id }, (err: any, doc: any) => {
        if (err) {
          reject(err)
        } else {
          resolve(doc)
        }
      })
    })
  }
  
  /**
   * 更新文档
   */
  private updateDocument(db: Datastore<any>, id: string, updates: any): Promise<void> {
    return new Promise((resolve, reject) => {
      db.update(
        { _id: id },
        { $set: updates },
        {},
        (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })
  }
  
  /**
   * 回滚迁移（删除新增的字段）
   */
  async rollback(): Promise<void> {
    try {
      console.log('[Migration] Rolling back database migration...')
      
      const seriesDB = this.dbManager.getSeriesDB()
      const plcDevicesDB = this.dbManager.getPLCDevicesDB()
      const variablesDB = this.dbManager.getVariablesDB()
      
      // 删除 Series 中的 manufacturer_name
      await this.removeField(seriesDB, 'manufacturer_name')
      
      // 删除 PLC Devices 中的 manufacturer_name 和 series_name
      await this.removeField(plcDevicesDB, 'manufacturer_name')
      await this.removeField(plcDevicesDB, 'series_name')
      
      // 删除 Variables 中的 device_model, manufacturer_name, series_name
      await this.removeField(variablesDB, 'device_model')
      await this.removeField(variablesDB, 'manufacturer_name')
      await this.removeField(variablesDB, 'series_name')
      
      console.log('[Migration] ✅ Database migration rolled back successfully!')
    } catch (error: any) {
      console.error('[Migration] ❌ Rollback failed:', error.message)
      throw error
    }
  }
  
  /**
   * 删除字段
   */
  private removeField(db: Datastore<any>, fieldName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.update(
        { [fieldName]: { $exists: true } },
        { $unset: { [fieldName]: '' } },
        { multi: true },
        (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })
  }
}

export const databaseMigration = new DatabaseMigration()
