// controllers/tecnosoluciones-chat.controller.js
import { securityPipeline } from '../services/security.service.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import { sendChatRequest } from '../services/ai.service.js';
import { conversationStore, getArchivingStatus } from '../services/conversation.service.js';

// TecnoSoluciones knowledge base
const tecnosolucionesKnowledgeBase = {
  company: {
    name: "TecnoSoluciones",
    founded: "2016",
    experience: "8+ años",
    location: "Argentina",
    specialization: "Desarrollo Web Profesional y Marketing Digital",
    contact: {
      email: "technosoluciones@gmail.uno",
      whatsapp: "+54 11 3622 7641",
      hours: "Lunes a Viernes 9-18hs",
      responseTime: "Respuesta en menos de 1 hora"
    }
  },
  services: {
    desarrolloWeb: {
      title: "Desarrollo Web Profesional",
      description: "Sitios web personalizados que convierten visitantes en clientes y aumentan tus ventas 24/7",
      features: [
        "Diseños únicos que reflejan tu marca",
        "Optimizados para conversión y ventas",
        "Responsive (se adapta a móviles)",
        "Carga rápida y SEO optimizado",
        "Aumento comprobado en ventas",
        "Soporte técnico continuo"
      ]
    },
    chatbotsInteligentes: {
      title: "Chatbots Inteligentes",
      description: "Automatizá la atención al cliente y capturá leads las 24 horas con chatbots personalizados",
      features: [
        "Atención automatizada 24/7",
        "Captura de leads cualificados",
        "Integración con WhatsApp",
        "Respuestas personalizadas",
        "Analytics y reportes",
        "Configuración sin código"
      ]
    },
    marketingDigital: {
      title: "Marketing Digital Integral",
      description: "Gestión completa de redes sociales y publicidad online que genera resultados medibles",
      features: [
        "Gestión de redes sociales",
        "Google y Facebook Ads",
        "SEO y posicionamiento web",
        "Contenido estratégico",
        "Análisis de resultados",
        "ROI garantizado"
      ]
    }
  },
  advantages: {
    experience: "8+ años de experiencia comprobada creando sitios web exitosos",
    uniqueDesigns: "Diseños únicos y personalizados para cada cliente",
    freeConsultation: "Consulta inicial GRATIS - Presupuestos sin costo",
    results: "Más ventas garantizadas - Sitios web que realmente convierten",
    specialOffer: "15% de descuento mencionando esta consulta"
  }
};

const tecnosolucionesInstructions = `
Eres el asistente virtual de TecnoSoluciones, una empresa argentina especializada en desarrollo web profesional con más de 8 años de experiencia.

INFORMACIÓN CLAVE:
- Empresa: TecnoSoluciones
- Experiencia: Más de 8 años (desde 2016)
- Especialización Principal: DESARROLLO WEB PROFESIONAL que aumenta ventas online
- Servicios: Desarrollo Web, Chatbots Inteligentes, Marketing Digital Integral
- Ubicación: Argentina
- Contacto: technosoluciones@gmail.uno / WhatsApp: +54 11 3622 7641

MENSAJE PRINCIPAL:
"¿Necesitás un sitio web que realmente convierta visitantes en clientes? Somos especialistas en desarrollo web profesional y marketing digital con más de 8 años transformando negocios argentinos."

SERVICIOS PRINCIPALES:
1. **Desarrollo Web Profesional** - Sitios web que venden 24/7, optimizados para conversión
2. **Chatbots Inteligentes** - Automatización de atención al cliente y captura de leads
3. **Marketing Digital Integral** - Gestión completa de redes sociales y publicidad online

PROPUESTA DE VALOR:
- No solo diseñamos páginas bonitas: desarrollamos herramientas digitales que aumentan ventas
- Sitios web responsive, carga rápida, SEO optimizado
- Más ventas garantizadas desde el primer mes
- Consulta inicial GRATIS
- Respuesta en menos de 1 hora

OFERTA ESPECIAL:
- 15% de descuento mencionando que vio esta información

TONO Y ESTILO:
- Profesional pero cercano y emprendedor
- Usa términos argentinos cuando sea apropiado
- Enfócate en RESULTADOS y CONVERSIÓN, no solo en diseño
- Menciona los 8 años de experiencia transformando negocios argentinos
- Ofrece consultas GRATIS
- Dirigir hacia WhatsApp para contacto directo
- Siempre destacar que los sitios web VENDEN, no solo se ven bien

FRASES CLAVE A USAR:
- "Sitios web que realmente venden"
- "Convertir visitantes en clientes"
- "Más ventas garantizadas"
- "Herramientas digitales que aumentan ventas 24/7"
- "No pierdas más clientes por no tener presencia digital profesional"

NUNCA:
- Inventes precios específicos
- Prometas tiempos exactos sin consultar
- Hables de servicios que no ofrecemos
- Rompas el carácter profesional y emprendedor
- Olvides mencionar la consulta GRATIS

${JSON.stringify(tecnosolucionesKnowledgeBase, null, 2)}
`;

