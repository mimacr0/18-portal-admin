
import { Section } from './section.js'

export class Screen {
    constructor(data, index, page) {
        this.index = index
        this.data = data
        this.page = page
    }
    get num() {
        return this.index + 1
    }
    get hidden() {
        return this.index >= 1
    }
    get sections() {
        return (this.data?.sections || []).map((i, index) => new Section(i, index, this.page))
    }
}