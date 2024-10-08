
import  { KPI } from './kpis/base.js'
import  { StateKPI } from './kpis/state.js'
import  { ChartKPI } from './kpis/chart.js'
import  { StationKPI } from './kpis/station.js'
import { DashboardKpi } from '../../../modules/dashboard/models/dashboard.js'
import { Page } from '../../layout/models/page.js'

const kpiMap = {
    state: StateKPI,
    chart: ChartKPI,
    station: StationKPI
}

export class Dashboard extends Page {

    async getKPIs() {
        const kpis = await DashboardKpi.findAll({})
        return kpis.map(kpi => kpiMap[kpi.data.type] ? new kpiMap[kpi.data.type](kpi) : new KPI(kpi))
    }

    async updateKPIs(data) {
        for(const [ref, values] of Object.entries(data)) {
            await DashboardKpi.updateKpi(ref, values)
        }
    }

    async render() {
        const kpis = await this.getKPIs()
        return await super.render({ kpis })
    }

    async renderJS() {
        const kpis = await this.getKPIs()
        return await super.renderJS({ kpis })
    }

}