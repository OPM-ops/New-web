// Gestión del carrito con localStorage
let cart = [];
let allCoupons = [];
let appliedCoupon = null;
let couponsLoaded = false; // true una vez que coupons.json ya se intentó cargar (éxito o error)

// Número de WhatsApp para cotizaciones (cámbialo)
const WA_PHONE = "573115416469"; // Formato internacional sin +

// Cargar carrito desde localStorage
async function loadCart() {
    const stored = localStorage.getItem('oneplaymore_cart');
    if (stored) {
        cart = JSON.parse(stored);
    }
    // Importante: esperamos a que carguen los cupones ANTES de pintar el carrito.
    // Antes esto no se esperaba, así que si el cliente escribía un código de
    // cupón justo al abrir la página, `allCoupons` todavía podía estar vacío
    // y el cupón (válido) se mostraba como "inválido".
    await loadCoupons();
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
            status: product.status || '',          // usado para excluir preventa de cupones
            expansion: product.expansion || '',    // usado para excluir colecciones puntuales de un cupón
            originalPrice: product.originalPrice || null, // usado para detectar si ya tiene precio rebajado
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

// Calcular subtotal (SIEMPRE incluye todos los productos, preventa incluida)
function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ─────────────────────────────────────────────
// CUPONES / DESCUENTOS FLASH
// ─────────────────────────────────────────────

// Fecha local (YYYY-MM-DD) para comparar vigencia de cupones.
// OJO: antes se usaba new Date().toISOString(), que usa UTC. En Colombia
// (UTC-5) eso podía hacer que un cupón se mostrara vencido/no-iniciado
// varias horas antes o después de lo que el admin esperaba.
function getLocalDateStr() {
    const d = new Date();
    const tzOffsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

// Cargar cupones desde data/coupons.json y restaurar el cupón aplicado (si sigue siendo válido)
async function loadCoupons() {
    try {
        const response = await fetch('data/coupons.json');
        allCoupons = await response.json();
    } catch (error) {
        console.warn('No se pudo cargar coupons.json (puede que no exista aún):', error);
        allCoupons = [];
    } finally {
        couponsLoaded = true;
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
    const today = getLocalDateStr();
    return allCoupons.find(c => {
        if (!c || !c.code) return false;
        if (!c.active) return false;
        if (c.code.trim().toUpperCase() !== normalized) return false;
        if (c.startDate && today < c.startDate) return false;
        if (c.endDate && today > c.endDate) return false;
        return true;
    }) || null;
}

// ¿Cuál es el status "real" de un item del carrito?
// Preferimos el status ACTUAL del catálogo (allProducts, cargado por products.js)
// sobre el que quedó guardado en el item cuando se agregó al carrito. Esto es
// importante por dos razones:
//   1) Carritos guardados en localStorage ANTES de que el campo "status" se
//      empezara a guardar en cada item no tienen ese dato -> sin este respaldo,
//      un producto en preventa "viejo" en el carrito se trataba como elegible
//      para cupones, que es justo el bug que no debe volver a pasar.
//   2) El status de un producto puede cambiar mientras sigue en el carrito
//      (ej: pasa de "preventa" a "disponible"), y la regla debe aplicarse
//      según la realidad actual, no una foto vieja.
function getItemStatus(item) {
    if (typeof allProducts !== 'undefined' && Array.isArray(allProducts)) {
        const liveProduct = allProducts.find(p => p.id === item.id);
        if (liveProduct && liveProduct.status) return liveProduct.status;
    }
    return item.status || '';
}

// Mismo patrón que getItemStatus: preferimos el dato EN VIVO del catálogo
// (allProducts) sobre lo que quedó guardado en el carrito, para que un
// carrito "viejo" (agregado antes de este cambio, o antes de que cambiara
// el producto) siga aplicando la regla correctamente.
function getLiveProduct(item) {
    if (typeof allProducts !== 'undefined' && Array.isArray(allProducts)) {
        return allProducts.find(p => p.id === item.id) || null;
    }
    return null;
}

function getItemCategoryId(item) {
    const live = getLiveProduct(item);
    return (live && live.categoryId) || item.categoryId || '';
}

function getItemExpansion(item) {
    const live = getLiveProduct(item);
    return (live && live.expansion) || item.expansion || '';
}

// ¿Este producto YA tiene un precio rebajado activo (originalPrice > price)?
// Si es así, NINGÚN cupón lo toca — protección automática y sin excepción,
// para que un cupón de "10% en toda la tienda" nunca se sume al descuento
// que el producto ya trae de fábrica.
function itemHasOwnDiscount(item) {
    const live = getLiveProduct(item);
    const p = live || item;
    return !!(p.originalPrice && p.price && p.originalPrice > p.price);
}

function getEligibleSubtotal(coupon) {
    if (!coupon) return 0;
    return cart.reduce((sum, item) => {
        if (getItemStatus(item) === 'preventa') return sum; // preventa nunca entra en cupones
        if (itemHasOwnDiscount(item)) return sum; // ya tiene precio rebajado propio: nunca se le suma otro descuento
        const itemCategoryId = getItemCategoryId(item);
        if (coupon.scope === 'category' && itemCategoryId !== coupon.scopeValue) return sum;
        if (Array.isArray(coupon.excludeCategoryIds) && coupon.excludeCategoryIds.includes(itemCategoryId)) return sum;
        if (Array.isArray(coupon.excludeExpansions) && coupon.excludeExpansions.length) {
            const itemExpansion = (getItemExpansion(item) || '').trim().toLowerCase();
            const isExcluded = coupon.excludeExpansions.some(ex => (ex || '').trim().toLowerCase() === itemExpansion);
            if (isExcluded) return sum;
        }
        return sum + (item.price * item.quantity);
    }, 0);
}

// Calcula el descuento actual (0 si no hay cupón válido o no hay productos elegibles)
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

// ¿Hay algún producto en preventa en el carrito? (para avisos en la UI)
function cartHasPreventaItems() {
    return cart.some(item => getItemStatus(item) === 'preventa');
}

// Intentar aplicar un código de cupón ingresado por el cliente
function applyCouponCode(code) {
    if (!couponsLoaded) {
        if (typeof showToast === 'function') showToast('⏳ Cargando cupones, intenta de nuevo en un segundo', 2000);
        return;
    }

    const coupon = findCoupon(code);
    if (!coupon) {
        if (typeof showToast === 'function') showToast('❌ Cupón inválido, vencido o inactivo', 2500);
        return;
    }

    // Antes solo se validaba esto para cupones de categoría; ahora se valida
    // siempre, porque un carrito 100% de preventa tampoco es elegible para
    // un cupón de "todo el carrito".
    if (getEligibleSubtotal(coupon) <= 0) {
        const msg = cartHasPreventaItems()
            ? '⚠️ Este cupón no aplica: los productos de preventa no participan en descuentos'
            : '⚠️ Este cupón no aplica a los productos de tu carrito';
        if (typeof showToast === 'function') showToast(msg, 3000);
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
                <div class="cart-item-title">${item.name}${getItemStatus(item) === 'preventa' ? ' <span class="cart-item-preventa-badge">Preventa</span>' : ''}</div>
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

    // Aviso si hay un cupón aplicado y además hay productos de preventa en el carrito
    // (para que el cliente entienda por qué esos productos no bajan de precio)
    const couponPreventaNote = document.getElementById('couponPreventaNote');
    if (couponPreventaNote) {
        couponPreventaNote.style.display = (appliedCoupon && cartHasPreventaItems()) ? 'block' : 'none';
    }

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
    const item = cart[index];
    const live = (typeof allProducts !== 'undefined' && Array.isArray(allProducts))
        ? allProducts.find(p => p.id === item.id)
        : null;
    const stock = live && typeof live.stock === 'number' ? live.stock : null;
    if (stock !== null && item.quantity + 1 > stock) {
        if (typeof showToast === 'function') showToast(`⚠️ Solo hay ${stock} disponible(s) de este producto`, 2500);
        return;
    }
    updateQuantity(index, item.quantity + 1);
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
        if (getItemStatus(item) === 'preventa') message += ` (Preventa)`;
        if (Object.keys(item.selectedOptions).length > 0) {
            message += ` (${Object.entries(item.selectedOptions).map(([k,v]) => `${k}:${v}`).join(', ')})`;
        }
        message += ` - Cant: ${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-CO')}\n`;
    });
    message += `\nSubtotal: $${getCartSubtotal().toLocaleString('es-CO')}\n`;
    const discount = getCartDiscount();
    if (discount > 0 && appliedCoupon) {
        message += `Cupón aplicado (${appliedCoupon.code}): -$${discount.toLocaleString('es-CO')}\n`;
        if (cartHasPreventaItems()) {
            message += `(Los productos de preventa no participan del descuento)\n`;
        }
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
