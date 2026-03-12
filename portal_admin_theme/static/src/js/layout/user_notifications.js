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

    const notificationsActions = document.getElementById('layout-notifications-actions');
    notificationsActions.classList.toggle('hidden', response.count === 0);

    // Setup individual notification remove buttons
    setupNotificationRemoveButtons();
}

const systemClearAllNotifications = async () => {
    const response = await rpc('/account/user/notifications/clear');

    if(response.status === 'success') {
        // Reload notifications to update UI
        systemReloadUserNotifications();
    }
}

const systemRemoveNotification = async (notificationId) => {
    const response = await rpc(`/account/user/notifications/remove/${notificationId}`);

    if(response.status === 'success') {
        // Reload notifications to update UI
        systemReloadUserNotifications();
    }
}

const setupNotificationRemoveButtons = () => {
    const removeButtons = document.querySelectorAll('.notification-remove-button');
    removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const notificationId = button.getAttribute('data-notification-id');
            if (notificationId) {
                systemRemoveNotification(notificationId);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    systemReloadUserNotifications();

    document.addEventListener('portal.system.user.notification', (event) => {
        console.log('Reloading user notifications', event.detail);
        systemReloadUserNotifications();
    });

    // Setup clear notifications button
    const clearButton = document.getElementById('layout-clear-all-notifications-button');
    if (clearButton) {
        clearButton.addEventListener('click', (e) => {
            e.preventDefault();
            systemClearAllNotifications();
        });
    }
});
