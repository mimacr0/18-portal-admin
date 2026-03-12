/**
 * Reception Notes Component
 * Handles saving notes for receptions directly from the list view
 */

export function initReceptionNotes() {
    // Handle input changes to show/hide save button
    document.addEventListener('input', (e) => {
        const textarea = e.target.closest('.reception-note-input');
        if (!textarea) return;

        const receptionId = textarea.dataset.receptionId;
        const originalValue = textarea.dataset.originalValue || '';
        const currentValue = textarea.value;
        const saveBtn = document.querySelector(`.reception-note-save-btn[data-reception-id="${receptionId}"]`);

        if (!saveBtn) return;

        if (currentValue !== originalValue) {
            saveBtn.style.display = '';
        } else {
            saveBtn.style.display = 'none';
        }
    });

    // Handle save button click
    document.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.reception-note-save-btn');
        if (!saveBtn) return;

        e.preventDefault();
        const receptionId = saveBtn.dataset.receptionId;
        const textarea = document.querySelector(`.reception-note-input[data-reception-id="${receptionId}"]`);
        
        if (!textarea) return;

        const note = textarea.value;

        // Disable button while saving
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50');

        try {
            const response = await fetch('/account/reception/update/note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        reception_id: receptionId,
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

