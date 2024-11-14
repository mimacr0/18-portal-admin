
import { KPI } from './kpis/base.js'
import { StateKPI } from './kpis/state.js'
import { ChartKPI } from './kpis/chart.js'
import { LogChartKPI } from './kpis/logchart.js'
import { StationKPI } from './kpis/station.js'
import { BankKPI } from './kpis/bank.js'
import { ExchangeKPI } from './kpis/exchange.js'
import { DashboardKpi } from '../../../modules/dashboard/models/dashboard.js'
import { Page } from '../../layout/models/page.js'

const kpiMap = {
    state: StateKPI,
    chart: ChartKPI,
    station: StationKPI,
    bank: BankKPI,
    exchange: ExchangeKPI,
    logchart: LogChartKPI
}

export class Dashboard extends Page {

    async getKPIs() {
        const kpis = await DashboardKpi.findAll({ where: { user_id: this.user.id } })
        const _kpis = kpis.map(kpi => kpiMap[kpi.data.type] ? new kpiMap[kpi.data.type](kpi) : new KPI(kpi))
        _kpis.sort((a, b) => a.sequence - b.sequence)
        return _kpis
    }

    async updateKPIs(data) {
        for(const [ref, values] of Object.entries(data)) {
            await DashboardKpi.updateKpi(ref, values)
        }
    }

    async render(data={}) {
        const kpis = await this.getKPIs()
        return await super.render({ kpis, ...data })
    }

    async renderJS(data={}) {
        const kpis = await this.getKPIs()
        return await super.renderJS({ kpis, ...data })
    }

}