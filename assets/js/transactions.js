// Transactions Module - Utility functions
const transactions = {
    // Get all transactions for current user
    getAll: function() {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return [];
            
            const userTransactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`) || '{"transactions": []}');
            return userTransactions.transactions || [];
        } catch (error) {
            console.error('Get transactions error:', error);
            return [];
        }
    },
    
    // Add new transaction
    add: function(type, amount, description, date) {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) {
                return { success: false, message: 'User not logged in!' };
            }
            
            // Validation
            if (!type || !amount || !description || !date) {
                return { success: false, message: 'Please fill in all fields!' };
            }
            
            if (type !== 'credit' && type !== 'debit') {
                return { success: false, message: 'Invalid transaction type!' };
            }
            
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return { success: false, message: 'Amount must be a positive number!' };
            }
            
            // Get existing transactions
            const userTransactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`) || '{"transactions": []}');
            
            // Create new transaction
            const newTransaction = {
                id: Date.now().toString(),
                type: type,
                amount: amountNum,
                description: description.trim(),
                date: date,
                createdAt: new Date().toISOString()
            };
            
            // Add to array
            userTransactions.transactions.push(newTransaction);
            
            // Save to localStorage
            localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(userTransactions));
            
            return { success: true, message: 'Transaction added successfully!', transaction: newTransaction };
        } catch (error) {
            console.error('Add transaction error:', error);
            return { success: false, message: 'Failed to add transaction. Please try again.' };
        }
    },
    
    // Update transaction
    update: function(transactionId, type, amount, description, date) {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) {
                return { success: false, message: 'User not logged in!' };
            }
            
            // Validation
            if (!type || !amount || !description || !date) {
                return { success: false, message: 'Please fill in all fields!' };
            }
            
            if (type !== 'credit' && type !== 'debit') {
                return { success: false, message: 'Invalid transaction type!' };
            }
            
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return { success: false, message: 'Amount must be a positive number!' };
            }
            
            // Get existing transactions
            const userTransactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`) || '{"transactions": []}');
            const transactionIndex = userTransactions.transactions.findIndex(t => t.id === transactionId);
            
            if (transactionIndex === -1) {
                return { success: false, message: 'Transaction not found!' };
            }
            
            // Update transaction
            userTransactions.transactions[transactionIndex] = {
                ...userTransactions.transactions[transactionIndex],
                type: type,
                amount: amountNum,
                description: description.trim(),
                date: date
            };
            
            // Save to localStorage
            localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(userTransactions));
            
            return { success: true, message: 'Transaction updated successfully!' };
        } catch (error) {
            console.error('Update transaction error:', error);
            return { success: false, message: 'Failed to update transaction. Please try again.' };
        }
    },
    
    // Delete transaction
    delete: function(transactionId) {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) {
                return { success: false, message: 'User not logged in!' };
            }
            
            // Get existing transactions
            const userTransactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`) || '{"transactions": []}');
            const transactionIndex = userTransactions.transactions.findIndex(t => t.id === transactionId);
            
            if (transactionIndex === -1) {
                return { success: false, message: 'Transaction not found!' };
            }
            
            // Remove transaction
            userTransactions.transactions.splice(transactionIndex, 1);
            
            // Save to localStorage
            localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(userTransactions));
            
            return { success: true, message: 'Transaction deleted successfully!' };
        } catch (error) {
            console.error('Delete transaction error:', error);
            return { success: false, message: 'Failed to delete transaction. Please try again.' };
        }
    },
    
    // Get transaction by ID
    getById: function(transactionId) {
        try {
            const transactions = this.getAll();
            return transactions.find(t => t.id === transactionId) || null;
        } catch (error) {
            console.error('Get transaction by ID error:', error);
            return null;
        }
    },
    
    // Calculate totals
    calculateTotals: function(transactionList = null) {
        const transactions = transactionList || this.getAll();
        
        const totals = {
            credit: 0,
            debit: 0,
            balance: 0
        };
        
        transactions.forEach(transaction => {
            if (transaction.type === 'credit') {
                totals.credit += transaction.amount;
            } else if (transaction.type === 'debit') {
                totals.debit += transaction.amount;
            }
        });
        
        totals.balance = totals.credit - totals.debit;
        
        return totals;
    },
    
    // Filter transactions
    filter: function(type = null, startDate = null, endDate = null, searchQuery = null) {
        let transactions = this.getAll();
        
        // Filter by type
        if (type && type !== 'all') {
            transactions = transactions.filter(t => t.type === type);
        }
        
        // Filter by date range
        if (startDate) {
            transactions = transactions.filter(t => new Date(t.date) >= new Date(startDate));
        }
        
        if (endDate) {
            transactions = transactions.filter(t => new Date(t.date) <= new Date(endDate));
        }
        
        // Filter by search query
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            transactions = transactions.filter(t => 
                t.description.toLowerCase().includes(query) ||
                t.amount.toString().includes(query)
            );
        }
        
        // Sort by date (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return transactions;
    },
    
    // Format currency
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    },
    
    // Format date
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    // Export to CSV
    exportToCSV: function() {
        try {
            const transactions = this.getAll();
            if (transactions.length === 0) {
                return { success: false, message: 'No transactions to export!' };
            }
            
            // CSV headers
            let csv = 'Date,Type,Amount,Description\n';
            
            // Add transactions
            transactions.forEach(t => {
                const date = this.formatDate(t.date);
                const type = t.type.charAt(0).toUpperCase() + t.type.slice(1);
                const amount = t.amount;
                const description = `"${t.description.replace(/"/g, '""')}"`;
                csv += `${date},${type},${amount},${description}\n`;
            });
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return { success: true, message: 'Transactions exported successfully!' };
        } catch (error) {
            console.error('Export CSV error:', error);
            return { success: false, message: 'Failed to export transactions.' };
        }
    }
};
