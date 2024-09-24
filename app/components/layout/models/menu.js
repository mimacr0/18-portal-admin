
export class Menu {
    constructor(page) {
        this.page = page
    }
    get info() {
        return {
            name: this.page.data.name,
            url: this.page.data.url,
            title: this.page.data.title,
            icon: this.page.data.icon
        }
    }
}