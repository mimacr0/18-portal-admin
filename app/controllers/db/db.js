
import { Sequelize } from 'sequelize'
import path from 'path'
import sqlite from 'better-sqlite3'

import { BASE_PATH } from '../../etc/sys.js'


export const dataDB = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(BASE_PATH, 'data', 'db', 'data.db'),
    logging: process.env?.NODE_ENV == 'development' ? console.log : false
})

export const sysDB = new sqlite(path.join(BASE_PATH, 'data', 'db', 'sys.db'))
