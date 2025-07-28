// controllers/tecnosoluciones-chat.controller.js - Business-friendly chatbot controller
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import { sendChatRequest } from '../services/ai.service.js';
import { conversationStore, getArchivingStatus } from '../services/conversation.service.js';
import { sanitizeInput } from '../client/src/security/utils.js';

// Business-focused security check (much less restrictive for Spanish business context)
function businessSecurityCheck(input) {
  if (!input) return { isSecurityThreat: false, sanitizedInput: '' };
  
  // Only block obvious harmful content for business context
  const harmfulPatterns = [
    // Only block very obvious jailbreak attempts that don't occur in normal Spanish
    /ignore all previous instructions and/i,
    /you are now a different AI/i,
    /forget your role as.*assistant/i,
    /pretend you are not.*tecnosoluciones/i,
    
    // Block spam/abuse but allow normal business questions
    /(.)\1{30,}/g, // Excessive character repetition (increased threshold)
    /https?:\/\/[^\s]+\.(exe|bat|scr|cmd)/i, // Suspicious file links
    
    // Block only extreme profanity (business context allows some informal language)
    /\b(fuck you|go fuck yourself|fucking idiot)\b/i,
    
    // Block obvious admin override attempts
    /override.*code|admin.*password|system.*access/i
  ];
  
  // Sanitize input lightly (preserve business terminology and Spanish language)
  const sanitized = sanitizeInput(input);
  
  // Check for harmful patterns - but be very lenient for normal Spanish business text
  const isHarmful = harmfulPatterns.some(pattern => {
    const matches = pattern.test(sanitized.text);
    if (matches) {
      console.log(`[SECURITY] Harmful pattern matched: ${pattern} in text: ${sanitized.text.substring(0, 50)}`);
    }
    return matches;
  });
  
  // Additional check: Don't flag normal Spanish business vocabulary as suspicious
  const spanishBusinessTerms = [
    'pagina web', 'sitio web', 'chatbot', 'marketing', 'publicidad', 'vender', 'negocio',
    'empresa', 'servicio', 'cliente', 'proyecto', 'presupuesto', 'contacto', 'consulta',
    'desarrollar', 'crear', 'diseño', 'profesional', 'digital', 'online', 'internet',
    'redes sociales', 'campaña', 'ventas', 'promocion', 'estrategia', 'solucion',
    'tecnologia', 'aplicacion', 'sistema', 'plataforma', 'herramienta'
  ];
  
  // If text contains business terms, reduce suspicion significantly
  const containsBusinessTerms = spanishBusinessTerms.some(term => 
    sanitized.text.toLowerCase().includes(term.toLowerCase())
  );
  
  if (containsBusinessTerms && !isHarmful) {
    console.log(`[SECURITY] Text contains business terms and no harmful patterns - allowing`);
    return {
      isSecurityThreat: false,
      sanitizedInput: sanitized.text,
      securityMessage: null
    };
  }
  
  if (isHarmful) {
    return {
      isSecurityThreat: true,
      sanitizedInput: sanitized.text,
      securityMessage: "Disculpá, pero prefiero mantener una conversación profesional sobre nuestros servicios de desarrollo web. ¿En qué puedo ayudarte con tu proyecto?"
    };
  }
  
  return {
    isSecurityThreat: false,
    sanitizedInput: sanitized.text,
    securityMessage: null
  };
}

