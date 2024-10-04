import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class ConfigConf extends Model {
    static async getByKey(key) {
        const item = await ConfigConf.findOne({ where: { 'data.key': key } })
        return item?.config || {}
    }
    static async getByKeys(data) {
        let res = {}

        for (let [key, ref] of Object.entries(data)) {
            const item = await ConfigConf.findOne({ where: { 'data.key': ref } })
            res[key] = item?.config || {}
        }

        return res
    }
    listActions(actions) {
        return actions
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
