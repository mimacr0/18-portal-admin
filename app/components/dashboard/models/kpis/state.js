
import { KPI } from './base.js'

export class StateKPI extends KPI {
    get label() {
        return this._data?.label
    }
    get symbol() {
        return this._data?.symbol
    }
    get icon() {
        return this._data?.icon
    }
    get value() {
        return this.data?.value || '0'
    }
    get url() {
        return this._data?.url || ''
    }
}