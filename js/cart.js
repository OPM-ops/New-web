// Gestión del carrito con localStorage
let cart = [];
let allCoupons = [];
let appliedCoupon = null;

// Número de WhatsApp para cotizaciones (cámbialo)
const WA_PHONE = "573115416469"; // Formato internacional sin +

// Cargar carrito desde localStorage
function loadCart() {
    const stored = localStorage.getItem('oneplaymore_cart');
    if (stored) {
        cart = JSON.parse(stored);
    }
    loadCoupons();
    updateCartUI();
}

// Guardar carrito en localStorage
function saveCart() {
    localStorage.setItem('oneplaymore_cart', JSON.stringify(cart));
    updateCartUI();
}


// Agregar producto al carrito (VERSIÓN CON PRECIO VARIABLE)
function addToCart(product, quantity = 1, selectedOptions = {}, finalPrice = null) {
    // Si no se pasa finalPrice, usar product.price
    const priceToUse = finalPrice !== null ? finalPrice : product.price;
    
    // Asegurar que la imagen existe
    const productImage = product.images && product.images[0] 
        ? product.images[0] 
        : 'images/products/placeholder.jpg';

    const existingItem = cart.find(item => 
        item.id === product.id && 
        JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions)
    );

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: priceToUse,           // Guardamos el precio correcto
            image: productImage,
            categoryId: product.categoryId || '', // usado para cupones por categoría
            selectedOptions: selectedOptions,
            quantity: quantity
        });
    }

    if (typeof showToast === 'function') {
        showToast('✓ Producto añadido al carrito');
    }
    saveCart();
    showCartModal();
}


// Eliminar item del carrito
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
}

// Actualizar cantidad
function updateQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(index);
    } else {
        cart[index].quantity = newQuantity;
        saveCart();
    }
}

// Calcular subtotal
function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ─────────────────────────────────────────────
// CUPONES / DESCUENTOS FLASH
// ─────────────────────────────────────────────

// Cargar cupones desde data/coupons.json y restaurar el cupón aplicado (si sigue siendo válido)
async function loadCoupons() {
    try {
        const response = await fetch('data/coupons.json');
        allCoupons = await response.json();
    } catch (error) {
        console.warn('No se pudo cargar coupons.json (puede que no exista aún):', error);
        allCoupons = [];
    }

    const storedCode = localStorage.getItem('oneplaymore_coupon');
    if (storedCode) {
        const coupon = findCoupon(storedCode);
        appliedCoupon = coupon || null;
        if (!coupon) localStorage.removeItem('oneplaymore_coupon');
    }
    updateCartUI();
}

// Busca un cupón activo (y vigente por fecha, si aplica) por código
function findCoupon(code) {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    return allCoupons.find(c => {
        if (!c.active) return false;
        if (c.code.toUpperCase() !== normalized) return false;
        if (c.startDate && today < c.startDate) return false;
        if (c.endDate && today > c.endDate) return false;
        return true;
    }) || null;
}

// Monto elegible del carrito para un cupón (según su alcance)
function getEligibleSubtotal(coupon) {
    if (!coupon) return 0;
    if (!coupon.scope || coupon.scope === 'all') return getCartSubtotal();
    return cart.reduce((sum, item) => {
        if (item.categoryId === coupon.scopeValue) sum += item.price * item.quantity;
        return sum;
    }, 0);
}

// Calcula el descuento actual (0 si no hay cupón válido o el carrito no tiene productos elegibles)
function getCartDiscount() {
    if (!appliedCoupon) return 0;
    const eligible = getEligibleSubtotal(appliedCoupon);
    if (eligible <= 0) return 0;
    let discount = appliedCoupon.type === 'percent'
        ? eligible * (appliedCoupon.value / 100)
        : appliedCoupon.value;
    return Math.min(discount, eligible);
}

// Total final del carrito (subtotal - descuento)
function getCartTotal() {
    return Math.max(0, getCartSubtotal() - getCartDiscount());
}

// Intentar aplicar un código de cupón ingresado por el cliente
function applyCouponCode(code) {
    const coupon = findCoupon(code);
    if (!coupon) {
        if (typeof showToast === 'function') showToast('❌ Cupón inválido, vencido o inactivo', 2500);
        return;
    }
    if (coupon.scope === 'category' && getEligibleSubtotal(coupon) <= 0) {
        if (typeof showToast === 'function') showToast('⚠️ Este cupón no aplica a los productos de tu carrito', 3000);
        return;
    }
    appliedCoupon = coupon;
    localStorage.setItem('oneplaymore_coupon', coupon.code);
    if (typeof showToast === 'function') showToast(`✓ Cupón "${coupon.code}" aplicado`);
    updateCartUI();
}

// Quitar el cupón aplicado
function removeCoupon() {
    appliedCoupon = null;
    localStorage.removeItem('oneplaymore_coupon');
    updateCartUI();
}
window.applyCouponCode = applyCouponCode;
window.removeCoupon = removeCoupon;

