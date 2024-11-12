
import { KPI } from './base.js'

export class StationKPI extends KPI {
    get hasUsers() {
        return false
    }
    get cpu() {
        return {
            color: this.data.cpu > 80 ? 'danger' : this.data.cpu > 60 ? 'warning' : 'success',
            value: this.data.cpu || 0
        }
    }
    get memory() {
        return {
            color: this.data.memory > 80 ? 'danger' : this.data.memory > 60 ? 'warning' : 'success',
            value: this.data.memory || 0
        }
    }
    get storage() {
        return {
            color: this.data.storage > 80 ? 'danger' : this.data.storage > 60 ? 'warning' : 'success',
            value: this.data.storage || 0
        }
    }
    get chartData() {
        if(!this.data.series) return {
            series: [
                { name: 'CPU', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                { name: 'Memory', data: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50] },
                { name: 'Storage', data: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60] }
            ], colors: ['#808080', '#A9A9A9', '#D3D3D3']
        }
        return { series: this.data.series, colors: ['#007bff', '#28a745', '#ffc107'] }
    }
}