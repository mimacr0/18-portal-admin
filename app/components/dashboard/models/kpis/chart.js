
import { KPI } from './base.js'

export class ChartKPI extends KPI {
    get series() {
        return this._data?.series || []
    }
    get mode() {
        return this._data?.mode || 'bar'
    }
    get chartData() {
        if(this.mode == 'bar') {
            const series = this.series.map(s => s.label).filter(s => s)
            const colors = this.series.map(s => s.color).filter(s => s)
            return {
                series: [{ name: series[0], data: this.data.series }],
                xaxis: { categories: this.data.labels },
                colors
            }
        }
        return { series: this.data.series, labels: this.data.labels, colors: this.data.colors }
    }
}