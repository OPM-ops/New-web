// Control de modales: producto, carrito, checkout
let currentProduct = null;

// Funciones para bloquear/restaurar scroll del body
function disableBodyScroll() {
    document.body.style.overflow = 'hidden';
}

function enableBodyScroll() {
    document.body.style.overflow = '';
}

// Función auxiliar para cerrar cualquier modal
function closeModal(modalElement) {
    if (modalElement) {
        modalElement.style.display = 'none';
        enableBodyScroll();
    }
}

// Normaliza un string para usarlo como ID (quita tildes y reemplaza espacios por _)
function normalizeId(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
}

// Abrir modal de producto
function openProductModal(product) {
    currentProduct = product;
    const modal = document.getElementById('productModal');
    const body = document.getElementById('productModalBody');

    const basePrice = product.price;
    const baseOriginalPrice = product.originalPrice || null;
    
    const priceMap = {};
    const originalPriceMap = {};
    let attributesHTML = '';
    
    if (product.attributes && product.attributes.length > 0) {
        attributesHTML = product.attributes.map(attr => {
            const attrKey = normalizeId(attr.name);
            const optionsHTML = attr.options.map(opt => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optPrice = typeof opt === 'object' && opt.price ? opt.price : basePrice;
                const optOriginal = (typeof opt === 'object' && opt.originalPrice) ? opt.originalPrice : baseOriginalPrice;
                
                if (!priceMap[attr.name]) priceMap[attr.name] = {};
                priceMap[attr.name][optValue] = optPrice;
                
                if (!originalPriceMap[attr.name]) originalPriceMap[attr.name] = {};
                originalPriceMap[attr.name][optValue] = optOriginal;
                
                const diff = optPrice - basePrice;
                const diffText = diff > 0 ? ` (+$${diff.toLocaleString('es-CO')})` : (diff < 0 ? ` (-$${Math.abs(diff).toLocaleString('es-CO')})` : '');
                return `<option value="${optValue}">${optValue}${diffText}</option>`;
            }).join('');
            
            return `
                <div class="attribute-selector" data-attr="${attr.name}">
                    <label>${attr.name}:</label>
                    <select id="attr-${attrKey}" class="product-attribute">
                        ${optionsHTML}
                    </select>
                </div>
            `;
        }).join('');
    }

    const firstImage = product.images && product.images[0] ? product.images[0] : 'images/products/placeholder.jpg';
    let galleryHTML = `<div class="product-image-container">
                        <img src="${firstImage}" 
                             alt="${product.name.replace(/"/g, '&quot;')}" 
                             class="main-image" 
                             id="mainProductImage"
                             onerror="this.onerror=null; this.src='images/products/placeholder.jpg';">
                       </div>`;
    
    if (product.images && product.images.length > 1) {
        galleryHTML += `<div class="thumbnail-list">`;
        product.images.forEach((img, idx) => {
            galleryHTML += `<img src="${img}" alt="thumb" class="thumbnail ${idx === 0 ? 'active' : ''}" 
                            onerror="this.onerror=null; this.src='images/products/placeholder.jpg';"
                            onclick="document.getElementById('mainProductImage').src='${img}'; document.querySelectorAll('.thumbnail').forEach(t=>t.classList.remove('active')); this.classList.add('active');">`;
        });
        galleryHTML += `</div>`;
    }

    const safeDescription = product.description.replace(/"/g, '&quot;').replace(/\n/g, ' ');

    let includesHTML = '';
    if (product.includes && product.includes.length) {
        includesHTML = `<div class="product-includes"><strong>Incluye:</strong><ul>${product.includes.map(item => `<li>${item}</li>`).join('')}</ul></div>`;
    }

    let encargoHTML = '';
    if (product.encargo) {
        const nota = product.encargoNota || 'Este producto es por encargo. Tiempo estimado: 2 a 5 días hábiles.';
        encargoHTML = `<div class="product-encargo-note">
            <i class="fas fa-clock"></i> ${nota}
        </div>`;
    }

    body.innerHTML = `
        <div class="product-detail">
            <div class="product-gallery">
                ${galleryHTML}
            </div>
            <div class="product-detail-info">
                <h3>${product.name}</h3>
                <p class="product-category">${product.category}</p>
                <div class="product-detail-price-container" id="priceContainer">
                    <span class="old-price" id="modalOriginalPrice" style="display: none;"></span>
                    <span class="product-detail-price current-price" id="modalCurrentPrice">$${product.price.toLocaleString('es-CO')}</span>
                </div>
                <p>${safeDescription}</p>
                ${includesHTML}
                ${encargoHTML}
                ${attributesHTML}
                <div class="quantity-selector">
                    <label>Cantidad:</label>
                    <input type="number" id="productQuantity" min="1" value="1">
                </div>
                <button id="addToCartFromModal" class="btn-add-cart">Añadir al carrito</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    disableBodyScroll();

    function updatePrice() {
        let newPrice = basePrice;
        let newOriginalPrice = baseOriginalPrice;
        
        if (product.attributes) {
            product.attributes.forEach(attr => {
                const attrKey = normalizeId(attr.name);
                const select = document.getElementById(`attr-${attrKey}`);
                if (select) {
                    const selectedValue = select.value;
                    if (priceMap[attr.name] && priceMap[attr.name][selectedValue]) {
                        newPrice = priceMap[attr.name][selectedValue];
                    }
                    if (originalPriceMap[attr.name] && originalPriceMap[attr.name][selectedValue]) {
                        newOriginalPrice = originalPriceMap[attr.name][selectedValue];
                    }
                }
            });
        }
        
        document.getElementById('modalCurrentPrice').textContent = `$${newPrice.toLocaleString('es-CO')}`;
        
        const originalSpan = document.getElementById('modalOriginalPrice');
        if (originalSpan) {
            if (newOriginalPrice) {
                originalSpan.textContent = `$${newOriginalPrice.toLocaleString('es-CO')}`;
                originalSpan.style.display = 'inline';
            } else {
                originalSpan.style.display = 'none';
            }
        }
        return newPrice;
    }

    if (product.attributes) {
        product.attributes.forEach(attr => {
            const attrKey = normalizeId(attr.name);
            const select = document.getElementById(`attr-${attrKey}`);
            if (select) {
                select.addEventListener('change', updatePrice);
            }
        });
    }

    const addBtn = document.getElementById('addToCartFromModal');
    if (addBtn) {
        // Deshabilitar botón si el producto está agotado
        if (product.status === 'agotado' || product.status === 'proximamente') {
            addBtn.disabled = true;
            addBtn.textContent = 'Producto agotado';
            addBtn.style.background = '#6b7280';
            addBtn.style.cursor = 'not-allowed';
            addBtn.style.opacity = '0.7';
        } else {
            addBtn.disabled = false;
            addBtn.textContent = 'Añadir al carrito';
            addBtn.style.background = '';
            addBtn.style.cursor = '';
            addBtn.style.opacity = '';
        }

        addBtn.addEventListener('click', function() {
            // Doble validación: no permitir agregar si está agotado
            if (product.status === 'agotado' || product.status === 'proximamente') {
                if (typeof showToast === 'function') showToast('❌ No se puede añadir: producto agotado', 2500);
                return;
            }
            const quantity = parseInt(document.getElementById('productQuantity').value, 10) || 1;
            const selectedOptions = {};
            let finalPrice = basePrice;
            
            if (product.attributes) {
                product.attributes.forEach(attr => {
                    const attrKey = normalizeId(attr.name);
                    const select = document.getElementById(`attr-${attrKey}`);
                    if (select) {
                        const selectedValue = select.value;
                        selectedOptions[attr.name] = selectedValue;
                        if (priceMap[attr.name] && priceMap[attr.name][selectedValue]) {
                            finalPrice = priceMap[attr.name][selectedValue];
                        }
                    }
                });
            }
            addToCart(product, quantity, selectedOptions, finalPrice);
            if (typeof showToast === 'function') {
                showToast('✓ Producto añadido al carrito');
            }
        });
    }
}

// Abrir modal del carrito
function showCartModal() {
    updateCartUI();
    document.getElementById('cartModal').style.display = 'block';
    disableBodyScroll();
}

// Abrir modal de checkout
function openCheckoutModal() {
    if (cart.length === 0) {
        alert('Tu carrito está vacío. Agrega productos antes de finalizar el pedido.');
        return;
    }
    document.getElementById('checkoutModal').style.display = 'block';
    disableBodyScroll();
    renderCheckoutStep1();
}

// Cerrar modales
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) cartIcon.addEventListener('click', showCartModal);
    
    const whatsappBtn = document.getElementById('whatsappQuoteBtn');
    if (whatsappBtn) whatsappBtn.addEventListener('click', openWhatsAppQuote);
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckoutModal);
});

// Vista rápida (quick view)
function openQuickView(product) {
    const quickViewModal = document.createElement('div');
    quickViewModal.className = 'modal quick-view-modal';
    quickViewModal.innerHTML = `
        <div class="modal-content quick-view-content">
            <span class="close">&times;</span>
            <div class="quick-view-grid">
                <div class="quick-view-image-container">
                    <img src="${product.images && product.images[0] ? product.images[0] : 'images/products/placeholder.jpg'}" 
                         alt="${product.name.replace(/"/g, '&quot;')}" 
                         class="quick-view-img"
                         onerror="this.onerror=null; this.src='images/products/placeholder.jpg';">
                </div>
                <div class="quick-view-details">
                    <h3>${product.name}</h3>
                    <p class="product-category">${product.category}</p>
                    <div class="product-detail-price-container">
                        ${product.originalPrice ? `<span class="old-price">$${product.originalPrice.toLocaleString('es-CO')}</span>` : ''}
                        <span class="product-detail-price current-price">$${product.price.toLocaleString('es-CO')}</span>
                    </div>
                    <p class="quick-view-description">${product.description.substring(0, 100)}...</p>
                    ${product.encargo ? `<div class="product-encargo-note" style="font-size:0.75rem; margin:0.5rem 0;"><i class="fas fa-clock"></i> ${product.encargoNota || 'Por encargo, 2-5 días hábiles'}</div>` : ''}
                    <button class="btn btn-primary quick-add-cart" data-product-id="${product.id}">
                        <i class="fas fa-cart-plus"></i> Añadir al carrito
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(quickViewModal);
    quickViewModal.style.display = 'block';
    disableBodyScroll();

    quickViewModal.querySelector('.close').addEventListener('click', () => {
        quickViewModal.remove();
        enableBodyScroll();
    });
    
    quickViewModal.addEventListener('click', (e) => {
        if (e.target === quickViewModal) {
            quickViewModal.remove();
            enableBodyScroll();
        }
    });

    const quickAddBtn = quickViewModal.querySelector('.quick-add-cart');
    if (product.status === 'agotado' || product.status === 'proximamente') {
        quickAddBtn.disabled = true;
        quickAddBtn.textContent = 'Producto agotado';
        quickAddBtn.style.background = '#6b7280';
        quickAddBtn.style.cursor = 'not-allowed';
        quickAddBtn.style.opacity = '0.7';
    }

    quickAddBtn.addEventListener('click', () => {
        if (product.status === 'agotado' || product.status === 'proximamente') {
            if (typeof showToast === 'function') showToast('❌ No se puede añadir: producto agotado', 2500);
            return;
        }
        addToCart(product, 1, {});
        quickViewModal.remove();
        enableBodyScroll();
        if (typeof showToast === 'function') {
            showToast('✓ Producto añadido al carrito');
        }
    });
}