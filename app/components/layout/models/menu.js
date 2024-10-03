
export class Menu {
    constructor(page) {
        this.page = page
    }

    get name() {
        return this.page.data.name
    }
    get title() {
        return this.page.data.title
    }
    get url() {
        return this.page.data.url
    }
    get icon() {
        return this.page.data.icon
    }
    get action() {
        return this.page.data.action
    }
}