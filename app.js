const CONFIG = {
  precioPorAdulto: 20000,
  minimoAdultos: 20,
  seniaPorcentaje: 0.5,
  whatsapp: "5491176449944",
  email: "hola@rompeelhielo.com",
  
  costoPorKm: 1538,
  
  // Coordenadas de tu base en San Miguel (Longitud, Latitud)
  origenBase: "-58.7167, -34.5333", 

  incluye: [
    "Barra libre: todos los cócteles de la carta",
    "Sin alcohol: Coca-Cola, Sprite, soda y agua mineral",
    "Bartender profesional durante todo el servicio",
    "Hielo, vasos, vajilla y montaje completo",
    "5 horas de servicio (ampliable)",
    "Traslado calculado por ruta real"
  ]
};

const form = document.getElementById("form-cotizador");
const inputFecha = document.getElementById("fecha");
const inputAdultos = document.getElementById("adultos");
const inputDireccion = document.getElementById("direccion");
const errorFecha = document.getElementById("error-fecha");
const errorAdultos = document.getElementById("error-adultos");
const errorDireccion = document.getElementById("error-direccion");
const resultado = document.getElementById("resultado");

let fechasOcupadas = [];

// 1. Cargar fechas ocupadas (sin cambios)
async function cargarFechas() {
  try {
    const res = await fetch("fechas-ocupadas.json", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar el calendario");
    const data = await res.json();
    fechasOcupadas = data.map(item => typeof item === "string" ? item : item.fecha);
  } catch (err) {
    console.error("Error al cargar fechas:", err);
    fechasOcupadas = [];
  }
}

// 2. Configurar calendario (sin cambios)
function configurarCalendario() {
  const hoy = new Date().toISOString().split("T")[0];
  inputFecha.min = hoy;

  inputFecha.addEventListener("change", () => {
    if (fechasOcupadas.includes(inputFecha.value)) {
      errorFecha.textContent = "Esa fecha ya está ocupada. Elegí otra por favor.";
      inputFecha.value = "";
    } else {
      errorFecha.textContent = "";
    }
  });
}

const formatoARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

// --- NUEVAS FUNCIONES PARA OSRM Y NOMINATIM ---

/**
 * Geocodifica una dirección usando Nominatim (OpenStreetMap)
 * @param {string} direccion - Dirección a buscar
 * @returns {Promise<{lat: string, lon: string} | null>}
 */
async function geocodificarDireccion(direccion) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RompeElHielo/1.0 (contacto@rompeelhielo.com)' // Requerido por Nominatim
      }
    });
    const data = await res.json();
    
    if (data && data.length > 0) {
      return { lat: data[0].lat, lon: data[0].lon };
    }
    return null;
  } catch (error) {
    console.error("Error en geocodificación:", error);
    return null;
  }
}

/**
 * Calcula la distancia en km entre dos coordenadas usando OSRM
 * @param {string} origen - "lon,lat"
 * @param {string} destino - "lon,lat"
 * @returns {Promise<number | null>} - Distancia en kilómetros o null si falla
 */
