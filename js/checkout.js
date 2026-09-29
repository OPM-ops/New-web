// Estado del checkout
let checkoutState = {
    shipping: {
        type: 'pickup', // pickup, bogota, nacional
        cost: 0
    },
    payment: {
        method: null,
        instructions: ''
    },
    customer: {
        name: '',
        address: '',
        email: '',
        whatsapp: '',
        notes: ''
    }
};

// Métodos de pago configurables
const paymentMethods = [
    {
        id: 'nequi',
        name: 'Nequi',
        instructions: 'Nequi: 3208632315'
    },
    {
        id: 'daviplata',
        name: 'Daviplata',
        instructions: 'Bre-B: @JGT255'
    },
    {
        id: 'transferencia',
        name: 'Transferencia Bancaria',
        instructions: 'Banco BBVA: Cta Ahorros 0415162031 - Titular: Jimmy Guzmán Triana'
    },
    {
        id: 'mercadopago',
        name: 'Mercado Pago',
        instructions: 'TELEFONO' // Se reemplazará por mensaje especial
    }
];

// Paso 1: Selección de envío
function renderCheckoutStep1() {
    const stepsContainer = document.getElementById('checkoutSteps');
    stepsContainer.innerHTML = `
        <div class="checkout-step">
            <div class="step-title">1. ¿Cómo quieres recibir tu pedido?</div>
            <label class="shipping-option">
                <input type="radio" name="shipping" value="pickup" checked> Recoger en Bogotá (sin costo)
            </label>
            <label class="shipping-option">
                <input type="radio" name="shipping" value="bogota"> Envío en Bogotá (+$12.000)
            </label>
            <label class="shipping-option">
                <input type="radio" name="shipping" value="nacional"> Envío Nacional (+$20.000)
            </label>
            <button id="toStep2" class="btn btn-primary" style="margin-top:1.5rem;">Continuar</button>
            <p style="margin-top:1rem; font-size:0.75rem; text-align:center;">
                <a href="politicas.html#envios" target="_blank" style="color:var(--primary-light);">
                    <i class="fas fa-circle-info"></i> Ver política de envíos, cambios y devoluciones
                </a>
            </p>
        </div>
    `;

    document.getElementById('toStep2').addEventListener('click', () => {
        const selected = document.querySelector('input[name="shipping"]:checked').value;
        switch(selected) {
            case 'pickup': checkoutState.shipping = { type: 'pickup', cost: 0 }; break;
            case 'bogota': checkoutState.shipping = { type: 'bogota', cost: 12000 }; break;
            case 'nacional': checkoutState.shipping = { type: 'nacional', cost: 20000 }; break;
        }
        renderCheckoutStep2();
    });
}

// Paso 2: Método de pago
function renderCheckoutStep2() {
    const stepsContainer = document.getElementById('checkoutSteps');
    stepsContainer.innerHTML = `
        <div class="checkout-step">
            <div class="step-title">2. Selecciona tu método de pago</div>
            ${paymentMethods.map(method => `
                <label class="payment-option">
                    <input type="radio" name="payment" value="${method.id}"> ${method.name}
                </label>
            `).join('')}
            <div id="paymentInstructions" class="payment-instructions" style="display:none;"></div>
            <button id="toStep3" class="btn btn-primary" style="margin-top:1.5rem;" disabled>Continuar</button>
            <button id="backToStep1" class="btn" style="margin-top:1.5rem; background:#ccc;">Volver</button>
        </div>
    `;

    // Mostrar instrucciones al seleccionar
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const methodId = e.target.value;
            const method = paymentMethods.find(m => m.id === methodId);
            let instructions = method.instructions;
            if (methodId === 'mercadopago') {
                instructions = 'Dentro de poco nos contactaremos por WhatsApp para facilitarte el link de pago de Mercado Pago.';
            }
            checkoutState.payment = {
                method: methodId,
                instructions: instructions
            };
            document.getElementById('paymentInstructions').style.display = 'block';
            document.getElementById('paymentInstructions').innerHTML = `<strong>Instrucciones:</strong> ${instructions}`;
            document.getElementById('toStep3').disabled = false;
        });
    });

    document.getElementById('backToStep1').addEventListener('click', renderCheckoutStep1);
    document.getElementById('toStep3').addEventListener('click', renderCheckoutStep3);
}

