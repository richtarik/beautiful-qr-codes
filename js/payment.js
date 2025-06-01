// Payment system functionality
// This will be integrated with PayPal and potentially Stripe

// PayPal configuration (development)
const PAYPAL_CLIENT_ID = 'YOUR_PAYPAL_CLIENT_ID'; // Will be replaced with real client ID
const PAYPAL_SANDBOX = true; // Set to false for production

// Payment options
const PAYMENT_OPTIONS = {
    premiumQR: {
        price: 1.00,
        currency: 'EUR',
        description: 'Premium QR Code Design'
    },
    qrBundle: {
        price: 4.00,
        currency: 'EUR',
        description: '5 Premium QR Codes Bundle'
    }
};

// Initialize PayPal (placeholder)
function initializePayPal() {
    // This will load PayPal SDK when implemented
    console.log('PayPal initialization placeholder');
}

// Process payment for premium QR
function processPremiumPayment(productType = 'premiumQR') {
    const product = PAYMENT_OPTIONS[productType];

    if (!product) {
        console.error('Invalid product type');
        return;
    }

    // For now, show a placeholder message
    showPaymentPlaceholder(product);
}

// Show payment placeholder modal
function showPaymentPlaceholder(product) {
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closePaymentModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>💳 Platba - ${product.description}</h3>
                <button class="close-btn" onclick="closePaymentModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="payment-info">
                    <div class="product-details">
                        <h4>${product.description}</h4>
                        <div class="price-large">${product.price}€</div>
                    </div>
                    
                    <div class="bank-transfer-info">
                        <h4>🏦 Bankový prevod</h4>
                        <p>Platba prebieha cez bankový prevod na slovenský účet:</p>
                        <div class="bank-details">
                            <div class="bank-field">
                                <label>Číslo účtu:</label>
                                <span class="account-number">SK1511000000002934456844</span>
                                <button onclick="copyToClipboard('SK1511000000002934456844')" class="copy-btn">📋</button>
                            </div>
                            <div class="bank-field">
                                <label>Suma:</label>
                                <span>${product.price}€</span>
                            </div>
                            <div class="bank-field">
                                <label>Variabilný symbol:</label>
                                <span id="payment-id">${generatePaymentId()}</span>
                                <button onclick="copyToClipboard(document.getElementById('payment-id').textContent)" class="copy-btn">📋</button>
                            </div>
                            <div class="bank-field">
                                <label>Správa pre príjemcu:</label>
                                <span>Premium QR - ${new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div class="payment-instructions">
                            <h5>📋 Inštrukcie:</h5>
                            <ol>
                                <li>Skopíruj číslo účtu a sumu</li>
                                <li>Vykonaj bankový prevod</li>
                                <li>Použij uvedený variabilný symbol</li>
                                <li>Čakaj na potvrdenie (1-2 pracovné dni)</li>
                                <li>Dostaneš prístup k Premium funkciám</li>
                            </ol>
                        </div>
                        
                        <div class="contact-info">
                            <p>Po platbe ma kontaktuj na: <strong>info@beautifulqr.sk</strong></p>
                            <p>Alebo vyplň tento krátky formulár:</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="openContactForm()">
                    📧 Nahlásiť platbu
                </button>
                <button class="btn-secondary" onclick="closePaymentModal()">
                    Zrušiť
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
    }, 100);

    // Add payment modal styles if not already added
    addPaymentModalStyles();
}

