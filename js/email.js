// Configuración de EmailJS
// PASO 1: Registrarse en https://www.emailjs.com
// PASO 2: Conectar un servicio de correo (Gmail, Outlook, etc.)
// PASO 3: Crear dos plantillas (owner y customer)
// PASO 4: Reemplazar TU_PUBLIC_KEY, TU_SERVICE_ID, TEMPLATE_OWNER, TEMPLATE_CUSTOMER

// emailjs.init("TU_PUBLIC_KEY");  // <-- CAMBIA ESTO

// const EMAIL_SERVICE_ID = "service_xxx";        // <-- CAMBIA
// const TEMPLATE_OWNER_ID = "template_owner";    // <-- CAMBIA
// const TEMPLATE_CUSTOMER_ID = "template_customer"; // <-- CAMBIA

/**
 * Envía los correos de confirmación (dueño y cliente)
 * @param {Object} orderData - Todos los datos del pedido
 */
// async function sendOrderEmail(orderData) {
//     try {
//         // 1. Enviar correo al dueño
//         await emailjs.send(EMAIL_SERVICE_ID, TEMPLATE_OWNER_ID, orderData);
//         console.log("Correo a dueño enviado");
// 
//         // 2. Enviar correo al cliente
//         await emailjs.send(EMAIL_SERVICE_ID, TEMPLATE_CUSTOMER_ID, {
//             to_email: orderData.customer_email,
//             customer_name: orderData.customer_name,
//             order_id: orderData.order_id,
//             // Puedes agregar más variables si las tienes en la plantilla
//         });
//         console.log("Correo a cliente enviado");
//         return true;
//     } catch (error) {
//         console.error("Error enviando email:", error);
//         alert("Hubo un problema al enviar la confirmación. Por favor, toma captura de tu pedido y contáctanos por WhatsApp.");
//         return false;
//     }
// }