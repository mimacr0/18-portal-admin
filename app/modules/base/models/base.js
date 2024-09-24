
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'
import { genMD5 } from '../../../tools/sys.js'

import { Page } from '../components/page/page.js'

export class SysPage extends Model {
    static async getPage(pageName, user) {
        const pages = await SysPage.findAll({ order: [['data.sequence', 'ASC']] })
        const page = pages.find(m => m.data.name === pageName)
        if(!page) throw new Error(`Page "${pageName}" not found`)
        let ctx = {
            page,
            pages: user.portal ? pages.filter(p => !p.data?.access || p.data?.access === 'portal') : pages
        }
        return new Page(page, ctx)
    }
    static async getCard(cardIndex, user) {
        const [pageName, cardName] = cardIndex.split('-')
        const page = await SysPage.getPage(pageName, user)
        return page.cards.find(c => c.name === cardName)
    }
    static async actionRegister(pages) {
        for(const page of pages) {
            const pid = genMD5(page.name)
            const p = await SysPage.findByPk(pid)
            await SysPage.upsert({
                id: pid,
                name: page.name,
                data: {
                    ...p?.data,
                    ...page
                }
            })
        }
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
