
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class StockReception extends Model {}

StockReception.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    user_id: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    }
}, { sequelize: dataDB, modelName: 'stock_reception' })
