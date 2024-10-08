import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class KeysKey extends Model {
    listActions(actions) {
        return actions
    }
}

KeysKey.init({
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
    conf: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'keys_key' })
