
import { Section } from './sections.js'

export class Screen {
    constructor(data, index, ctx) {
        this.ctx = ctx
        this.index = index
        this.data = data
    }
    get num() {
        return this.index + 1
    }
    get hidden() {
        return this.index >= 1
    }
    get sections() {
        const sections = this.data?.sections || []
        return sections.map((section, index) => new Section(section, index, this.ctx))
    }
}
