
import { KPI } from './base.js'

export class ChartKPI extends KPI {
    get series() {
        return this.data?.series || []
    }
    get mode() {
        return this._data?.mode || 'bar'
    }
    get chartData() {
        if(this.mode == 'bar') {
            const colors = this.series.map(s => s.color).filter(s => s)
            return {
                series: this.data.series,
                xaxis: { categories: (this.data.labels || []).map((l) => {
                    if(!l.includes('-')) return l
                    const parts = l.split('-')
                    return `${parts[0][0]}${parts[1][0]}${parts[2]}`
                }) },
                colors
            }
        }
        return { series: this.data.series, labels: this.data.labels, colors: this.data.colors }
    }
}