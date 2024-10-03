
export const formatMenus = (page, pages) => {
    return pages.map(p => {
        return {
            name: p.data.name,
            url: p.data.url,
            active: p.data.url === page.data.url,
            title: p.data.title,
            icon: p.data.icon
        }
    })
}