// Paso 3: Datos del cliente
function renderCheckoutStep3() {
    const stepsContainer = document.getElementById('checkoutSteps');
    stepsContainer.innerHTML = `
        <div class="checkout-step">
            <div class="step-title">3. Tus datos</div>
            <div class="form-group">
                <label>Nombre completo *</label>
                <input type="text" id="customerName" required>
            </div>
            <div class="form-group">
                <label>Dirección ${checkoutState.shipping.type !== 'pickup' ? '*' : ''}</label>
                <input type="text" id="customerAddress" ${checkoutState.shipping.type !== 'pickup' ? 'required' : ''}>
            </div>
            <div class="form-group">
                <label>Correo electrónico *</label>
                <input type="email" id="customerEmail" required>
            </div>
            <div class="form-group">
                <label>WhatsApp *</label>
                <input type="tel" id="customerWhatsapp" required placeholder="Ej: 3001234567">
            </div>
            <div class="form-group">
                <label>Notas adicionales</label>
                <textarea id="customerNotes" rows="3"></textarea>
            </div>
            <button id="toStep4" class="btn btn-primary">Ver resumen y confirmar</button>
            <button id="backToStep2" class="btn" style="background:#ccc;">Volver</button>
        </div>
    `;

    document.getElementById('backToStep2').addEventListener('click', renderCheckoutStep2);
    document.getElementById('toStep4').addEventListener('click', () => {
        // Validar campos
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const whatsapp = document.getElementById('customerWhatsapp').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        
        if (!name || !email || !whatsapp) {
            alert('Por favor completa todos los campos obligatorios.');
            return;
        }
        if (checkoutState.shipping.type !== 'pickup' && !address) {
            alert('Debes ingresar una dirección para el envío.');
            return;
        }

        checkoutState.customer = {
            name: name,
            address: address || 'Recoge en tienda',
            email: email,
            whatsapp: whatsapp,
            notes: document.getElementById('customerNotes').value.trim() || ''
        };
        renderCheckoutStep4();
    });
}

