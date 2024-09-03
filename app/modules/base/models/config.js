import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class ConfigConf extends Model {
    static async getByKey(key) {
        const item = await ConfigConf.findOne({ where: { 'data.key': key } })
        return item?.data?.conf_dict || {}
    }
    static async getByKeys(data) {
        let res = {}

        for (let [key, ref] of Object.entries(data)) {
            const item = await ConfigConf.findOne({ where: { 'data.key': ref } })
            res[key] = item?.config || {}
        }

        return res
    }
    listActions(card) {
        let result = []

        if(card.actions.list.length > 0) result = [...card.actions.list]

        if(card.actions.crud.update) result.push({
            name: 'Actualizar',
            icon: 'fas fa-edit',
            action: 'update'
        })

        if(card.actions.crud.delete) result.push({
            name: 'Eliminar',
            icon: 'fas fa-trash',
            action: 'delete'
        })

        return result
    }
    get keyValue() {
        return this.data.key
    }
}

ConfigConf.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    },
    config: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'config_item' })
