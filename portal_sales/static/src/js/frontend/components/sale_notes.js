/**
 * Sale Notes Component
 * Handles saving notes for sales directly from the list view
 */

export function initSaleNotes() {
    // Handle input changes to show/hide save button
    document.addEventListener('input', (e) => {
        const textarea = e.target.closest('.sale-note-input');
        if (!textarea) return;

        const saleId = textarea.dataset.saleId;
        const originalValue = textarea.dataset.originalValue || '';
        const currentValue = textarea.value;
        const saveBtn = document.querySelector(`.sale-note-save-btn[data-sale-id="${saleId}"]`);

        if (!saveBtn) return;

        if (currentValue !== originalValue) {
            saveBtn.style.display = '';
        } else {
            saveBtn.style.display = 'none';
        }
    });

    // Handle save button click
    document.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.sale-note-save-btn');
        if (!saveBtn) return;

        e.preventDefault();
        const saleId = saveBtn.dataset.saleId;
        const textarea = document.querySelector(`.sale-note-input[data-sale-id="${saleId}"]`);
        
        if (!textarea) return;

        const note = textarea.value;

        // Disable button while saving
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50');

        try {
            const response = await fetch('/account/sale/update/note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        sale_id: saleId,
                        note: note,
                    },
                }),
            });

            const result = await response.json();
            if (result.result && result.result.status === 'success') {
                // Update original value and hide button
                textarea.dataset.originalValue = note;
                saveBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50');
        }
    });
}

