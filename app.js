const CONFIG = {
  precioPorAdulto: 20000,      // <-- Ajustá tu precio por adulto
  minimoAdultos: 20,
  seniaPorcentaje: 0.5,
  whatsapp: "5491176449944",   // El número de tu logo (549 + 11...)
  email: "adrianlazarte2013@gmail.com", 
  
  // Lógica de traslado basada en distancias desde San Miguel
  costosTraslado: {
    "San Miguel": 0,
    "Capital (CABA)": 80000,
    "Zona Norte": 25000,
    "Zona Sur": 35000,
    "Zona Oeste": 20000,
    "La Plata": 45000,
    "Otra": null // null significa que se muestra "A cotizar"
  },

  incluye: [
    "Barra libre: todos los cócteles de la carta",
    "Sin alcohol: Coca-Cola, Sprite, soda y agua mineral",
    "Bartender profesional durante todo el servicio",
    "Hielo, vasos, vajilla y montaje completo",
    "5 horas de servicio (ampliable)",
    "Traslado según zona seleccionada"
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

  // Cálculos
  const subtotalBarra = adultos * CONFIG.precioPorAdulto;
  const zonaSeleccionada = inputUbicacion.value;
  const costoTraslado = CONFIG.costosTraslado[zonaSeleccionada];
  
  let trasladoTexto = "";
  let totalTraslado = 0;

  if (costoTraslado === null) {
    trasladoTexto = "A cotizar";
  } else if (costoTraslado === 0) {
    trasladoTexto = "¡Bonificado! (San Miguel)";
  } else {
    totalTraslado = costoTraslado;
    trasladoTexto = formatoARS.format(costoTraslado);
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
    `• Ubicación: ${zonaSeleccionada}`,
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
