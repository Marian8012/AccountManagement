// Authentication Module
const auth = {
    // Register a new user
    register: function(name, email, phone, password) {
        try {
            // Get existing users from localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // Check if email already exists
            if (users.some(user => user.email === email)) {
                return { success: false, message: 'Email already registered!' };
            }
            
            // Check if phone already exists
            if (users.some(user => user.phone === phone)) {
                return { success: false, message: 'Phone number already registered!' };
            }
            
            // Create new user object
            const newUser = {
                id: Date.now().toString(),
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password: password, // In production, this should be hashed
                createdAt: new Date().toISOString(),
                profilePicture: null
            };
            
            // Add user to array
            users.push(newUser);
            
            // Save to localStorage
            localStorage.setItem('users', JSON.stringify(users));
            
            // Initialize user's transactions array
            const userTransactions = {
                userId: newUser.id,
                transactions: []
            };
            localStorage.setItem(`transactions_${newUser.id}`, JSON.stringify(userTransactions));
            
            return { success: true, message: 'Registration successful!', user: newUser };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Registration failed. Please try again.' };
        }
    },
    
    // Login user
    login: function(email, password, rememberMe = false) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
            
            if (user) {
                // Store current user session
                const sessionData = {
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    loginTime: new Date().toISOString()
                };
                
                if (rememberMe) {
                    localStorage.setItem('currentUser', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
                }
                
                return { success: true, message: 'Login successful!', user: user };
            } else {
                return { success: false, message: 'Invalid email or password!' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed. Please try again.' };
        }
    },
    
    // Logout user
    logout: function() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },
    
    // Check if user is logged in
    isLoggedIn: function() {
        const user = this.getCurrentUser();
        return user !== null;
    },
    
    // Get current logged-in user
    getCurrentUser: function() {
        try {
            const sessionUser = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            if (sessionUser) {
                const userData = JSON.parse(sessionUser);
                // Verify user still exists in users array
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const user = users.find(u => u.id === userData.userId);
                if (user) {
                    return { ...user, ...userData };
                }
            }
            return null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    },
    
    // Get user by ID
    getUserById: function(userId) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            return users.find(u => u.id === userId) || null;
        } catch (error) {
            console.error('Get user by ID error:', error);
            return null;
        }
    },
    
    // Update user profile
    updateProfile: function(userId, updates) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: 'User not found!' };
            }
            
            // Update user data
            users[userIndex] = { ...users[userIndex], ...updates };
            
            // Save to localStorage
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update session if it's the current user
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                const sessionData = {
                    userId: users[userIndex].id,
                    email: users[userIndex].email,
                    name: users[userIndex].name,
                    loginTime: currentUser.loginTime || new Date().toISOString()
                };
                
                if (localStorage.getItem('currentUser')) {
                    localStorage.setItem('currentUser', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
                }
            }
            
            return { success: true, message: 'Profile updated successfully!', user: users[userIndex] };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, message: 'Failed to update profile. Please try again.' };
        }
    },
    
    // Show alert message
    showAlert: function(message, type = 'success', containerId = 'alertContainer') {
        const container = document.getElementById(containerId);
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
    }
};

// Registration form handler
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const phone = document.getElementById('registerPhone').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validation
            if (!name || !email || !phone || !password) {
                auth.showAlert('Please fill in all fields!', 'error');
                return;
            }
            
            if (password.length < 6) {
                auth.showAlert('Password must be at least 6 characters!', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                auth.showAlert('Passwords do not match!', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                auth.showAlert('Please enter a valid email address!', 'error');
                return;
            }
            
            // Phone validation (basic)
            const phoneRegex = /^[0-9]{10,}$/;
            if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
                auth.showAlert('Please enter a valid phone number!', 'error');
                return;
            }
            
            // Register user
            const result = auth.register(name, email, phone, password);
            
            if (result.success) {
                auth.showAlert(result.message, 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                auth.showAlert(result.message, 'error');
            }
        });
    }
    
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            
            // Validation
            if (!email || !password) {
                auth.showAlert('Please fill in all fields!', 'error');
                return;
            }
            
            // Login user
            const result = auth.login(email, password, rememberMe);
            
            if (result.success) {
                auth.showAlert(result.message, 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                auth.showAlert(result.message, 'error');
            }
        });
    }
});
