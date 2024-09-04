
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'
import { genMD5 } from '../../../tools/sys.js'
import { sio } from '../../../controllers/web/server.js'


export class KpisKpi extends Model {
    static async updateKpi(args, options = {}) {
        const { reload = true, del = false } = options

        const { name, ref, data } = args
        const id = genMD5(ref)
        var kpi = await KpisKpi.findByPk(id)

        if(!kpi) {
            kpi = await this.create({ id, name, data })
            if(reload) sio.emit('kpi update', kpi.id)
            return kpi
        }

        if(del) await this.destroy({ where: { id } })
        await KpisKpi.upsert({ id, name, data: { ...kpi?.data, ...data } })
        if(data?.visible && reload) sio.emit('kpi update', kpi.id)
        return kpi
    }
    static async getKPIs(page) {
        const kpis = await this.findAll({ where: { 'data.page': page } })
        return kpis.map(kpi => {
            return {
                id: kpi.id,
                ...kpi.data,
                size: kpi.data?.size || { lg: 2, md: 2, sm: 12 }
            }
        })
    }
}

KpisKpi.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'kpis_kpi' })

export class KpisDashboard extends Model {
    listActions(card) {
        let result = []

        if(card.actions.list.length > 0) result = [...card.actions.list]

        if(card.actions.crud.update) result.push({
            name: 'Update',
            icon: 'fas fa-edit',
            action: 'update'
        })

        if(card.actions.crud.delete) result.push({
            name: 'Delete',
            icon: 'fas fa-trash',
            action: 'delete'
        })

        return result
    }
}

KpisDashboard.init({
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
    },
    config: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'kpis_dashboard' })
