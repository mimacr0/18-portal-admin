/** @odoo-module **/

import { rpc } from "@web/core/network/rpc";

const systemReloadUserNotifications = async () => {

    const response = await rpc('/account/user/notifications/reload');

    if(response.status != 'success') return;

    const notificationsTitle = document.getElementById('layout-notifications-title');
    notificationsTitle.textContent = response.title;

    const notificationsList = document.getElementById('layout-notifications-list');
    notificationsList.innerHTML = response.list;

    const notificationsCountBadge = document.getElementById('layout-notifications-count-badge');
    notificationsCountBadge.textContent = response.textCount;
    notificationsCountBadge.classList.toggle('hidden', response.count === 0);

    const notificationsIndicator = document.getElementById('layout-notifications-indicator');
    notificationsIndicator.classList.toggle('invisible', response.count === 0);

}

const systemClearAllNotifications = () => {
    const notificationsList = document.getElementById('layout-notifications-list');
    notificationsList.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    systemReloadUserNotifications();
});
