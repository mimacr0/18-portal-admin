
import { Sequelize } from 'sequelize'
import path from 'path'
import sqlite from 'better-sqlite3'

import { Logger } from '../../tools/log.js'
import sysConfig from '../../etc/sys.js'

export const dataDB = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(sysConfig.BASE_PATH, 'data', 'db', 'data.db'),
    logging: sysConfig.DB_SQL_LOG ? console.log : false
})

export const sysDB = new sqlite(path.join(sysConfig.BASE_PATH, 'data', 'db', 'sys.db'))

export const initDatabases = async () => {
    await dataDB.sync()
    Logger.info('Data DB initialized')
}
