
const systemRegisterTab = async (tab) => {
    await jsonPost(`/users/users/tabs/add`, { name: tab.title, url: tab.url }, { loading: false })
    await loadSystemTabs()
    window.location.href = tab.url
}

const systemRegisterTabClick = (e) => {
    e.preventDefault()
    const url = e.currentTarget.getAttribute('data-tab')
    const title = e.currentTarget.getAttribute('data-label')
    if(!url || !title) return
    if(url.includes('#')) return
    systemRegisterTab({
        url,
        title
    })
}

const loadSystemTabs = async () => {
    const tabs = document.getElementById('systemDynamicTabs');
    if (!tabs) return;

    tabs.innerHTML = '';

    const pillContainer = document.createElement('div');
    pillContainer.classList.add('d-flex', 'flex-wrap');

    const tabsResult = await jsonGet('/users/users/tabs/list')

    if(tabsResult?.status != 'success') return

    for (const tab of tabsResult.data) {
        const pill = document.createElement('span');
        pill.classList.add('badge', 'badge-pill', 'mr-2', 'mb-2', 'd-flex', 'align-items-center');
        pill.classList.add(tab.url === window.location.pathname ? 'badge-primary' : 'badge-secondary');
        pill.style.cursor = 'pointer';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = tab.title;
        titleSpan.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = tab.url;
        });

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.classList.add('close', 'ml-2');
        closeButton.innerHTML = '&times;';
        closeButton.style.fontSize = '1.2rem';
        closeButton.style.lineHeight = '1';
        closeButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            await jsonPost(`/users/users/tabs/remove`, { url: tab.url }, { loading: false })
            loadSystemTabs();
        });

        pill.appendChild(titleSpan);
        pill.appendChild(closeButton);
        pillContainer.appendChild(pill);
    }

    tabs.appendChild(pillContainer);
};

loadSystemTabs();

$('a[data-tab]').click(systemRegisterTabClick)
