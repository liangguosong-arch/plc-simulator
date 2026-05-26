import { databaseMigration } from '../src/database/database-migration'

/**
 * 数据库迁移脚本入口
 * 使用方法: npx ts-node scripts/migrate-database.ts
 */

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'migrate'
  
  try {
    switch (command) {
      case 'migrate':
        console.log('[Migration Script] Starting database migration...')
        await databaseMigration.migrate()
        console.log('[Migration Script] ✅ Migration completed successfully!')
        break
      
      case 'rollback':
        console.log('[Migration Script] Rolling back database migration...')
        await databaseMigration.rollback()
        console.log('[Migration Script] ✅ Rollback completed successfully!')
        break
      
      default:
        console.log(`Unknown command: ${command}`)
        console.log('Usage:')
        console.log('  npm run db:migrate          # Execute migration')
        console.log('  npm run db:rollback         # Rollback migration')
        process.exit(1)
    }
    
    process.exit(0)
  } catch (error: any) {
    console.error('[Migration Script] ❌ Operation failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