// Spanish-specific obfuscation detection (much more lenient)
function detectSpanishObfuscation(input) {
  if (!input || typeof input !== 'string') {
    return { hasObfuscation: false, techniques: {} };
  }
  
  // Only detect actual obfuscation techniques, not normal Spanish text patterns
  const obfuscationPatterns = {
    // Only flag if there are excessive special characters (not normal Spanish accents)
    excessiveSpecialChars: /[^\w\sáéíóúüñÁÉÍÓÚÜÑ.,!?¿¡():-]{5,}/g,
    
    // Only flag obvious character substitution (not normal Spanish letters)
    characterSubstitution: /[0-9]{3,}[a-zA-Z]{3,}[0-9]{3,}/g,
    
    // Only flag if there are obvious encoding attempts
    base64Like: /^[A-Za-z0-9+/]{20,}={0,2}$/,
    
    // Only flag hex patterns that are clearly not Spanish words
    hexPattern: /0x[0-9a-fA-F]{8,}/g,
    
    // Only flag if there are excessive special separators
    excessiveSeparators: /[_\-\.]{10,}/g
  };
  
  const techniques = {};
  let hasObfuscation = false;
  
  for (const [technique, pattern] of Object.entries(obfuscationPatterns)) {
    const matches = input.match(pattern);
    if (matches && matches.length > 0) {
      techniques[technique] = matches.length;
      hasObfuscation = true;
      console.log(`[SECURITY] Detected obfuscation technique: ${technique}, matches: ${matches.length}`);
    }
  }
  
  // Spanish text should almost never trigger obfuscation detection
  // Additional safety check: if text contains normal Spanish words, reduce obfuscation score
  const spanishWords = [
    'hola', 'como', 'que', 'con', 'para', 'una', 'por', 'del', 'las', 'los',
    'web', 'pagina', 'sitio', 'empresa', 'negocio', 'servicio', 'proyecto',
    'quiero', 'necesito', 'busco', 'tengo', 'hacer', 'crear', 'desarrollar'
  ];
  
  const containsSpanishWords = spanishWords.some(word => 
    input.toLowerCase().includes(word)
  );
  
  // If it contains Spanish words and obfuscation was detected, it's likely a false positive
  if (containsSpanishWords && hasObfuscation) {
    console.log(`[SECURITY] Spanish words detected - likely false positive obfuscation detection`);
    return { hasObfuscation: false, techniques: {} };
  }
  
  return {
    hasObfuscation,
    techniques,
    confidence: hasObfuscation ? (Object.keys(techniques).length * 20) : 0
  };
}

// Enhanced business security pipeline for TecnoSoluciones
function enhancedBusinessSecurityCheck(input, userId) {
  if (!input || input.trim() === '') {
    return {
      isSecurityThreat: false,
      riskScore: 0,
      sanitizedInput: '',
      details: { reason: 'empty_input' }
    };
  }
  
  // First run basic business security check
  const basicCheck = businessSecurityCheck(input);
  if (basicCheck.isSecurityThreat) {
    return {
      isSecurityThreat: true,
      riskScore: 80,
      sanitizedInput: basicCheck.sanitizedInput,
      securityMessage: basicCheck.securityMessage,
      details: { reason: 'harmful_content_detected' }
    };
  }
  
  // Run Spanish-aware obfuscation detection
  const obfuscationCheck = detectSpanishObfuscation(basicCheck.sanitizedInput);
  
  // For TecnoSoluciones, we're much more lenient - only block if there's high confidence obfuscation
  const shouldBlock = obfuscationCheck.hasObfuscation && obfuscationCheck.confidence > 60;
  
  if (shouldBlock) {
    console.log(`[SECURITY] High-confidence obfuscation detected (${obfuscationCheck.confidence}%) - blocking`);
    return {
      isSecurityThreat: true,
      riskScore: obfuscationCheck.confidence,
      sanitizedInput: basicCheck.sanitizedInput,
      securityMessage: "Disculpá, parece que hay un problema con el formato de tu mensaje. ¿Podrías reformularlo? Estoy aquí para ayudarte con tu proyecto web.",
      details: { 
        reason: 'high_confidence_obfuscation',
        techniques: obfuscationCheck.techniques,
        confidence: obfuscationCheck.confidence
      }
    };
  }
  
  // Calculate a very low risk score for normal business conversations
  const riskScore = Math.min(15, obfuscationCheck.confidence || 0);
  
  return {
    isSecurityThreat: false,
    riskScore,
    sanitizedInput: basicCheck.sanitizedInput,
    securityMessage: null,
    details: {
      reason: 'normal_business_conversation',
      obfuscationCheck,
      riskScore
    }
  };
}