// Actualizar contador del carrito y vista del carrito
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    // Actualizar total visible en el header (ya con descuento aplicado, si hay)
    const cartTotalHeader = document.getElementById('cartTotalHeader');
    if (cartTotalHeader) {
        const total = getCartTotal();
        cartTotalHeader.textContent = total > 0 ? `$${total.toLocaleString('es-CO')}` : '$0';
    }

    const cartItemsContainer = document.getElementById('cartItemsContainer');
    if (cartItemsContainer) {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; padding:2rem;">Tu carrito está vacío.</p>';
        } else {
cartItemsContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
            <div class="cart-item-header">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">$${item.price.toLocaleString('es-CO')}</div>
            </div>
            ${Object.entries(item.selectedOptions).length > 0 ? 
                `<div class="cart-item-options">
                    ${Object.entries(item.selectedOptions).map(([key, val]) => `<span class="cart-option">${key}: ${val}</span>`).join('')}
                </div>` 
                : ''}
            <div class="cart-item-actions">
                <button class="cart-qty-btn" onclick="decrementCartItem(${index})">−</button>
                <span class="cart-qty">${item.quantity}</span>
                <button class="cart-qty-btn" onclick="incrementCartItem(${index})">+</button>
                <button class="cart-remove-btn" onclick="removeCartItem(${index})" title="Eliminar">✕</button>
            </div>
        </div>
    </div>
`).join('');
        }
    }

    // Actualizar subtotal / descuento / total en el carrito
    const subtotalSpan = document.getElementById('cartSubtotal');
    if (subtotalSpan) {
        subtotalSpan.textContent = `$${getCartSubtotal().toLocaleString('es-CO')}`;
    }

    const discount = getCartDiscount();
    const discountRow = document.getElementById('cartDiscountRow');
    const discountAmountSpan = document.getElementById('cartDiscountAmount');
    const discountCodeSpan = document.getElementById('cartDiscountCode');
    if (discountRow) {
        discountRow.style.display = discount > 0 ? 'flex' : 'none';
        if (discountAmountSpan) discountAmountSpan.textContent = `-$${discount.toLocaleString('es-CO')}`;
        if (discountCodeSpan) discountCodeSpan.textContent = appliedCoupon ? appliedCoupon.code : '';
    }

    const totalRow = document.getElementById('cartTotalRow');
    const totalSpan = document.getElementById('cartFinalTotal');
    if (totalRow) totalRow.style.display = discount > 0 ? 'flex' : 'none';
    if (totalSpan) totalSpan.textContent = `$${getCartTotal().toLocaleString('es-CO')}`;

    // Estado del input/botón de cupón
    const couponInput = document.getElementById('couponCodeInput');
    const couponApplyBtn = document.getElementById('applyCouponBtn');
    const couponAppliedChip = document.getElementById('couponAppliedChip');
    if (couponInput && couponApplyBtn && couponAppliedChip) {
        if (appliedCoupon) {
            couponInput.style.display = 'none';
            couponApplyBtn.style.display = 'none';
            couponAppliedChip.style.display = 'flex';
            couponAppliedChip.querySelector('.coupon-chip-code').textContent = appliedCoupon.code;
        } else {
            couponInput.style.display = '';
            couponApplyBtn.style.display = '';
            couponAppliedChip.style.display = 'none';
        }
    }
}

// Funciones auxiliares para botones (se llaman desde onclick)
window.incrementCartItem = function(index) {
    updateQuantity(index, cart[index].quantity + 1);
};

window.decrementCartItem = function(index) {
    updateQuantity(index, cart[index].quantity - 1);
};

window.removeCartItem = function(index) {
    removeFromCart(index);
};

// Generar mensaje para WhatsApp
function generateWhatsAppMessage() {
    if (cart.length === 0) return "Hola, quiero cotizar productos pero mi carrito está vacío.";
    
    let message = "¡Hola! Quiero cotizar los siguientes productos:\n\n";
    cart.forEach(item => {
        message += `• ${item.name}`;
        if (Object.keys(item.selectedOptions).length > 0) {
            message += ` (${Object.entries(item.selectedOptions).map(([k,v]) => `${k}:${v}`).join(', ')})`;
        }
        message += ` - Cant: ${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-CO')}\n`;
    });
    message += `\nSubtotal: $${getCartSubtotal().toLocaleString('es-CO')}\n`;
    const discount = getCartDiscount();
    if (discount > 0 && appliedCoupon) {
        message += `Cupón aplicado (${appliedCoupon.code}): -$${discount.toLocaleString('es-CO')}\n`;
        message += `Total con descuento: $${getCartTotal().toLocaleString('es-CO')}\n`;
    }
    message += "\nPor favor, confirma disponibilidad y costo de envío. ¡Gracias!";
    return encodeURIComponent(message);
}

// Abrir WhatsApp con cotización
function openWhatsAppQuote() {
    const message = generateWhatsAppMessage();
    window.open(`https://wa.me/${WA_PHONE}?text=${message}`, '_blank');
}

// Vaciar carrito (después de pedido exitoso)
function clearCart() {
    cart = [];
    appliedCoupon = null;
    localStorage.removeItem('oneplaymore_coupon');
    saveCart();
}

// ─────────────────────────────────────────────
// BOTÓN FLOTANTE DE WHATSAPP
// ─────────────────────────────────────────────
function initWhatsAppFloatButton() {
    const btn = document.getElementById('whatsappFloatBtn');
    if (!btn) return;
    const message = encodeURIComponent('¡Hola! Quiero más información sobre sus productos 😊');
    btn.href = `https://wa.me/${WA_PHONE}?text=${message}`;
}

document.addEventListener('DOMContentLoaded', initWhatsAppFloatButton);

// Wiring del input de cupón (delegado, funciona en cualquier página que tenga el carrito)
document.addEventListener('DOMContentLoaded', () => {
    const applyBtn = document.getElementById('applyCouponBtn');
    const input = document.getElementById('couponCodeInput');
    const removeBtn = document.getElementById('removeCouponBtn');

    if (applyBtn && input) {
        applyBtn.addEventListener('click', () => {
            if (input.value.trim()) applyCouponCode(input.value);
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) applyCouponCode(input.value);
        });
    }
    if (removeBtn) {
        removeBtn.addEventListener('click', removeCoupon);
    }
});