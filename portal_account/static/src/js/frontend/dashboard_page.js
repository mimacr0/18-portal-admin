
import { reloadReceptionsCountKpis } from './kpis/receptions_count';
import { reloadExpeditionsCountKpis } from './kpis/expeditions_count';


const reloadDashboardPage = async () => {
    await reloadReceptionsCountKpis();
    await reloadExpeditionsCountKpis();
}

document.addEventListener('DOMContentLoaded', () => {
    reloadDashboardPage();
});
