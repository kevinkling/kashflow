// accounts.js - Funcionalidad relacionada con el manejo de cuentas

/**
 * Calcula el saldo de todas las cuentas
 * @param {Array} transactions - Array de transacciones
 * @returns {Object} Objeto con los saldos por cuenta
 */
function calculateAccountBalances(transactions) {
    const accountBalances = {};
    
    transactions.forEach(t => {
        const account = t.account;
        if (!accountBalances[account]) {
            accountBalances[account] = {
                name: t.account_name || t.account,
                color: t.account_color || '#6c757d',
                balance: 0
            };
        }
        accountBalances[account].balance += t.amount;
    });
    
    return accountBalances;
}

/**
 * Renderiza las top 3 cuentas con mayor saldo
 * @param {Array} transactions - Array de transacciones
 */
function renderTopAccounts(transactions) {
    const accountBalances = calculateAccountBalances(transactions);
    
    // Ordenar cuentas por saldo (mayor a menor) y tomar top 3
    const topAccounts = Object.values(accountBalances)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 3);
    
    // Renderizar top 3 cuentas
    const topAccountsContainer = document.getElementById('topAccountsContainer');
    topAccountsContainer.innerHTML = '';
    
    topAccounts.forEach((account) => {
        const balanceColor = account.balance >= 0 ? '#10b981' : '#ef4444';
        const col = document.createElement('div');
        col.className = 'col-md-4';
        
        // Encontrar el ID de la cuenta
        const accountTransaction = transactions.find(t => t.account_name === account.name);
        const accountId = accountTransaction ? accountTransaction.account : account.name;
        
        col.innerHTML = `
            <div class="card bg-secondary bg-opacity-50 account-card" 
                 data-account-id="${accountId}"
                 style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                <div class="card-body text-center py-2">
                    <div class="d-flex align-items-center justify-content-between">
                        <span class="badge" style="background-color: ${account.color}; color: ${getContrastTextColor(account.color)}">
                            ${account.name}
                        </span>
                    </div>
                    <h5 class="mb-0 mt-2 fw-bold" style="color: ${balanceColor}">
                        ${formatCurrency(account.balance)}
                    </h5>
                </div>
            </div>
        `;
        
        topAccountsContainer.appendChild(col);
        
        // Agregar event listener para el click
        const card = col.querySelector('.account-card');
        card.addEventListener('click', function() {
            const accountId = this.getAttribute('data-account-id');
            if (typeof filterByAccount === 'function') {
                filterByAccount(accountId);
            }
        });
        
        // Efecto hover
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
}

/**
 * Llena el modal con todas las cuentas ordenadas por saldo
 * @param {Array} transactions - Array de transacciones
 */
function populateAllAccountsModal(transactions) {
    const accountBalances = calculateAccountBalances(transactions);

    // Ordenar cuentas por saldo (mayor a menor)
    const allAccounts = Object.values(accountBalances)
        .sort((a, b) => b.balance - a.balance);

    // Renderizar tabla
    const tableBody = document.getElementById('allAccountsTableBody');
    tableBody.innerHTML = '';

    allAccounts.forEach(account => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.className = 'account-row';
        
        const balanceColor = account.balance >= 0 ? 'text-success' : 'text-danger';
        const statusIcon = account.balance >= 0 ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning';
        
        // Encontrar el ID de la cuenta
        const accountTransaction = transactions.find(t => t.account_name === account.name);
        const accountId = accountTransaction ? accountTransaction.account : account.name;
        
        row.setAttribute('data-account-id', accountId);
        
        row.innerHTML = `
            <td>
                <span class="badge" style="background-color: ${account.color}; color: ${getContrastTextColor(account.color)}">
                    ${account.name}
                </span>
            </td>
            <td class="text-end ${balanceColor} fw-bold">
                ${formatCurrency(account.balance)}
            </td>
            <td class="text-center">
                <i class="bi ${statusIcon}"></i>
            </td>
        `;
        
        // Agregar event listener para el click
        row.addEventListener('click', function() {
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
}

/**
 * Inicializa los event listeners relacionados con cuentas
 */
function initializeAccountsListeners() {
    // Modal de todas las cuentas
    const allAccountsModal = document.getElementById('allAccountsModal');
    if (allAccountsModal) {
        allAccountsModal.addEventListener('show.bs.modal', () => {
            // Obtener las transacciones desde el módulo principal
            if (typeof transactions !== 'undefined') {
                populateAllAccountsModal(transactions);
            }
        });
    }
}
