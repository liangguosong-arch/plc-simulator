import { databaseManager } from '../database/database-manager'
import { Manufacturer, Series, PLCDevice, VariableTemplate } from '../types/device'

/**
 * 设备枚举服务 - 提供PLC设备品牌、系列、型号、变量的查询接口
 */
export class DeviceCatalogService {
  private static instance: DeviceCatalogService
  
  private constructor() {}
  
  static getInstance(): DeviceCatalogService {
    if (!DeviceCatalogService.instance) {
      DeviceCatalogService.instance = new DeviceCatalogService()
    }
    return DeviceCatalogService.instance
  }
  
  /**
   * 获取所有品牌列表
   */
  async getManufacturers(options?: {
    deviceType?: string
  }): Promise<Manufacturer[]> {
    const db = databaseManager.getManufacturersDB()
    
    return new Promise((resolve, reject) => {
      let query: any = {}
      
      if (options?.deviceType) {
        query.device_types = options.deviceType
      }
      
      
      db.find(query)
        .sort({ sort_order: 1 })
        .exec((err: any, docs: Manufacturer[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(docs)
          }
        })
    })
  }
  
  /**
   * 根据ID获取品牌详情
   */
  async getManufacturerById(id: string): Promise<Manufacturer | null> {
    const db = databaseManager.getManufacturersDB()
    
    return new Promise((resolve, reject) => {
      db.findOne({ id }, (err: any, doc: Manufacturer | null) => {
        if (err) {
          reject(err)
        } else {
          resolve(doc)
        }
      })
    })
  }
  
  /**
   * 获取系列列表
   */
  async getSeries(options?: {
    manufacturerId?: string
    manufacturerName?: string  // 新增：支持按品牌名查询
  }): Promise<Series[]> {
    const db = databaseManager.getSeriesDB()
    
    return new Promise((resolve, reject) => {
      let query: any = {}
      
      if (options?.manufacturerId) {
        // 兼容旧方式：使用 manufacturer_id
        query.manufacturer_id = options.manufacturerId
      } else if (options?.manufacturerName) {
        // 新方式：使用 manufacturer_name
        query.manufacturer_name = options.manufacturerName
      }
      
      db.find(query)
        .sort({ sort_order: 1 })
        .exec((err: any, docs: Series[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(docs)
          }
        })
    })
  }
  
  /**
   * 根据ID获取系列详情
   */
  async getSeriesById(id: string): Promise<Series | null> {
    const db = databaseManager.getSeriesDB()
    
    return new Promise((resolve, reject) => {
      db.findOne({ id }, (err: any, doc: Series | null) => {
        if (err) {
          reject(err)
        } else {
          resolve(doc)
        }
      })
    })
  }
  
  /**
   * 获取PLC设备型号列表
   */
  async getPLCDevices(options?: {
    seriesId?: string
    seriesName?: string  // 新增：支持按系列名查询
    manufacturerName?: string  // 新增：支持按品牌名查询
  }): Promise<PLCDevice[]> {
    const db = databaseManager.getPLCDevicesDB()
    
    return new Promise((resolve, reject) => {
      let query: any = {}
      
      if (options?.seriesId) {
        // 兼容旧方式：使用 series_id
        query.series_id = options.seriesId
      } else if (options?.seriesName) {
        // 新方式：使用 series_name
        query.series_name = options.seriesName
        
        // 如果同时指定了 manufacturer，添加过滤
        if (options?.manufacturerName) {
          query.manufacturer_name = options.manufacturerName
        }
      } else if (options?.manufacturerName) {
        // 只按品牌查询
        query.manufacturer_name = options.manufacturerName
      }
      
      db.find(query)
        .sort({ sort_order: 1 })
        .exec((err: any, docs: PLCDevice[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(docs)
          }
        })
    })
  }
  
  /**
   * 根据ID获取PLC设备详情
   */
  async getPLCDeviceById(id: string): Promise<PLCDevice | null> {
    const db = databaseManager.getPLCDevicesDB()
    
    return new Promise((resolve, reject) => {
      db.findOne({ id }, (err: any, doc: PLCDevice | null) => {
        if (err) {
          reject(err)
        } else {
          resolve(doc)
        }
      })
    })
  }
  
  /**
   * 根据型号获取PLC设备
   */
  async getPLCDeviceByModel(model: string): Promise<PLCDevice | null> {
    const db = databaseManager.getPLCDevicesDB()
    
    return new Promise((resolve, reject) => {
      db.findOne({ model }, (err: any, doc: PLCDevice | null) => {
        if (err) {
          reject(err)
        } else {
          resolve(doc)
        }
      })
    })
  }
  
  /**
   * 获取变量模板列表
   */
  async getVariableTemplates(options?: {
    deviceModelId?: string
    deviceModel?: string  // 新增：支持按设备型号查询
    manufacturerName?: string  // 新增：支持按品牌名查询
    seriesName?: string  // 新增：支持按系列名查询
    type?: string
  }): Promise<VariableTemplate[]> {
    const db = databaseManager.getVariablesDB()
    
    return new Promise((resolve, reject) => {
      let query: any = {}
      
      if (options?.deviceModelId) {
        // 兼容旧方式
        query.device_model_id = options.deviceModelId
      } else if (options?.deviceModel) {
        // 新方式：使用 device_model
        query.device_model = options.deviceModel
        
        // 如果同时指定了 brand/series，添加过滤
        if (options?.manufacturerName) {
          query.manufacturer_name = options.manufacturerName
        }
        if (options?.seriesName) {
          query.series_name = options.seriesName
        }
      } else {
        // 只按品牌或系列查询
        if (options?.manufacturerName) {
          query.manufacturer_name = options.manufacturerName
        }
        if (options?.seriesName) {
          query.series_name = options.seriesName
        }
      }
      
      if (options?.type) {
        query.type = options.type
      }
      
      db.find(query)
        .sort({ sort_order: 1 })
        .exec((err: any, docs: VariableTemplate[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(docs)
          }
        })
    })
  }
  
  /**
   * 根据ID获取变量模板
   */
  async getVariableTemplateById(id: string): Promise<VariableTemplate | null> {
    const db = databaseManager.getVariablesDB()
    
    return new Promise((resolve, reject) => {
      db.findOne({ id }, (err: any, doc: VariableTemplate | null) => {
        if (err) {
          reject(err)
        } else {
          resolve(doc)
        }
      })
    })
  }
}

export const deviceCatalogService = DeviceCatalogService.getInstance()