// Paso 4: Resumen y confirmación
function renderCheckoutStep4() {
    const subtotal = getCartSubtotal();
    const discount = getCartDiscount();
    const shippingCost = checkoutState.shipping.cost;
    const total = getCartTotal() + shippingCost;

    // Generar ID único de pedido
    const orderId = `OPM-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}-${Date.now().toString().slice(-6)}`;

    const itemsList = cart.map(item => 
        `${item.name} ${Object.keys(item.selectedOptions).length ? '('+Object.entries(item.selectedOptions).map(([k,v])=>`${k}:${v}`).join(', ')+')' : ''} x${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-CO')}`
    ).join('\n');

    const stepsContainer = document.getElementById('checkoutSteps');
    stepsContainer.innerHTML = `
        <div class="checkout-step">
            <div class="step-title">4. Confirmar pedido</div>
            <div class="order-summary">
                <p><strong>Pedido:</strong> ${orderId}</p>
                <p><strong>Cliente:</strong> ${checkoutState.customer.name}</p>
                <p><strong>Envío:</strong> ${checkoutState.shipping.type === 'pickup' ? 'Recoge en Bogotá' : checkoutState.shipping.type === 'bogota' ? 'Bogotá' : 'Nacional'} - $${shippingCost.toLocaleString('es-CO')}</p>
                <p><strong>Pago:</strong> ${paymentMethods.find(m => m.id === checkoutState.payment.method).name}</p>
                <p><strong>Instrucciones de pago:</strong> ${checkoutState.payment.instructions}</p>
                <hr style="margin:1rem 0;">
                <p><strong>Productos:</strong></p>
                <pre style="white-space: pre-wrap; font-family: inherit;">${itemsList}</pre>
                <p><strong>Subtotal:</strong> $${subtotal.toLocaleString('es-CO')}</p>
                ${discount > 0 ? `<p><strong>Descuento (cupón ${appliedCoupon.code}):</strong> -$${discount.toLocaleString('es-CO')}</p>` : ''}
                <p style="font-size:1.3rem; margin-top:1rem;"><strong>Total a pagar: $${total.toLocaleString('es-CO')}</strong></p>
            </div>
            <p class="checkout-confirm-hint">¿Cómo prefieres confirmar tu pedido?</p>
            <button id="confirmWhatsAppBtn" class="btn btn-whatsapp"><i class="fab fa-whatsapp"></i> Confirmar por WhatsApp</button>
            <button id="confirmEmailBtn" class="btn btn-primary" style="margin-top:0.6rem;"><i class="fas fa-envelope"></i> Confirmar por Correo</button>
            <button id="backToStep3" class="btn" style="background:#ccc; margin-top:0.6rem;">Volver</button>
        </div>
    `;

    document.getElementById('backToStep3').addEventListener('click', renderCheckoutStep3);

    const paymentMethodId = checkoutState.payment.method;

    // ── Opción 1: confirmar por WhatsApp (no manda correo) ──
    document.getElementById('confirmWhatsAppBtn').addEventListener('click', () => {
        let waMessage = `🛒 *Nuevo pedido confirmado* — ${orderId}\n\n`;
        waMessage += `*Cliente:* ${checkoutState.customer.name}\n`;
        waMessage += `*WhatsApp:* ${checkoutState.customer.whatsapp}\n`;
        waMessage += `*Dirección:* ${checkoutState.customer.address}\n\n`;
        waMessage += `*Productos:*\n${itemsList}\n\n`;
        waMessage += `*Envío:* ${checkoutState.shipping.type === 'pickup' ? 'Recoge en Bogotá' : checkoutState.shipping.type === 'bogota' ? 'Bogotá' : 'Nacional'} - $${shippingCost.toLocaleString('es-CO')}\n`;
        waMessage += `*Pago:* ${paymentMethods.find(m => m.id === checkoutState.payment.method).name}\n`;
        waMessage += `*Total:* $${total.toLocaleString('es-CO')}\n`;
        if (checkoutState.customer.notes) waMessage += `\n*Notas:* ${checkoutState.customer.notes}\n`;
        window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(waMessage)}`, '_blank');

        finishCheckout(orderId, paymentMethodId, { channel: 'whatsapp' });
    });

    // ── Opción 2: confirmar por Correo (no manda WhatsApp) ──
    document.getElementById('confirmEmailBtn').addEventListener('click', () => {
        (async () => {
            const SITE_BASE_URL = 'https://opm-ops.github.io/Landing-pages/';
            const shippingLabel = checkoutState.shipping.type === 'pickup' ? 'Recoge en Bogotá'
                : checkoutState.shipping.type === 'bogota' ? 'Envío en Bogotá'
                : 'Envío Nacional';

            const orderData = {
                order_id: orderId,
                customer_email: checkoutState.customer.email,
                orders: cart.map(item => ({
                    name: item.name + (Object.keys(item.selectedOptions).length
                        ? ' (' + Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') + ')'
                        : ''),
                    price: (item.price * item.quantity).toLocaleString('es-CO'),
                    units: item.quantity,
                    image: item.image.startsWith('http') ? item.image : SITE_BASE_URL + item.image
                })),
                cost: {
                    shipping: shippingCost.toLocaleString('es-CO'),
                    shipping_method: shippingLabel,
                    total: total.toLocaleString('es-CO')
                }
            };

            const sent = await sendOrderEmail(orderData);
            finishCheckout(orderId, paymentMethodId, { channel: 'email', sent });
        })();
    });
}

// Limpia el carrito/estado y muestra la pantalla final de éxito
function finishCheckout(orderId, paymentMethodId, emailResult) {
    clearCart();
    checkoutState = { shipping: { type: 'pickup', cost: 0 }, payment: {}, customer: {} };
    renderCheckoutSuccess(orderId, paymentMethodId, emailResult);
}

// Paso 5: pantalla de éxito con los recordatorios importantes (reemplaza al alert())
function renderCheckoutSuccess(orderId, paymentMethodId, emailResult) {
    const stepsContainer = document.getElementById('checkoutSteps');

    const paymentReminderHTML = paymentMethodId === 'mercadopago'
        ? `
        <div class="checkout-reminder checkout-reminder--warning">
            <i class="fas fa-triangle-exclamation"></i>
            <div>
                <strong>Escríbenos por WhatsApp para generarte el link de pago.</strong>
                <p>Ten en cuenta que Mercado Pago cobra un <strong>6% adicional</strong> por gestión de la plataforma sobre el total de tu pedido.</p>
            </div>
        </div>`
        : `
        <div class="checkout-reminder">
            <i class="fas fa-camera"></i>
            <div>
                <strong>Envíanos la captura de pantalla de tu pago</strong>
                <p>Por WhatsApp al <strong>+57 311 541 6469</strong>, así confirmamos tu pedido más rápido.</p>
            </div>
        </div>`;

    const emailReminderHTML = emailResult.channel === 'email' ? (
        emailResult.sent
            ? `
        <div class="checkout-reminder checkout-reminder--info">
            <i class="fas fa-envelope-open-text"></i>
            <div>
                <strong>Te enviamos un correo de confirmación.</strong>
                <p>Si no lo ves en tu bandeja principal en unos minutos, revisa la carpeta de <strong>Spam o Correo no deseado</strong>.</p>
            </div>
        </div>`
            : `
        <div class="checkout-reminder checkout-reminder--warning">
            <i class="fas fa-envelope"></i>
            <div>
                <strong>No pudimos enviar el correo automático.</strong>
                <p>Tu pedido ya quedó registrado — igual escríbenos por WhatsApp con tu número de pedido para confirmarlo.</p>
            </div>
        </div>`
    ) : '';

    stepsContainer.innerHTML = `
        <div class="checkout-step checkout-success">
            <div class="checkout-success-icon"><i class="fas fa-check-circle"></i></div>
            <h3>¡Pedido confirmado!</h3>
            <p class="checkout-success-orderid">Pedido ${orderId}</p>

            ${paymentReminderHTML}
            ${emailReminderHTML}

            <button id="closeCheckoutBtn" class="btn btn-primary" style="margin-top:1.2rem;">Entendido</button>
        </div>
    `;

    document.getElementById('closeCheckoutBtn').addEventListener('click', () => {
        document.getElementById('checkoutModal').style.display = 'none';
    });
}