
import { KPI } from './base.js'

export class StationKPI extends KPI {
    get hasUsers() {
        if(typeof(this._data?.hasUsers) == 'undefined') return true
        return this._data?.hasUsers
    }
}