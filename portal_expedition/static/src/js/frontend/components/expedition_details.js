import { rpc } from "@web/core/network/rpc";

/**

*/
export const initDetailsPage = async () => {
    console.log('Loading expedition details page...');

    const expeditionDetails = document.querySelectorAll('[data-tooltip-target]');
    if (!expeditionDetails.length) return;

    expeditionDetails.forEach(button => {
        button.addEventListener('click', async () => {
            const tooltipTarget = button.getAttribute('data-tooltip-target');
            const matches = tooltipTarget.match(/tooltip-details+-(\d+)/);
            if (!matches) return;
            const orderId = parseInt(matches[1], 10);
            window.location.href = `/account/expedition/details/${orderId}`;

        });
    });
};