// Generate unique payment ID
function generatePaymentId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return timestamp.slice(-6) + random.toUpperCase();
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show success message
        showToast('Skopírované do schránky! 📋');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Skopírované do schránky! 📋');
    });
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Open contact form
function openContactForm() {
    const formModal = document.createElement('div');
    formModal.className = 'contact-modal';
    formModal.innerHTML = `
        <div class="modal-backdrop" onclick="closeContactModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>📧 Nahlásiť platbu</h3>
                <button class="close-btn" onclick="closeContactModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="payment-notification-form">
                    <div class="form-group">
                        <label for="customer-email">Email:</label>
                        <input type="email" id="customer-email" required placeholder="vas@email.com">
                    </div>
                    <div class="form-group">
                        <label for="payment-id-form">Variabilný symbol:</label>
                        <input type="text" id="payment-id-form" required value="${document.getElementById('payment-id').textContent}">
                    </div>
                    <div class="form-group">
                        <label for="payment-amount">Suma:</label>
                        <input type="text" id="payment-amount" required value="1€" readonly>
                    </div>
                    <div class="form-group">
                        <label for="payment-note">Poznámka (voliteľné):</label>
                        <textarea id="payment-note" placeholder="Ďalšie informácie..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="submitPaymentNotification()">
                    📤 Odoslať
                </button>
                <button class="btn-secondary" onclick="closeContactModal()">
                    Zrušiť
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(formModal);

    setTimeout(() => {
        formModal.classList.add('show');
    }, 100);
}

// Submit payment notification
function submitPaymentNotification() {
    const email = document.getElementById('customer-email').value;
    const paymentId = document.getElementById('payment-id-form').value;
    const amount = document.getElementById('payment-amount').value;
    const note = document.getElementById('payment-note').value;

    if (!email || !paymentId) {
        alert('Prosím vyplň povinné polia');
        return;
    }

    // For now, just show a confirmation
    // In real implementation, this would send email or save to database
    alert(`Ďakujem! Tvoja platba bola nahlásená.\n\nEmail: ${email}\nVariabilný symbol: ${paymentId}\n\nBudeš kontaktovaný do 2 pracovných dní.`);

    closeContactModal();
    closePaymentModal();
}

// Close payment modal
function closePaymentModal() {
    const modal = document.querySelector('.payment-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Close contact modal
function closeContactModal() {
    const modal = document.querySelector('.contact-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Add payment modal styles
function addPaymentModalStyles() {
    if (document.getElementById('payment-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'payment-modal-styles';
    style.textContent = `
        .payment-modal, .contact-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .payment-modal.show, .contact-modal.show {
            opacity: 1;
            visibility: visible;
        }
        
        .payment-info {
            text-align: left;
        }
        
        .product-details {
            text-align: center;
            margin-bottom: 2rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .price-large {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
            margin-top: 0.5rem;
        }
        
        .bank-transfer-info h4 {
            color: #333;
            margin-bottom: 1rem;
        }
        
        .bank-details {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        
        .bank-field {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        
        .bank-field:last-child {
            border-bottom: none;
        }
        
        .bank-field label {
            font-weight: 600;
            color: #555;
            min-width: 140px;
        }
        
        .bank-field span {
            flex-grow: 1;
            margin: 0 1rem;
        }
        
        .account-number {
            font-family: monospace;
            font-weight: bold;
            font-size: 1.1rem;
            color: #667eea;
        }
        
        .copy-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        
        .copy-btn:hover {
            background: #5a67d8;
        }
        
        .payment-instructions {
            margin: 1.5rem 0;
            padding: 1rem;
            background: #e3f2fd;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
        }
        
        .payment-instructions h5 {
            margin-bottom: 0.5rem;
            color: #1976d2;
        }
        
        .payment-instructions ol {
            margin: 0;
            padding-left: 1.2rem;
        }
        
        .payment-instructions li {
            margin: 0.3rem 0;
            color: #555;
        }
        
        .contact-info {
            margin-top: 1.5rem;
            padding: 1rem;
            background: #f0f8ff;
            border-radius: 8px;
            text-align: center;
        }
        
        .contact-info p {
            margin: 0.5rem 0;
            color: #555;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #555;
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            font-size: 1rem;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 60px;
        }
        
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10002;
            opacity: 0;
            transform: translateY(50px);
            transition: all 0.3s ease;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        @media (max-width: 768px) {
            .bank-field {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }
            
            .bank-field label {
                min-width: auto;
            }
            
            .bank-field span {
                margin: 0;
            }
        }
    `;

    document.head.appendChild(style);
}

// Override the placeholder payment function from qr-generator.js
function initiatePayment() {
    processPremiumPayment('premiumQR');
}

// Initialize payment system
document.addEventListener('DOMContentLoaded', function () {
    addPaymentModalStyles();
}); 