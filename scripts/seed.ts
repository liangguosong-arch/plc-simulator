/**
 * PLC Simulator 数据种子脚本
 *
 * 用法：
 *   npm run seed          # 若默认实例(id='0')不存在则插入示例数据
 *   npm run seed --reset  # 先清空 instances.db / instance-variables.db 再插入
 *
 * 目的：程序部署后用户可以看到示例性的实例与变量数据。
 * 发行包中会包含生成的 data/nedb/instances.db 与 data/nedb/instance-variables.db。
 */
import * as fs from 'fs'
import * as path from 'path'
import { databaseManager } from '../src/database/database-manager'
import { instanceStore } from '../src/services/instance-store'

// reset 模式下物理删除的数据文件（NeDB 的 remove 仅逻辑删除，
// 为保证发行包中的 .db 文件物理干净，直接删除文件后由写入重建）
const NEDB_DIR = path.join(__dirname, '../data/nedb')
const RESET_DB_FILES = ['instances.db', 'instance-variables.db']

function removeDatabaseFiles(): void {
  for (const file of RESET_DB_FILES) {
    const filePath = path.join(NEDB_DIR, file)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`[Seed] Deleted ${file}`)
    }
  }
}

// 默认实例配置（多实例模式：仅作为 id='0' 的示例数据，不再有"单例"语义）
const DEFAULT_INSTANCE_CONFIG: Record<string, unknown> = {
  id: '0',
  projectId: undefined,
  manufacturer: 'Siemens',
  type: 'plc',
  series: 'S7-200 SMART',
  deviceModel: 'CPU SR40',
  instanceName: 'Simulated PLC Device',
  status: 'online',
  ipAddress: '127.0.0.1',
  port: 8080
}

// 默认变量列表（I / Q / M 三种类型示例，覆盖常用仿真策略）
const DEFAULT_VARIABLES: unknown[] = [
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
    simulationConfig: { strategy: 'random', fluctuationRange: 100 }
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
    simulationConfig: { strategy: 'random', fluctuationRange: 100 }
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
    simulationConfig: { strategy: 'sine', minValue: 20, maxValue: 80 }
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
    simulationConfig: { strategy: 'random', fluctuationRange: 10, minValue: 400, maxValue: 600 }
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
    simulationConfig: { strategy: 'step', minValue: 1000, maxValue: 2500 }
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
    simulationConfig: { strategy: 'random', fluctuationRange: 5, minValue: 0, maxValue: 10000 }
  }
]

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const reset = args.includes('--reset')

  console.log('=== PLC Simulator Seed ===')
  console.log(`Reset mode: ${reset ? 'YES' : 'NO'}`)

  // 初始化数据库（NeDB，数据落在 data/nedb/）
  await databaseManager.initialize()

  if (reset) {
    console.log('Clearing existing instance data...')
    await instanceStore.clearAll()
    // 逻辑删除后物理删除数据文件，由后续写入重建干净文件
    removeDatabaseFiles()
  }

  // 幂等：默认实例已存在则跳过
  if (await instanceStore.exists('0')) {
    console.log('Default instance (id="0") already exists, skip. Use `npm run seed --reset` to rebuild.')
  } else {
    const now = new Date().toISOString()
    const config = { ...DEFAULT_INSTANCE_CONFIG, createdAt: now, updatedAt: now }
    await instanceStore.saveFullConfig('0', config, DEFAULT_VARIABLES)
    console.log(`Seeded default instance: id="0", variables=${DEFAULT_VARIABLES.length}`)
  }

  databaseManager.close()
  console.log('=== Seed Done ===')
  process.exit(0)
}

main().catch((err) => {
  console.error('[Seed] Failed:', err)
  process.exit(1)
})
