
// import { Op } from 'sequelize'
import { registerEmitter } from '../../../controllers/events/register.js'
// import { DashboardKpi } from '../models/dashboard.js'


export const dashboardRegisterListeners = async () => {
    registerEmitter.on('page register', async (page) => {
        if(page.name == 'dashboard') {
            // for(const kpi of page.data.kpis)
            //     await DashboardKpi.actionRegister(kpi)

            // const kpis = await DashboardKpi.findAll({ where: { 'data.ref': { [Op.notIn]: page.data.kpis.map(kpi => kpi.ref) } } })

            // for(const kpi of kpis) await kpi.destroy()
        }
    })
}