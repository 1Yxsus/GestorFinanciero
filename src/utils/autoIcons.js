// Detección automática y contextual de icono/emoji según palabras clave

const ICON_RULES = [
  // Alimentación y Bebidas
  { keywords: ['pizza', 'pizzeria'], icon: '🍕' },
  { keywords: ['hamburguesa', 'burger', 'mcdonalds', 'wendys', 'bembos'], icon: '🍔' },
  { keywords: ['cafe', 'coffee', 'starbucks', 'cafeteria', 'capuchino', 'latte', 'espresso'], icon: '☕' },
  { keywords: ['cena', 'almuerzo', 'desayuno', 'comida', 'restaurante', 'comer'], icon: '🍽️' },
  { keywords: ['sushi', 'ramen', 'japones', 'poke'], icon: '🍣' },
  { keywords: ['taco', 'tacos', 'mexicana', 'burrito', 'quesadilla'], icon: '🌮' },
  { keywords: ['cerveza', 'birra', 'bar', 'chela', 'trago', 'coctel', 'discoteca', 'vino'], icon: '🍺' },
  { keywords: ['helado', 'postre', 'pastel', 'dulce', 'panaderia', 'torta', 'chocolates'], icon: '🍦' },

  // Supermercado y Tiendas
  { keywords: ['super', 'supermercado', 'mercado', 'compras', 'despensa', 'walmart', 'carulla', 'oxxo', 'mercadona', 'jumbo', 'lider'], icon: '🛒' },

  // Transporte y Movilidad
  { keywords: ['uber', 'didi', 'cabify', 'taxi'], icon: '🚗' },
  { keywords: ['gasolina', 'combustible', 'nafta', 'estacion', 'petroleo'], icon: '⛽' },
  { keywords: ['metro', 'subte', 'tren', 'bus', 'colectivo', 'pasaje', 'transmilenio'], icon: '🚇' },
  { keywords: ['vuelo', 'avion', 'aeropuerto', 'viaje', 'hotel', 'airbnb'], icon: '✈️' },
  { keywords: ['moto', 'bici', 'bicicleta', 'reparacion moto'], icon: '🛵' },
  { keywords: ['estacionamiento', 'parqueadero', 'peaje'], icon: '🅿️' },

  // Hogar y Servicios Básicos
  { keywords: ['luz', 'electricidad', 'enel', 'cfe', 'edesur'], icon: '💡' },
  { keywords: ['agua', 'aqualia', 'sedapal', 'aysa'], icon: '💧' },
  { keywords: ['gas', 'garrafa', 'calefaccion'], icon: '🔥' },
  { keywords: ['internet', 'wifi', 'fibra', 'claro', 'movistar', 'tigo', 'vodafone'], icon: '📶' },
  { keywords: ['arriendo', 'alquiler', 'renta', 'hipoteca', 'casa', 'departamento'], icon: '🏠' },
  { keywords: ['mantenimiento', 'reparacion', 'plomero', 'ferreteria', 'pintura'], icon: '🔧' },

  // Trabajo, Ingresos y Finanzas
  { keywords: ['sueldo', 'salario', 'quincena', 'nomina', 'pago quincenal', 'mesada'], icon: '💼' },
  { keywords: ['cliente', 'honorarios', 'freelance', 'proyecto', 'factura', 'cobro'], icon: '💰' },
  { keywords: ['bono', 'aguinaldo', 'premio', 'comision', 'propina'], icon: '🎉' },
  { keywords: ['inversion', 'dividendo', 'rendimiento', 'intereses', 'trading', 'crypto'], icon: '📈' },
  { keywords: ['prestamo', 'devolucion', 'reembolso', 'deuda'], icon: '🤝' },

  // Entretenimiento y Suscripciones
  { keywords: ['netflix', 'hbo', 'disney', 'prime', 'streaming', 'cine', 'pelicula'], icon: '🎬' },
  { keywords: ['spotify', 'apple music', 'musica', 'concierto', 'recital'], icon: '🎵' },
  { keywords: ['juego', 'playstation', 'xbox', 'steam', 'nintendo', 'gamer'], icon: '🎮' },
  { keywords: ['suscripcion', 'membresia', 'patreon', 'youtube'], icon: '⭐' },

  // Salud, Belleza y Deporte
  { keywords: ['gym', 'gimnasio', 'pesas', 'crossfit', 'fitness', 'entrenamiento'], icon: '🏋️' },
  { keywords: ['farmacia', 'medicamento', 'medicina', 'pastillas', 'receta'], icon: '💊' },
  { keywords: ['doctor', 'medico', 'consulta', 'clinica', 'hospital', 'dentista', 'odontologo'], icon: '🩺' },
  { keywords: ['peluqueria', 'barberia', 'corte', 'barba', 'belleza', 'spa', 'unas'], icon: '✂️' },

  // Ropa y Compras Personales
  { keywords: ['ropa', 'zara', 'zapatos', 'zapatillas', 'nike', 'adidas', 'camisa', 'pantalon'], icon: '👕' },
  { keywords: ['tecnologia', 'celular', 'iphone', 'computadora', 'laptop', 'pantalla', 'apple'], icon: '💻' },
  { keywords: ['regalo', 'cumpleanos', 'aniversario', 'navidad', 'detalle'], icon: '🎁' },
  { keywords: ['mascota', 'perro', 'gato', 'veterinario', 'croquetas'], icon: '🐾' },
  { keywords: ['libro', 'curso', 'universidad', 'udemy', 'colegio', 'estudio', 'clases'], icon: '📚' },
];

/**
 * Detecta un emoji contextual para la descripción ingresada.
 * Si no encuentra coincidencia, retorna un emoji por defecto según el tipo.
 */
export function detectAutoIcon(description = '', type = 'egreso') {
  if (!description || typeof description !== 'string') {
    return type === 'ingreso' ? '🟢' : '🔴';
  }

  const normalized = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const rule of ICON_RULES) {
    for (const keyword of rule.keywords) {
      // Búsqueda de palabra o subcadena
      const kw = keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
        
      if (normalized.includes(kw)) {
        return rule.icon;
      }
    }
  }

  // Emojis de respaldo por tipo
  return type === 'ingreso' ? '💵' : '💸';
}

/**
 * Lista de iconos rápidos populares para selección manual opcional
 */
export const POPULAR_ICONS = [
  '🍔', '🍕', '☕', '🛒', '🚗', '⛽', '🏠', '💡', '💼', '💰', '🎬', '🎮', '🎵', '🏋️', '💊', '👕', '💻', '🎁', '🐾', '✈️'
];
