
const systemInitLogout = () => {
    const logoutButton = document.getElementById('layout-user-logout-button');
    if (!logoutButton) return;

    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sysLayoutHistorySaveHistory([]);
        sysLayoutReloadPagesHistory();
        window.location.href = '/web/session/logout';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    systemInitLogout();
});
