
import { List } from './cards/list.js'

const cardTypes = {
    list: List
}

export class Section {
    constructor(data, index, page) {
        this.index = index
        this.data = data
        this.page = page
    }
    get num() {
        return this.index + 1
    }
    get class() {
        return this.data?.class || ''
    }
    get cards() {
        return (this.data?.cards || []).map(
            (i, index) => new cardTypes[i.type || 'list'](i, index, { page: this.page }))
    }
}