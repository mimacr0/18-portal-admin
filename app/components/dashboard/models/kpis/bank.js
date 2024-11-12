
import { KPI } from './base.js'

export class BankKPI extends KPI {
    get badges() {
        return this.data?.badges || []
    }
    get lines() {
        return this.data?.lines || []
    }
    get image() {
        return this.data?.image || ''
    }
    get chartData() {
        if(!this.data.series) return {
            series: [
                { name: 'Income', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                { name: 'Expense', data: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50] }
            ], colors: ['#808080', '#A9A9A9']
        }
        return { series: this.data.series, colors: ['#28a745', '#dc3545'] }
    }
}