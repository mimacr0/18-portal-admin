
import { KPI } from './base.js'

export class ExchangeKPI extends KPI {
    get icon() {
        return this._data?.icon
    }
    get currency() {
        return this._data?.currency
    }
    get value() {
        return this.data?.value || '0'
    }
    get chartData() {
        if(!this.data.series) return {
            series: [
                { name: 'Log', data: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50] }
            ], colors: ['#007bff']
        }
        return { series: this.data.series, colors: ['#007bff'] }
    }
}