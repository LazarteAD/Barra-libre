const CONFIG = {
  precioPorAdulto: 20000,      // ← tu tarifa
  minimoAdultos: 20,           // ← tu mínimo
  seniaPorcentaje: 0.5,
  whatsapp: "5491176449944",   // ← tu número con código de país, sin + ni espacios
  email: "adrianlazarte2013@gmail.com", // ← tu email
  incluye: [
    "Barra libre: todos los cócteles de la carta",
    "Sin alcohol: Coca-Cola, Sprite, soda y agua mineral",
    "Bartender profesional durante todo el servicio",
    "Hielo, vasos, vajilla y montaje completo",
    "5 horas de servicio (ampliable)",
    "Traslado dentro de la zona"
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

// 1. Cargar fechas ocupadas desde el JSON
async function cargarFechas() {
  try {
    const res = await fetch("fechas-ocupadas.json", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar el calendario");
    const data = await res.json();
    // Acepta tanto ["2026-01-01"] como [{"fecha":"2026-01-01","motivo":"..."}]
    fechasOcupadas = data.map(item => typeof item === "string" ? item : item.fecha);
  } catch (err) {
    console.error(err);
    fechasOcupadas = [];
  }
}

// 2. Bloquear fechas pasadas y ocupadas en el selector
function configurarCalendario() {
  const hoy = new Date().toISOString().split("T")[0];
  inputFecha.min = hoy;

  inputFecha.addEventListener("change", () => {
    if (fechasOcupadas.includes(inputFecha.value)) {
      errorFecha.textContent = "Esa fecha ya está ocupada. Elegí otra.";
      inputFecha.value = "";
    } else {
      errorFecha.textContent = "";
    }
  });
}

// 3. Formatear precios en ARS
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
    errorFecha.textContent = "Seleccioná una fecha disponible para continuar.";
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

  if (!inputUbicacion.value.trim()) {
    valido = false;
  }

  if (!valido) return;

  const subtotal = adultos * CONFIG.precioPorAdulto;
  const senia = subtotal * CONFIG.seniaPorcentaje;
  const saldo = subtotal - senia;

  // Pintar resultado
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
    "Hola Rompe El Hielo, quiero reservar:",
    `• Fecha: ${inputFecha.value}`,
    `• Adultos: ${adultos}`,
    `• Ubicación: ${inputUbicacion.value}`,
    `• Total: ${formatoARS.format(subtotal)}`,
    `• Seña (50 %): ${formatoARS.format(senia)}`,
    "",
    "Incluye: barra libre con todos los cócteles de la carta + Coca-Cola, Sprite, soda y agua mineral."
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