// TecnoSoluciones knowledge base
const tecnosolucionesKnowledgeBase = {
  company: {
    name: "TecnoSoluciones",
    founded: "2016",
    experience: "8+ años",
    location: "Argentina",
    specialization: "Desarrollo Web Profesional y Marketing Digital",
    contact: {
      email: "tecnosolucionesuno@gmail.com",
      whatsapp: "+54 9 113 422 7461",
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
      ],
      benefits: [
        "Más ventas garantizadas desde el primer mes",
        "Herramientas digitales que trabajan 24/7",
        "Mejor posicionamiento en Google",
        "Captura automática de leads"
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
      ],
      benefits: [
        "Nunca pierdas un cliente por falta de atención",
        "Automatiza consultas frecuentes",
        "Califica leads automáticamente",
        "Reduce costos operativos"
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
      ],
      benefits: [
        "Aumenta tu visibilidad online",
        "Atrae clientes cualificados",
        "Mejora tu reputación digital",
        "Resultados medibles y transparentes"
      ]
    }
  },
  advantages: {
    experience: "8+ años de experiencia comprobada creando sitios web exitosos para empresas argentinas",
    uniqueDesigns: "Diseños únicos y personalizados - cada proyecto es específico para tu negocio",
    freeConsultation: "Consulta inicial GRATIS - Presupuestos sin costo y asesoramiento gratuito",
    guaranteedResults: "Más ventas garantizadas - Nuestros sitios web están diseñados para convertir",
    continuousSupport: "Soporte continuo - Te acompañamos después del lanzamiento",
    fastResponse: "Respuesta rápida - Contestamos en menos de 1 hora"
  },
  specialOffers: {
    discount: "15% de descuento mencionando que viste esta información",
    freeConsultation: "Consulta y presupuesto completamente GRATIS",
    guarantee: "Garantía de más ventas o te devolvemos el dinero"
  }
};

const getStageInstructions = (stage) => {
  switch (stage) {
    case 'discovery':
      return `
ETAPA: DESCUBRIMIENTO Y CALIFICACIÓN DE LEAD

Tu objetivo es recopilar información del cliente de manera natural y conversacional:

INFORMACIÓN A RECOPILAR:
- Nombre del cliente
- Tipo de negocio/industria
- Email de contacto (opcional en esta etapa)
- Teléfono (opcional en esta etapa)
- Necesidades específicas (sitio web, chatbot, marketing digital)
- Presupuesto aproximado (de manera sutil)
- Urgencia del proyecto

ENFOQUE:
- Haz preguntas abiertas que inviten a contar más
- Escucha activamente y profundiza en las respuestas
- Sugiere soluciones específicas basadas en sus necesidades
- Mantén el foco en BENEFICIOS y RESULTADOS, no solo características
- NO inventes ejemplos de clientes ficticios

EJEMPLOS DE PREGUNTAS:
- "¿Qué tipo de resultados esperás obtener con tu sitio web?"
- "¿Qué problemas específicos tenés actualmente con tu presencia digital?"
- "¿Cuántos clientes nuevos te gustaría atraer por mes?"
`;

    case 'ready_for_summary':
      return `
ETAPA: PREPARACIÓN PARA RESUMEN

Has recopilado suficiente información. Ahora debes:

1. CREAR UN RESUMEN DETALLADO de lo que el cliente necesita
2. INCLUIR servicios específicos recomendados
3. MENCIONAR presupuesto estimado si es posible
4. PREGUNTAR CONFIRMACIÓN específicamente

FORMATO DEL RESUMEN:
"Perfecto [NOMBRE], basándome en nuestra conversación, este es el resumen de lo que necesitás:

🏢 **Tipo de negocio:** [NEGOCIO]
📋 **Servicios requeridos:** [SERVICIOS]
🎯 **Objetivos:** [OBJETIVOS]
💰 **Presupuesto aproximado:** [RANGO]
⏰ **Timeframe:** [TIEMPO]

¿Es correcto este resumen? Si confirmás que está todo bien, envío inmediatamente esta información a nuestro equipo comercial para que te preparen una propuesta personalizada."

IMPORTANTE: Pregunta EXPLÍCITAMENTE si el resumen es correcto.
`;

    case 'summary':
      return `
ETAPA: ESPERANDO CONFIRMACIÓN

El cliente debe confirmar el resumen. Responde de manera breve y espera su confirmación.

Si confirma (sí, correcto, perfecto, confirmo), procede con el envío.
Si no confirma, ajusta el resumen según sus correcciones.
`;

    case 'completed':
      return `
ETAPA: CONSULTA ENVIADA

La consulta ya fue enviada. Agradece y proporciona información de contacto adicional.
`;

    default:
      return '';
  }
};

