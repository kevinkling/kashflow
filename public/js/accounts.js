// accounts.js - Funcionalidad relacionada con el manejo de cuentas

/**
 * Renderiza las top 3 cuentas con mayor saldo (SOLO ACTIVAS)
 * Se obtienen directamente del backend filtradas
 */
async function renderTopAccounts() {
    try {
        const response = await fetch('/api/cuentas');
        if (!response.ok) throw new Error('Error al obtener top accounts');
        const accounts = await response.json();

        // La API ya devuelve ordenado por saldo DESC y solo activas
        const topAccounts = accounts.slice(0, 3);

        const topAccountsContainer = document.getElementById('topAccountsContainer');
        topAccountsContainer.innerHTML = '';

        topAccounts.forEach((account) => {
            const balance = parseFloat(account.saldo_actual);
            const balanceColor = balance >= 0 ? '#10b981' : '#ef4444';
            const col = document.createElement('div');
            col.className = 'col-md-4';

            col.innerHTML = `
                <div class="card bg-secondary bg-opacity-50 account-card" 
                     data-account-id="${account.cuenta_id}"
                     style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                    <div class="card-body text-center py-2">
                        <div class="d-flex align-items-center justify-content-between">
                            <span class="badge" style="background-color: ${account.color}; color: ${getContrastTextColor(account.color)}">
                                ${account.cuenta}
                            </span>
                        </div>
                        <h5 class="mb-0 mt-2 fw-bold" style="color: ${balanceColor}">
                            ${formatCurrency(balance)}
                        </h5>
                    </div>
                </div>
            `;

            topAccountsContainer.appendChild(col);

            // Agregar event listener para el click
            const card = col.querySelector('.account-card');
            card.addEventListener('click', function () {
                const accountId = this.getAttribute('data-account-id');
                if (typeof filterByAccount === 'function') {
                    filterByAccount(accountId);
                }
            });

            // Efecto hover
            card.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
            });

            card.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        });
    } catch (error) {
        console.error('Error al renderizar top accounts:', error);
    }
}

/**
 * Llena el modal con todas las cuentas activas
 */
async function populateAllAccountsModal() {
    try {
        const response = await fetch('/api/cuentas');
        if (!response.ok) throw new Error('Error al obtener cuentas');

        const accounts = await response.json();

        // Renderizar tabla
        const tableBody = document.getElementById('allAccountsTableBody');
        tableBody.innerHTML = '';

        if (accounts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No hay cuentas activas</td></tr>';
            return;
        }

        accounts.forEach(account => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.className = 'account-row';

            const balance = parseFloat(account.saldo_actual);
            const balanceColor = balance >= 0 ? 'text-success' : 'text-danger';

            row.setAttribute('data-account-id', account.cuenta_id);

            row.innerHTML = `
                <td>
                    <span class="badge" style="background-color: ${account.color}; color: ${getContrastTextColor(account.color)}">
                        ${account.cuenta}
                    </span>
                </td>
                <td class="text-end ${balanceColor} fw-bold">
                    ${formatCurrency(balance)}
                </td>
            `;

            // Agregar event listener para el click
            row.addEventListener('click', function () {
                const accountId = this.getAttribute('data-account-id');
                if (typeof filterByAccount === 'function') {
                    // Cerrar el modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('allAccountsModal'));
                    if (modal) {
                        modal.hide();
                    }

                    // Aplicar filtro
                    filterByAccount(accountId);
                }
            });

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error al cargar cuentas en el modal:', error);
        const tableBody = document.getElementById('allAccountsTableBody');
        tableBody.innerHTML = `<tr><td colspan="2" class="text-center text-danger">Error al cargar las cuentas</td></tr>`;
    }
}

/**
 * Inicializa los event listeners relacionados con cuentas
 */
function initializeAccountsListeners() {
    // Modal de todas las cuentas
    const allAccountsModal = document.getElementById('allAccountsModal');
    if (allAccountsModal) {
        allAccountsModal.addEventListener('show.bs.modal', () => {
            populateAllAccountsModal();
        });
    }
}
