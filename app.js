const CONFIG = {
  precioPorAdulto: 20000,      // <-- Ajustá tu precio por adulto
  minimoAdultos: 20,
  seniaPorcentaje: 0.5,
  whatsapp: "5491176449944",   // Número de tu logo
  email: "adrianlazarte2013@gmail.com", 
  
  // Lógica de traslado
  // Hacemos la división exacta: $90.000 / 52 km = 1730.769...
  costoPorKm: (90000 / 52),    
  
  distanciasZonas: {           // <-- Kilómetros desde San Miguel
    "San Miguel": 0,
    "Zona Norte": 25,          
    "Zona Oeste": 25,          
    "Zona Sur": 45,            
    "Capital (CABA)": 52,      
    "La Plata": 90,            
    "Otra": null               
  },

  incluye: [
    "Barra libre: todos los cócteles de la carta",
    "Sin alcohol: Coca-Cola, Sprite, soda y agua mineral",
    "Bartender profesional durante todo el servicio",
    "Hielo, vasos, vajilla y montaje completo",
    "5 horas de servicio (ampliable)",
    "Traslado calculado según distancia"
  ]
};

const form = document.getElementById("form-cotizador");
const inputFecha = document.getElementById("fecha");
const inputAdultos = document.getElementById("adultos");
const inputUbicacion = document.getElementById("ubicacion");
const errorFecha = document.getElementById("error-fecha");
const errorAdultos = document.getElementById("error-adultos");
const resultado = document.getElementById("resultado");

let fechasOcupadas = [];

// 1. Cargar fechas ocupadas
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

// 2. Bloquear fechas pasadas y ocupadas
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

// 3. Formatear precios
const formatoARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

// 4. Validar y calcular
form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorFecha.textContent = "";
  errorAdultos.textContent = "";

  let valido = true;

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

  if (!inputUbicacion.value) {
    alert("Por favor, seleccioná tu ubicación.");
    valido = false;
  }

  if (!valido) return;

  // --- CÁLCULOS ---
  const subtotalBarra = adultos * CONFIG.precioPorAdulto;
  const zonaSeleccionada = inputUbicacion.value;
  const kilometros = CONFIG.distanciasZonas[zonaSeleccionada];
  
  let trasladoTexto = "";
  let totalTraslado = 0;

  if (kilometros === null) {
    trasladoTexto = "A cotizar (fuera de zona)";
  } else if (kilometros === 0) {
    trasladoTexto = "¡Bonificado! (0 km)";
  } else {
    // Multiplicamos los km por el costo unitario exacto (90000/52)
    totalTraslado = kilometros * CONFIG.costoPorKm;
    // Redondeamos el total del traslado
    totalTraslado = Math.round(totalTraslado);
    
    trasladoTexto = `${kilometros} km — ${formatoARS.format(totalTraslado)}`;
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

  // Armar mensajes
  const resumen = [
    "Hola Rompe El Hielo, quiero cotizar un evento:",
    `• Fecha: ${inputFecha.value}`,
    `• Adultos: ${adultos}`,
    `• Ubicación: ${zonaSeleccionada} ${kilometros !== null ? `(${kilometros} km)` : ''}`,
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
