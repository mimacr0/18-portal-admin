
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'
import { genMD5 } from '../../../tools/sys.js'
import { sio } from '../../../controllers/web/servers.js'


export class DashboardKpi extends Model {
    static async updateKpi(args, options = {}) {
        const { reload = true, del = false } = options

        const { name, ref, data } = args
        const id = genMD5(ref)
        var kpi = await DashboardKpi.findByPk(id)

        if(!kpi) {
            kpi = await this.create({ id, name, data })
            if(reload) sio.emit('kpi update', kpi.id)
            return kpi
        }

        if(del) await this.destroy({ where: { id } })
        await DashboardKpi.upsert({ id, name, data: { ...kpi?.data, ...data } })
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
    static async actionRegister(kpi) {
        const id = genMD5(kpi.ref)
        await DashboardKpi.upsert({ id, data: kpi })
    }
    get type() {
        return this.data?.type || ''
    }
    get size() {
        return this.data?.size || ''
    }
    get title() {
        return this.data?.label || this.data?.title || ''
    }
    get viewData() {
        const KPIModel = KPITypes[this.type] || KPI
        return new KPIModel(this.data).formatViewData(this)
    }
}

DashboardKpi.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    },
    kpi: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    }
}, { sequelize: dataDB, modelName: 'dashboard_kpi' })
