
import { KPI } from './base.js'
import { dateInterval } from '../../../../tools/format.js'

export class LogChartKPI extends KPI {
    get series() {
        return this.data?.series || []
    }
    get mode() {
        return this._data?.mode || 'spark'
    }
    get users() {
        return this.data?.users || []
    }
    timeAgoLabel(date) {
        return dateInterval(new Date(), new Date(date))
    }
    get chartData() {
        if(!this.data.series) return {
            series: [
                { name: 'S1', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                { name: 'S2', data: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50] },
                { name: 'S3', data: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60] }
            ], colors: ['#808080', '#A9A9A9', '#D3D3D3']
        }
        return { series: this.data.series, colors: ['#007bff', '#28a745', '#ffc107'] }
    }
}