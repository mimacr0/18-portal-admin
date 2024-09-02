
import { Sequelize } from 'sequelize'
import path from 'path'

import { BASE_PATH } from '../../etc/sys.js'


export const dataDB = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(BASE_PATH, 'data', 'db', 'data.db'),
    logging: process.env?.NODE_ENV == 'development' ? console.log : false
})