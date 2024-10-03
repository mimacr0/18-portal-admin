
import { registerEmitter } from '../../../controllers/events/register.js'
import { DashboardKpi } from '../models/dashboard.js'


export const dashboardRegisterListeners = async () => {
    registerEmitter.on('page register', async (page) => {
        if(page.name == 'dashboard') {
            for(const kpi of page.data.kpis)
                await DashboardKpi.actionRegister(kpi)
        }
    })
}