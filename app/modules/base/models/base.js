
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'
import { genMD5 } from '../../../tools/sys.js'
import { registerEmitter } from '../../../controllers/events/register.js'


export class SysPage extends Model {
    static async getPage(url) {
        const pages = await SysPage.findAll({
            order: [['data.sequence', 'ASC']]
        })
        const page = pages.find(m => m.data.url === url)
        if(!page) throw new Error(`Page "${url}" not found`)
        return { page, pages }
    }
    static async actionRegister(pages) {
        for(const data of pages) {
            const pid = genMD5(data.url)
            const page = await SysPage.findByPk(pid)
            await SysPage.upsert({
                id: pid,
                name: data.name,
                data: {
                    ...page?.data,
                    ...data
                }
            })
            const newPage = await SysPage.findByPk(pid)
            registerEmitter.emit('page register', newPage)
        }
    }
    hasMenu(user) {
        if(!this.data?.icon) return false
        const privilege = this.data?.privilege
        return privilege ? user.hasPrivilege(privilege) : true
    }
}

SysPage.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'sys_page' })


export class SysValue extends Model {
    static async getByKey(key, defaultValue) {
        const value = await SysValue.findByPk(genMD5(key))
        return value ? value.data : defaultValue
    }
    static async setByKey(key, data) {
        const id = genMD5(key)
        await SysValue.upsert({ id, key, data })
        return await SysValue.findByPk(id)
    }
}

SysValue.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'sys_value' })
