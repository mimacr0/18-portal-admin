
import { WebsocketWorker } from "@bus/workers/websocket_worker";


const initInvoiceDetailsChatterLiveService = () => {

    const session = odoo.__session_info__ || {};
    const startedAt = luxon.DateTime.now().set({ milliseconds: 0 });

    let uid = Array.isArray(session.user_id) ? session.user_id[0] : session.uid;
    if (!uid && uid !== undefined) {
        uid = false;
    }

    const websocketWorker = new WebsocketWorker();

    websocketWorker.registerClient(self);
    websocketWorker._initializeConnection(self, {
        websocketURL: `${window.origin.replace("http", "ws")}/websocket?version=${
            session.websocket_worker_version
        }`,
        db: session.db,
        debug: odoo.loader.debug,
        lastNotificationId: 0,
        uid,
        startTs: startedAt.valueOf()
    });

    websocketWorker._start();

    websocketWorker.websocket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        for(const action of data) {
            const message = action.message;
            if(message.type === 'portal_exoedition.portal_expedition_details_page') {
                document.dispatchEvent(new CustomEvent('portal_expedition.portal_expedition_details_page', { detail: message.payload }));
            }
        }
    });

}

document.addEventListener('DOMContentLoaded', () => {
    // initInvoiceDetailsChatterLiveService();
});
