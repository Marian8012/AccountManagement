// Dashboard Module
const dashboard = {
    incomeChart: null,
    transactionChart: null,
    deleteTransactionId: null,
    
    // Initialize dashboard
    init: function() {
        // Check if user is logged in
        if (!auth.isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }
        
        // Set default date to today
        document.getElementById('transactionDate').valueAsDate = new Date();
        
        // Load and display transactions
        this.loadTransactions();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize theme
        this.initTheme();
        
        // Initialize charts
        this.initCharts();
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        // Filter and search
        document.getElementById('filterType').addEventListener('change', () => this.loadTransactions());
        document.getElementById('filterStartDate').addEventListener('change', () => this.loadTransactions());
        document.getElementById('filterEndDate').addEventListener('change', () => this.loadTransactions());
        document.getElementById('searchInput').addEventListener('input', () => this.loadTransactions());
        
        // Reset modal on close
        const transactionModal = document.getElementById('transactionModal');
        transactionModal.addEventListener('hidden.bs.modal', () => {
            document.getElementById('transactionForm').reset();
            document.getElementById('transactionId').value = '';
            document.getElementById('modalTitle').textContent = 'Add Transaction';
            document.getElementById('transactionDate').valueAsDate = new Date();
        });
        
        // Delete confirmation
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            if (this.deleteTransactionId) {
                const result = transactions.delete(this.deleteTransactionId);
                if (result.success) {
                    this.showAlert(result.message, 'success');
                    this.loadTransactions();
                    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                    deleteModal.hide();
                } else {
                    this.showAlert(result.message, 'error');
                }
                this.deleteTransactionId = null;
            }
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    },
    
    // Load and display transactions
    loadTransactions: function() {
        const type = document.getElementById('filterType').value;
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;
        const searchQuery = document.getElementById('searchInput').value;
        
        // Get filtered transactions
        const filteredTransactions = transactions.filter(type, startDate, endDate, searchQuery);
        
        // Calculate totals
        const totals = transactions.calculateTotals(filteredTransactions);
        
        // Update summary cards
        document.getElementById('totalCredit').textContent = transactions.formatCurrency(totals.credit);
        document.getElementById('totalDebit').textContent = transactions.formatCurrency(totals.debit);
        document.getElementById('currentBalance').textContent = transactions.formatCurrency(totals.balance);
        
        // Update balance card color based on value
        const balanceCard = document.querySelector('#currentBalance').closest('.card');
        if (totals.balance >= 0) {
            balanceCard.className = 'card bg-primary text-white shadow-sm';
        } else {
            balanceCard.className = 'card bg-danger text-white shadow-sm';
        }
        
        // Update transactions table
        this.renderTransactionsTable(filteredTransactions);
        
        // Update charts
        this.updateCharts(filteredTransactions);
    },
    
    // Render transactions table
    renderTransactionsTable: function(transactionsList) {
        const tbody = document.getElementById('transactionsTableBody');
        
        if (transactionsList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No transactions found. Add your first transaction!</td></tr>';
            return;
        }
        
        tbody.innerHTML = transactionsList.map(t => {
            const typeBadge = t.type === 'credit' 
                ? '<span class="badge bg-success">Credit</span>' 
                : '<span class="badge bg-danger">Debit</span>';
            
            const amountColor = t.type === 'credit' ? 'text-success' : 'text-danger';
            const amountSymbol = t.type === 'credit' ? '+' : '-';
            
            return `
                <tr>
                    <td>${transactions.formatDate(t.date)}</td>
                    <td>${typeBadge}</td>
                    <td>${this.escapeHtml(t.description)}</td>
                    <td class="${amountColor} fw-bold">${amountSymbol}${transactions.formatCurrency(t.amount)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="dashboard.editTransaction('${t.id}')" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="dashboard.confirmDelete('${t.id}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // Save transaction (add or update)
    saveTransaction: function() {
        const form = document.getElementById('transactionForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const transactionId = document.getElementById('transactionId').value;
        const type = document.getElementById('transactionType').value;
        const amount = document.getElementById('transactionAmount').value;
        const description = document.getElementById('transactionDescription').value;
        const date = document.getElementById('transactionDate').value;
        
        let result;
        if (transactionId) {
            // Update existing transaction
            result = transactions.update(transactionId, type, amount, description, date);
        } else {
            // Add new transaction
            result = transactions.add(type, amount, description, date);
        }
        
        if (result.success) {
            this.showAlert(result.message, 'success');
            this.loadTransactions();
            const modal = bootstrap.Modal.getInstance(document.getElementById('transactionModal'));
            modal.hide();
        } else {
            this.showAlert(result.message, 'error');
        }
    },
    
    // Edit transaction
    editTransaction: function(transactionId) {
        const transaction = transactions.getById(transactionId);
        if (!transaction) {
            this.showAlert('Transaction not found!', 'error');
            return;
        }
        
        // Populate form
        document.getElementById('transactionId').value = transaction.id;
        document.getElementById('transactionType').value = transaction.type;
        document.getElementById('transactionAmount').value = transaction.amount;
        document.getElementById('transactionDescription').value = transaction.description;
        document.getElementById('transactionDate').value = transaction.date.split('T')[0];
        document.getElementById('modalTitle').textContent = 'Edit Transaction';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
        modal.show();
    },
    
    // Confirm delete
    confirmDelete: function(transactionId) {
        this.deleteTransactionId = transactionId;
        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    },
    
    // Initialize charts
    initCharts: function() {
        const incomeCtx = document.getElementById('incomeExpenseChart');
        const transactionCtx = document.getElementById('transactionChart');
        
        if (incomeCtx) {
            this.incomeChart = new Chart(incomeCtx, {
                type: 'bar',
                data: {
                    labels: ['Credit', 'Debit'],
                    datasets: [{
                        label: 'Amount (₹)',
                        data: [0, 0],
                        backgroundColor: ['#28a745', '#dc3545']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        if (transactionCtx) {
            this.transactionChart = new Chart(transactionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Credit', 'Debit'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#28a745', '#dc3545']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true
                }
            });
        }
    },
    
    // Update charts
    updateCharts: function(transactionsList) {
        const totals = transactions.calculateTotals(transactionsList);
        
        if (this.incomeChart) {
            this.incomeChart.data.datasets[0].data = [totals.credit, totals.debit];
            this.incomeChart.update();
        }
        
        if (this.transactionChart) {
            this.transactionChart.data.datasets[0].data = [totals.credit, totals.debit];
            this.transactionChart.update();
        }
    },
    
    // Initialize theme
    initTheme: function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
    },
    
    // Toggle theme
    toggleTheme: function() {
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    },
    
    // Apply theme
    applyTheme: function(theme) {
        document.body.setAttribute('data-theme', theme);
        const themeIcon = document.querySelector('#themeToggle i');
        if (theme === 'dark') {
            themeIcon.classList.remove('bi-moon-stars');
            themeIcon.classList.add('bi-sun');
        } else {
            themeIcon.classList.remove('bi-sun');
            themeIcon.classList.add('bi-moon-stars');
        }
    },
    
    // Show alert
    showAlert: function(message, type = 'success') {
        const container = document.getElementById('alertContainer');
        if (!container) return;
        
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const alertHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        container.innerHTML = alertHTML;
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    },
    
    // Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Export transactions to CSV
    exportTransactions: function() {
        const result = transactions.exportToCSV();
        if (result.success) {
            this.showAlert(result.message, 'success');
        } else {
            this.showAlert(result.message, 'error');
        }
    }
};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    dashboard.init();
});
