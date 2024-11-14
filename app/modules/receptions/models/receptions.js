
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class StockReception extends Model {
    get name() {
        return this.data?.name
    }
    get reception_date() {
        const reception_date = this.data?.reception_date
        return reception_date ? reception_date.split(' ')[0] : ''
    }
    get expedition1() {
        return this.data?.expedition1 || ''
    }
    get state() {
        const state = this.data?.state
        if(!state?.value) return ''
        const colors = {
            on_hold: 'warning',
            done: 'success'
        }
        const color = colors[state?.value] || 'secondary'
        return `<span class="badge bg-${color}">${state?.label}</span>`
    }
}

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
