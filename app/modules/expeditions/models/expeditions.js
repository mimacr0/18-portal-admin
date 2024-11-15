
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class ExpeditionItem extends Model {
    get name() {
        return this.data?.name
    }
    get address() {
        return this.data?.address
    }
    get date_order() {
        return this.data?.date_order
    }
    get amount_total() {
        return (this.data?.amount_total || 0).toFixed(2)
    }
    get carrier() {
        return this.data?.carrier || ''
    }
    get tracking() {
        const tracking = this.data?.tracking
        if(!tracking?.number) return ''
        return `<a href="${tracking?.url}" target="_blank">${tracking?.number}</a>`
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

ExpeditionItem.init({
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
}, { sequelize: dataDB, modelName: 'expedition_item' })


export class PartnerShipping extends Model {
    get name() {
        return this.data?.name
    }
}

PartnerShipping.init({
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
}, { sequelize: dataDB, modelName: 'partner_shipping' })
