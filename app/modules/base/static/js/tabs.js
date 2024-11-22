
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

    for (const tab of (tabsResult.data || [])) {
        const pill = document.createElement('li');
        pill.classList.add('nav-item');
        pill.style.position = 'relative';

        const tabLink = document.createElement('a');
        tabLink.classList.add('nav-link', 'd-flex', 'align-items-center');
        if (tab.url === window.location.pathname) {
            tabLink.classList.add('active');
        }
        tabLink.href = tab.url;
        tabLink.style.paddingRight = '35px';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = tab.title;

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.classList.add('close');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.right = '10px';
        closeButton.style.top = '50%';
        closeButton.style.transform = 'translateY(-50%)';
        closeButton.style.fontSize = '1.2rem';
        closeButton.style.padding = '0 5px';
        closeButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            await jsonPost(`/users/users/tabs/remove`, { url: tab.url }, { loading: false });
            loadSystemTabs();
        });

        tabLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = tab.url;
        });

        tabLink.appendChild(titleSpan);
        pill.appendChild(tabLink);
        pill.appendChild(closeButton);
        pillContainer.classList.remove('d-flex', 'flex-wrap');
        pillContainer.classList.add('nav', 'nav-tabs');
        pillContainer.appendChild(pill);
    }

    tabs.appendChild(pillContainer);
};

loadSystemTabs();

$('a[data-tab]').click(systemRegisterTabClick)
$('div[data-tab]').click(systemRegisterTabClick)