const tecnosolucionesInstructions = `
Eres el asistente virtual de TecnoSoluciones, una empresa argentina especializada en desarrollo web profesional con más de 8 años de experiencia transformando negocios.

INFORMACIÓN CLAVE:
- Empresa: TecnoSoluciones
- Experiencia: Más de 8 años (desde 2016)
- Especialización Principal: DESARROLLO WEB PROFESIONAL que aumenta ventas online
- Servicios: Desarrollo Web Profesional, Chatbots Inteligentes, Marketing Digital Integral
- Ubicación: Argentina
- Contacto: tecnosolucionesuno@gmail.com / WhatsApp: +54 9 113 422 7461

MENSAJE PRINCIPAL:
"¿Necesitás un sitio web que realmente convierta visitantes en clientes? Somos especialistas en desarrollo web profesional y marketing digital con más de 8 años transformando negocios argentinos."

PROPUESTA DE VALOR ÚNICA:
- No solo diseñamos páginas bonitas: desarrollamos herramientas digitales que aumentan ventas 24/7
- Sitios web optimizados para conversión, no solo para verse bien
- Más ventas garantizadas desde el primer mes
- Estrategia integral: desarrollo web + marketing digital + automatización

SERVICIOS PRINCIPALES:
1. **Desarrollo Web Profesional** - Sitios web que venden 24/7, optimizados para conversión
2. **Chatbots Inteligentes** - Automatización de atención al cliente y captura de leads
3. **Marketing Digital Integral** - Gestión completa de redes sociales y publicidad online

VENTAJAS COMPETITIVAS:
- 8+ años de experiencia comprobada
- Diseños únicos y personalizados
- Consulta inicial GRATIS
- Respuesta en menos de 1 hora
- Más ventas garantizadas

OFERTA ESPECIAL:
- Consulta y presupuesto GRATIS
- 15% de descuento mencionando esta consulta
- Garantía de resultados

PROCESO DE CONVERSACIÓN:
Tu objetivo es recopilar información del cliente para generar un resumen detallado que se enviará por email a la empresa.

INFORMACIÓN A RECOPILAR:
- Nombre del cliente
- Tipo de negocio
- Necesidades específicas (sitio web, chatbot, marketing)
- Objetivos y expectativas
- Presupuesto aproximado
- Timeline/urgencia
- Información de contacto (email, teléfono)

IMPORTANTE: 
- Cuando tengas suficiente información (después de varias interacciones), genera un RESUMEN DETALLADO y pregunta específicamente si es correcto.
- Si el cliente confirma, la información se enviará automáticamente a la empresa.
- NO inventes ejemplos de clientes ficticios o casos de estudio
- Enfócate en los beneficios reales y la experiencia comprobada
- Mantén las respuestas naturales y profesionales

TONO Y ESTILO:
- Profesional pero emprendedor y cercano
- Usa términos argentinos cuando sea apropiado
- Enfócate en RESULTADOS y CONVERSIÓN, no solo en diseño
- Menciona los 8 años de experiencia transformando negocios argentinos
- Siempre ofrece consultas GRATIS
- Dirigir hacia WhatsApp para contacto directo
- Crear urgencia: "No pierdas más clientes por no tener presencia digital profesional"

FRASES CLAVE A USAR:
- "Sitios web que realmente venden"
- "Convertir visitantes en clientes"
- "Más ventas garantizadas"
- "Herramientas digitales que aumentan ventas 24/7"
- "No pierdas más clientes por no tener presencia digital profesional"

NUNCA:
- Inventes precios específicos sin consultar
- Prometas tiempos exactos sin conocer el proyecto
- Hables de servicios que no ofrecemos
- Rompas el carácter profesional y emprendedor
- Olvides mencionar la consulta GRATIS
- Inventes ejemplos de clientes ficticios o casos específicos

${JSON.stringify(tecnosolucionesKnowledgeBase, null, 2)}
`;

