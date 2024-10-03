
import  { KPI } from './kpis/base.js'
import  { StateKPI } from './kpis/state.js'
import { DashboardKpi } from '../../../modules/dashboard/models/dashboard.js'
import { Page } from '../../layout/models/page.js'

const kpiMap = {
    state: StateKPI
}

export class Dashboard extends Page {

    async statusKPIs() {
        const kpis = await DashboardKpi.findAll({ where: { 'data.type': 'state' } })
        return kpis.map(kpi => kpiMap[kpi.data.type] ? new kpiMap[kpi.data.type](kpi) : new KPI(kpi))
    }

}