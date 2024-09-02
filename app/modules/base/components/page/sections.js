
import { Card } from './card.js'

export class Section {
    constructor(data, index, ctx) {
        this.ctx = ctx
        this.index = index
        this.data = data
    }
    get num() {
        return this.index + 1
    }
    get cards() {
        const cards = this.data?.cards || []
        return cards.map((card, index) => new Card(card, index, this.ctx))
    }
    get class() {
        return this.data?.class || ''
    }
}