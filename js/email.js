// Configuración de EmailJS — cuenta real de One Play More
emailjs.init("XvRAm-iIJrMF3FfVL");

const EMAIL_SERVICE_ID = "service_bvr0uci";
const EMAIL_TEMPLATE_ID = "template_f4gdcyr"; // "Order Confirmation" — se usa para cliente Y dueño
const STORE_EMAIL = "oneplaymore13@gmail.com";

/**
 * Envía la confirmación de pedido usando la MISMA plantilla dos veces:
 * una al cliente y otra a la tienda (oneplaymore13@gmail.com), cambiando
 * solo el destinatario ({{email}}) — así ambos ven el mismo diseño bonito
 * con la tabla de productos.
 * @param {Object} orderData - { order_id, customer_email, orders, cost }
 *   orders: array de { name, price, units } (price ya formateado, sin "$")
 *   cost:   { shipping, tax, total } (también ya formateados, sin "$")
 */
async function sendOrderEmail(orderData) {
    const baseParams = {
        order_id: orderData.order_id,
        orders: orderData.orders,
        cost: orderData.cost
    };

    try {
        // 1. Correo al cliente
        await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, {
            ...baseParams,
            email: orderData.customer_email
        });
        console.log("Correo al cliente enviado");

        // 2. Correo a la tienda (mismo diseño, mismo pedido, tu correo fijo)
        await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, {
            ...baseParams,
            email: STORE_EMAIL
        });
        console.log("Correo a la tienda enviado");

        return true;
    } catch (error) {
        console.error("Error enviando email:", error);
        return false;
    }
}
