
let systemDynamicTabs = JSON.parse(localStorage.getItem('systemDynamicTabs')) || []

const systemRegisterTab = (tab) => {
    const item = systemDynamicTabs.find(t => t.url === tab.url)
    if(item) return window.location.href = tab.url
    systemDynamicTabs.push(tab)
    localStorage.setItem('systemDynamicTabs', JSON.stringify(systemDynamicTabs))
    loadSystemTabs()
    window.location.href = tab.url
}

const systemRegisterTabClick = (e) => {
    e.preventDefault()
    const url = e.currentTarget.getAttribute('href')
    const title = e.currentTarget.textContent.trim()
    if(!url || !title) return
    if(url.includes('#')) return
    systemRegisterTab({
        url,
        title
    })
}

const loadSystemTabs = () => {
    const tabs = document.getElementById('systemDynamicTabs');
    if (!tabs) return;

    tabs.innerHTML = '';

    const pillContainer = document.createElement('div');
    pillContainer.classList.add('d-flex', 'flex-wrap');

    for (const tab of systemDynamicTabs) {
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
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = systemDynamicTabs.findIndex(t => t.url === tab.url);
            systemDynamicTabs.splice(index, 1);
            localStorage.setItem('systemDynamicTabs', JSON.stringify(systemDynamicTabs));
            loadSystemTabs();
        });

        pill.appendChild(titleSpan);
        pill.appendChild(closeButton);
        pillContainer.appendChild(pill);
    }

    tabs.appendChild(pillContainer);
};

loadSystemTabs();

$('a').click(systemRegisterTabClick);