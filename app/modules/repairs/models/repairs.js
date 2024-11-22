
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class StockRepairs extends Model {
    get name() {
        return this.data?.name
    }
    get date() {
        return this.data?.date
    }
    get products() {
        const type = this.data?.type
        if(type == 'REPAIR') return [this.data?.product]
        if(type == 'REVIEW') return this.data?.lines.map(l => l.product_id.name)
    }
    get state() {
        return this.data?.state
    }
    get notes() {
        return this.data?.observations
    }
    get problem() {
        return this.data?.problem
    }
    get notesText() {
        return (this.data?.observations || '').replace(/<[^>]*>/g, '')
    }
    get problemText() {
        return (this.data?.problem || '').replace(/<[^>]*>/g, '')
    }
}

StockRepairs.init({
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
}, { sequelize: dataDB, modelName: 'stock_repair' })