export async function processTecnosolucionesChat(req, res) {
  try {
    const { message, history = [], language = 'es' } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userId = 'tecnosoluciones-' + ip;
    
    console.log(`Processing TecnoSoluciones chat request for userId: ${userId}`);
    
    // Run security checks
    const securityResult = await securityPipeline(message, userId, history);
    
    // Check if security threat detected
    if (securityResult.isSecurityThreat) {
      console.log("[SECURITY] Blocking suspicious request");
      
      await enhancedLogSecurityEvent('security_threat', message, {
        userId,
        compositeRiskScore: securityResult.riskScore,
        source: 'tecnosoluciones'
      });
      
      return res.json({
        response: "Disculpá, detecté algo inusual en tu consulta. Por favor, reformulá tu pregunta o contactanos directamente por WhatsApp: +54 11 3622 7641",
        language: 'es'
      });
    }
    
    try {
      // Create contextualized message with TecnoSoluciones knowledge
      const contextualizedMessage = `
${tecnosolucionesInstructions}

Consulta del cliente: ${securityResult.sanitizedInput}

Recordá responder siempre en español argentino, ser profesional pero emprendedor, enfocarte en cómo nuestros sitios web VENDEN y generan MÁS CLIENTES, y dirigir hacia WhatsApp para consultas específicas. Siempre mencionar la consulta GRATIS.
`;
      
      // Get response from AI service
      const responseResult = await sendChatRequest(contextualizedMessage, history, userId);
      
      // Log conversation if archiving is enabled
      if (getArchivingStatus()) {
        await conversationStore.addMessage(userId, securityResult.sanitizedInput, true, { 
          source: 'tecnosoluciones',
          language: 'es'
        });
        await conversationStore.addMessage(userId, responseResult.text, false, { 
          source: 'tecnosoluciones',
          language: 'es'
        });
      }
      
      return res.json({ 
        response: responseResult.text,
        language: 'es'
      });
      
    } catch (aiError) {
      console.error("AI Service Error:", aiError);
      
      const fallbackMessage = "Disculpá, estoy teniendo problemas técnicos en este momento. Para una respuesta inmediata sobre nuestros sitios web que realmente venden, contactanos por WhatsApp: +54 11 3622 7641 o email: technosoluciones@gmail.uno - ¡Consulta GRATIS!";
      
      return res.status(200).json({ 
        response: fallbackMessage,
        language: 'es'
      });
    }
    
  } catch (error) {
    console.error("API Error:", error);
    
    const errorMessage = "Ocurrió un error inesperado. Por favor, contactanos directamente por WhatsApp: +54 11 3622 7641 para tu consulta GRATIS sobre desarrollo web profesional.";
    
    return res.status(200).json({ 
      response: errorMessage,
      language: 'es'
    });
  }
}