export async function processTecnosolucionesChat(req, res) {
  try {
    const { message, history = [], language = 'es', stage = 'discovery' } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userId = 'tecnosoluciones-' + ip;
    
    console.log(`Processing TecnoSoluciones chat request for userId: ${userId}, stage: ${stage}`);
    console.log(`Input message: "${message}"`);
    
    // Run enhanced business-focused security checks
    const securityResult = enhancedBusinessSecurityCheck(message, userId);
    
    console.log(`Security check result:`, {
      isSecurityThreat: securityResult.isSecurityThreat,
      riskScore: securityResult.riskScore,
      reason: securityResult.details?.reason
    });
    
    // Check if security threat detected (only for obvious harmful content)
    if (securityResult.isSecurityThreat) {
      console.log("[SECURITY] Blocking harmful content");
      
      await enhancedLogSecurityEvent('security_threat', message, {
        userId,
        source: 'tecnosoluciones',
        type: 'harmful_content',
        riskScore: securityResult.riskScore,
        details: securityResult.details
      });
      
      return res.json({
        response: securityResult.securityMessage,
        language: 'es'
      });
    }
    
    // Log low-risk events only if they're above a certain threshold
    if (securityResult.riskScore > 20) {
      console.log(`[SECURITY] Logging low-risk security event (score: ${securityResult.riskScore})`);
      await enhancedLogSecurityEvent('low_risk_input', message, {
        userId,
        source: 'tecnosoluciones',
        riskScore: securityResult.riskScore,
        details: securityResult.details
      });
    }
    
    try {
      // Get stage-specific instructions
      const stageInstructions = getStageInstructions(stage);
      
      // Create contextualized message with TecnoSoluciones knowledge and stage info
      const contextualizedMessage = `
${tecnosolucionesInstructions}

${stageInstructions}

Consulta del cliente: ${securityResult.sanitizedInput}

Recordá responder siempre en español argentino, ser profesional pero emprendedor, enfocarte en cómo nuestros sitios web VENDEN y generan MÁS CLIENTES, y seguir el proceso de recopilación de información según la etapa actual.

CONTEXTO DE LA CONVERSACIÓN:
- Etapa actual: ${stage}
- Número de mensajes en historial: ${history.length}

${stage === 'ready_for_summary' ? 'IMPORTANTE: Debes generar un resumen detallado de los requerimientos del cliente y preguntar confirmación específicamente.' : ''}
${stage === 'summary' ? 'IMPORTANTE: Estás esperando confirmación del resumen. Responde brevemente.' : ''}

REGLAS IMPORTANTES PARA ESTA CONVERSACIÓN:
- NO inventes ejemplos específicos de clientes o casos de estudio
- NO digas cosas como "Tuvimos un cliente que tenía una panadería..."
- Enfócate en beneficios generales y la experiencia comprobada de 8 años
- Habla de resultados reales sin inventar casos específicos
- Si necesitás dar ejemplos, habla de tipos de negocio en general, no casos específicos
- Cuando la conversación ha progresado suficientemente y tenés información del cliente, genera un resumen y pide confirmación
`;
      
      // Get response from AI service
      const responseResult = await sendChatRequest(contextualizedMessage, history, userId);
      
      // Log conversation if archiving is enabled
      if (getArchivingStatus()) {
        await conversationStore.addMessage(userId, securityResult.sanitizedInput, true, { 
          source: 'tecnosoluciones',
          language: 'es',
          stage: stage,
          securityScore: securityResult.riskScore
        });
        await conversationStore.addMessage(userId, responseResult.text, false, { 
          source: 'tecnosoluciones',
          language: 'es',
          stage: stage
        });
      }
      
      return res.json({ 
        response: responseResult.text,
        language: 'es',
        stage: stage
      });
      
    } catch (aiError) {
      console.error("AI Service Error:", aiError);
      
      const fallbackMessage = "Disculpá, estoy teniendo problemas técnicos en este momento. Para una respuesta inmediata sobre nuestros sitios web que realmente venden, contactanos por WhatsApp: +54 9 113 422 7461 o email: tecnosolucionesuno@gmail.com - ¡Consulta GRATIS!";
      
      return res.status(200).json({ 
        response: fallbackMessage,
        language: 'es'
      });
    }
    
  } catch (error) {
    console.error("API Error:", error);
    
    const errorMessage = "Ocurrió un error inesperado. Por favor, contactanos directamente por WhatsApp: +54 9 113 422 7461 para tu consulta GRATIS sobre desarrollo web profesional.";
    
    return res.status(200).json({ 
      response: errorMessage,
      language: 'es'
    });
  }
}