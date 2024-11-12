
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class StockItem extends Model {
    get product() {
        return this.data?.product
    }
    get reception_date() {
        const reception_date = this.data?.reception_date
        return reception_date ? reception_date.split(' ')[0] : ''
    }
    get expedition1() {
        return this.data?.expedition1
    }
    get expedition() {
        return this.data?.expedition
    }
    get internal_ref() {
        return this.data?.internal_ref
    }
    get lot() {
        return this.data?.lot
    }
    get lpn() {
        return this.data?.lpn
    }
    get imei() {
        return this.data?.imei
    }
    get sku() {
        return this.data?.sku
    }
    get product_state() {
        return this.data?.product_state
    }
    get quantity() {
        return this.data?.quantity
    }
}

StockItem.init({
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
}, { sequelize: dataDB, modelName: 'stock_item' })