async function calcularDistanciaOSRM(origen, destino) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origen};${destino}?overview=false`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // OSRM devuelve la distancia en metros
      const distanciaMetros = data.routes[0].distance;
      return distanciaMetros / 1000; // Convertir a km
    }
    return null;
  } catch (error) {
    console.error("Error en cálculo de ruta OSRM:", error);
    return null;
  }
}


// 4. Validar y calcular
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorFecha.textContent = "";
  errorAdultos.textContent = "";
  errorDireccion.textContent = "";
  
  // Mostrar estado de carga en el botón
  const btnCotizar = document.getElementById("btn-cotizar");
  const textoOriginalBtn = btnCotizar.textContent;
  btnCotizar.textContent = "Calculando ruta...";
  btnCotizar.disabled = true;

  let valido = true;

  // Validaciones de fecha y adultos
  if (!inputFecha.value) {
    errorFecha.textContent = "Seleccioná una fecha disponible.";
    valido = false;
  } else if (fechasOcupadas.includes(inputFecha.value)) {
    errorFecha.textContent = "Esa fecha ya está ocupada.";
    valido = false;
  }

  const adultos = parseInt(inputAdultos.value, 10);
  if (!adultos || adultos < CONFIG.minimoAdultos) {
    errorAdultos.textContent = `El mínimo es de ${CONFIG.minimoAdultos} adultos.`;
    valido = false;
  }

  const direccionTexto = inputDireccion.value.trim();
  if (!direccionTexto) {
    errorDireccion.textContent = "Ingresá la dirección del evento.";
    valido = false;
  }

  if (!valido) {
    btnCotizar.textContent = textoOriginalBtn;
    btnCotizar.disabled = false;
    return;
  }

  // --- CÁLCULO DE DISTANCIA ---
  let kilometros = null;
  let trasladoTexto = "";

  // 1. Geocodificar la dirección del usuario
  const coordsDestino = await geocodificarDireccion(direccionTexto + ", Argentina");
  
  if (!coordsDestino) {
    errorDireccion.textContent = "No pudimos encontrar la dirección. Probá siendo más específico (calle, número, localidad).";
    btnCotizar.textContent = textoOriginalBtn;
    btnCotizar.disabled = false;
    return;
  }

  // 2. Formatear coordenadas para OSRM (lon,lat)
  const destinoOSRM = `${coordsDestino.lon},${coordsDestino.lat}`;
  
  // 3. Calcular distancia real por ruta
  kilometros = await calcularDistanciaOSRM(CONFIG.origenBase, destinoOSRM);

  if (kilometros === null) {
    // Fallback si OSRM falla
    trasladoTexto = "A cotizar (error al calcular ruta)";
    kilometros = 0; 
    // Podrías dejar un mensaje de error, pero para no frenar la cotización, mostramos "A cotizar"
  } else {
    // Redondear km para mostrar
    const kmMostrar = Math.round(kilometros);
    const totalTraslado = kmMostrar * CONFIG.costoPorKm;
    trasladoTexto = `${kmMostrar} km — ${formatoARS.format(totalTraslado)}`;
  }

  // 4. Resto de los cálculos (Barra, Seña, etc.)
  const subtotalBarra = adultos * CONFIG.precioPorAdulto;
  let totalTraslado = 0;

  if (kilometros !== null && kilometros > 0) {
    totalTraslado = Math.round(kilometros) * CONFIG.costoPorKm;
  }

  const subtotal = subtotalBarra + totalTraslado;
  const senia = subtotal * CONFIG.seniaPorcentaje;
  const saldo = subtotal - senia;

  // Pintar resultado
  document.getElementById("costo-barra").textContent = formatoARS.format(subtotalBarra);
  document.getElementById("costo-traslado").textContent = trasladoTexto;
  document.getElementById("total").textContent = formatoARS.format(subtotal);
  document.getElementById("senia").textContent = formatoARS.format(senia);
  document.getElementById("saldo").textContent = formatoARS.format(saldo);

  const lista = document.getElementById("lista-incluye");
  lista.innerHTML = "";
  CONFIG.incluye.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    lista.appendChild(li);
  });

  resultado.hidden = false;
  
  // Restaurar botón
  btnCotizar.textContent = textoOriginalBtn;
  btnCotizar.disabled = false;

  // Armar mensajes
  const resumen = [
    "Hola Rompe El Hielo, quiero cotizar un evento:",
    `• Fecha: ${inputFecha.value}`,
    `• Adultos: ${adultos}`,
    `• Dirección: ${direccionTexto}`,
    `• Costo Barra: ${formatoARS.format(subtotalBarra)}`,
    `• Costo Traslado: ${trasladoTexto}`,
    `• TOTAL: ${formatoARS.format(subtotal)}`,
    `• Seña (50 %): ${formatoARS.format(senia)}`,
    "",
    "Entiendo que la barra libre incluye todos los cócteles + gaseosas y agua."
  ].join("\n");

  document.getElementById("btn-whatsapp").href =
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(resumen)}`;

  document.getElementById("btn-email").href =
    `mailto:${CONFIG.email}?subject=${encodeURIComponent("Cotización Rompe El Hielo")}&body=${encodeURIComponent(resumen)}`;

  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
});

// 5. Inicializar
(async function init() {
  await cargarFechas();
  configurarCalendario();
})();
