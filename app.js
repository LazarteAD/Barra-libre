const CONFIG = {
  precioPorAdulto: 20000,      // <-- Precio por adulto
  precioPorMenor: 9000,        // <-- Precio Barra Teen (10 mocktails)
  minimoAdultos: 20,           // <-- Mínimo 20 adultos
  seniaPorcentaje: 0.5,
  whatsapp: "5491176449944",   
  email: "adrianlazarte2013@gmail.com", 
  
  // Lógica de traslado (90000 / 52 km)
  costoPorKm: (90000 / 52),    
  
  distanciasZonas: {
    "San Miguel": 0,
    "Zona Norte": 25,          
    "Zona Oeste": 25,          
    "Zona Sur": 45,            
    "Capital (CABA)": 52,      
    "La Plata": 90,            
    "Otra": null               
  }
};

const form = document.getElementById("form-cotizador");
const inputTipoEvento = document.getElementById("tipo-evento");
const inputFecha = document.getElementById("fecha");
const inputAdultos = document.getElementById("adultos");
const inputMenores = document.getElementById("menores");
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

// 3. Ocultar el resultado si el usuario modifica el formulario
// (Esto soluciona el bug de que quedaba el precio anterior en pantalla)
const todosLosCampos = form.querySelectorAll("input, select");
todosLosCampos.forEach(campo => {
  campo.addEventListener("change", () => {
    resultado.hidden = true; 
  });
});

// 4. Formatear precios
const formatoARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

// 5. Validar y calcular
form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorFecha.textContent = "";
  errorAdultos.textContent = "";

  let valido = true;

  if (!inputTipoEvento.value) {
    alert("Por favor, seleccioná el tipo de evento.");
    valido = false;
  }

  if (!inputFecha.value) {
    errorFecha.textContent = "Seleccioná una fecha disponible.";
    valido = false;
  } else if (fechasOcupadas.includes(inputFecha.value)) {
    errorFecha.textContent = "Esa fecha ya está ocupada.";
    valido = false;
  }

  // Usamos Number() || 0 para asegurarnos de que si está vacío, sea 0.
  const adultos = Number(inputAdultos.value) || 0;
  const menores = Number(inputMenores.value) || 0;

  if (adultos < CONFIG.minimoAdultos) {
    errorAdultos.textContent = `El mínimo es de ${CONFIG.minimoAdultos} adultos para la barra principal.`;
    valido = false;
  }

  if (!inputUbicacion.value) {
    alert("Por favor, seleccioná tu ubicación.");
    valido = false;
  }

  if (!valido) return;

  // --- CÁLCULOS ---
  const subtotalAdultos = adultos * CONFIG.precioPorAdulto;
  const subtotalMenores = menores * CONFIG.precioPorMenor;
  
  const zonaSeleccionada = inputUbicacion.value;
  const kilometros = CONFIG.distanciasZonas[zonaSeleccionada];
  
  let trasladoTexto = "";
  let totalTraslado = 0;

  if (kilometros === null) {
    trasladoTexto = "A cotizar (fuera de zona)";
  } else if (kilometros === 0) {
    trasladoTexto = "¡Bonificado! (0 km)";
  } else {
    totalTraslado = kilometros * CONFIG.costoPorKm;
    totalTraslado = Math.round(totalTraslado);
    trasladoTexto = `${kilometros} km — ${formatoARS.format(totalTraslado)}`;
  }

  const subtotal = subtotalAdultos + subtotalMenores + totalTraslado;
  const senia = subtotal * CONFIG.seniaPorcentaje;
  const saldo = subtotal - senia;

  // Pintar resultado
  document.getElementById("costo-adultos").textContent = formatoARS.format(subtotalAdultos);
  
  const filaMenores = document.getElementById("fila-menores");
  if (menores > 0) {
    filaMenores.hidden = false;
    document.getElementById("costo-menores").textContent = formatoARS.format(subtotalMenores);
  } else {
    filaMenores.hidden = true; // Se oculta si es 0
  }

  document.getElementById("costo-traslado").textContent = trasladoTexto;
  document.getElementById("total").textContent = formatoARS.format(subtotal);
  document.getElementById("senia").textContent = formatoARS.format(senia);
  document.getElementById("saldo").textContent = formatoARS.format(saldo);

  // Armar lista de "Qué incluye"
  const lista = document.getElementById("lista-incluye");
  lista.innerHTML = "";
  
  const incluyeBase = [
    "Barra libre: todos los cócteles de la carta",
    "Sin alcohol: Coca-Cola, Sprite, soda y agua mineral",
    "Bartender profesional durante todo el servicio",
    "Hielo, vasos, vajilla y montaje completo",
    "5 horas de servicio (ampliable)"
  ];

  if (menores > 0) {
    incluyeBase.push(`Barra Teen: 10 mocktails exclusivos para menores (${menores} pax)`);
  }

  incluyeBase.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    lista.appendChild(li);
  });

  resultado.hidden = false;

  // Armar mensaje de WhatsApp/Email limpiando las líneas vacías
  const resumen = [
    `Hola Rompe El Hielo, quiero cotizar un evento:`,
    `• Tipo de evento: ${inputTipoEvento.value}`,
    `• Fecha: ${inputFecha.value}`,
    `• Adultos: ${adultos}`,
    menores > 0 ? `• Menores (Barra Teen): ${menores}` : '', // Solo aparece si es mayor a 0
    `• Ubicación: ${zonaSeleccionada} ${kilometros !== null ? `(${kilometros} km)` : ''}`,
    `• Costo Barra Adultos: ${formatoARS.format(subtotalAdultos)}`,
    menores > 0 ? `• Costo Barra Teen: ${formatoARS.format(subtotalMenores)}` : '', // Solo aparece si es mayor a 0
    `• Costo Traslado: ${trasladoTexto}`,
    `• TOTAL: ${formatoARS.format(subtotal)}`,
    `• Seña (50 %): ${formatoARS.format(senia)}`,
    "",
    "Entiendo que la barra libre incluye todos los cócteles + gaseosas y agua."
  ].filter(Boolean).join("\n"); // .filter(Boolean) borra las líneas que quedaron vacías

  document.getElementById("btn-whatsapp").href =
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(resumen)}`;

  document.getElementById("btn-email").href =
    `mailto:${CONFIG.email}?subject=${encodeURIComponent("Cotización Rompe El Hielo - " + inputTipoEvento.value)}&body=${encodeURIComponent(resumen)}`;

  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
});

// 6. Inicializar
(async function init() {
  await cargarFechas();
  configurarCalendario();
})();
