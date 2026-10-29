const CONFIG = {
  precioPorAdulto: 20000,      
  precioPorMenor: 9000,        
  minimoAdultos: 20,           
  seniaPorcentaje: 0.5,
  whatsapp: "5491176449944",   
  email: "adrianlazarte2013@gmail.com, 
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
const inputTurno = document.getElementById("turno");
const inputAdultos = document.getElementById("adultos");
const inputMenores = document.getElementById("menores");
const inputUbicacion = document.getElementById("ubicacion");
const errorFecha = document.getElementById("error-fecha");
const errorAdultos = document.getElementById("error-adultos");
const resultado = document.getElementById("resultado");
const btnLimpiar = document.getElementById("btn-limpiar");

let fechasOcupadas = [];

// 1. Cargar fechas y turnos ocupados
async function cargarFechas() {
  try {
    const res = await fetch("fechas-ocupadas.json", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar el calendario");
    const data = await res.json();
    fechasOcupadas = data; 
  } catch (err) {
    console.error("Error al cargar fechas:", err);
    fechasOcupadas = [];
  }
}

// 2. Validar disponibilidad
function validarDisponibilidad() {
  const fechaVal = inputFecha.value;
  const turnoVal = inputTurno.value;

  if (!fechaVal || !turnoVal) {
    errorFecha.textContent = "";
    return;
  }

  const estaOcupado = fechasOcupadas.some(item => {
    if (item.fecha !== fechaVal) return false;
    
    // Si dice "Todo el día", o no tiene turno, o coincide con el elegido
    if (!item.turno || item.turno === "Todo el día" || item.turno === turnoVal) {
      return true;
    }
    return false;
  });

  if (estaOcupado) {
    errorFecha.textContent = `Esa fecha y turno ya están reservados. Elegí otra opción.`;
    inputTurno.value = ""; 
  } else {
    errorFecha.textContent = "";
  }
}

inputFecha.addEventListener("change", () => {
  const hoy = new Date().toISOString().split("T")[0];
  inputFecha.min = hoy;
  validarDisponibilidad();
});

inputTurno.addEventListener("change", validarDisponibilidad);

// 3. Ocultar el resultado si el usuario modifica el formulario
form.querySelectorAll("input, select").forEach(campo => {
  campo.addEventListener("change", () => { resultado.hidden = true; });
});

// 4. Formatear precios
const formatoARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

// 5. Calcular
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
    errorFecha.textContent = "Seleccioná una fecha.";
    valido = false;
  }
  
  if (!inputTurno.value) {
    errorFecha.textContent = "Seleccioná un turno.";
    valido = false;
  }

  validarDisponibilidad();
  if (errorFecha.textContent !== "") valido = false;

  const adultos = Number(inputAdultos.value) || 0;
  const menores = Number(inputMenores.value) || 0;

  if (adultos < CONFIG.minimoAdultos) {
    errorAdultos.textContent = `El mínimo es de ${CONFIG.minimoAdultos} adultos.`;
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
    totalTraslado = Math.round(kilometros * CONFIG.costoPorKm);
    trasladoTexto = `${kilometros} km — ${formatoARS.format(totalTraslado)}`;
  }

  const subtotal = subtotalAdultos + subtotalMenores + totalTraslado;
  const senia = subtotal * CONFIG.seniaPorcentaje;
  const saldo = subtotal - senia;

  document.getElementById("costo-adultos").textContent = formatoARS.format(subtotalAdultos);
  
  const filaMenores = document.getElementById("fila-menores");
  if (menores > 0) {
    filaMenores.hidden = false;
    document.getElementById("costo-menores").textContent = formatoARS.format(subtotalMenores);
  } else {
    filaMenores.hidden = true; 
  }

  document.getElementById("costo-traslado").textContent = trasladoTexto;
  document.getElementById("total").textContent = formatoARS.format(subtotal);
  document.getElementById("senia").textContent = formatoARS.format(senia);
  document.getElementById("saldo").textContent = formatoARS.format(saldo);

  const lista = document.getElementById("lista-incluye");
  lista.innerHTML = "";
  
  const incluyeBase = [
    "Barra libre: todos los cócteles de la carta",
    "Sin alcohol: Coca-Cola, Sprite, soda y agua mineral",
    "Bartender profesional durante todo el servicio",
    "Hielo, vasos, vajilla y montaje completo",
    "5 horas de servicio"
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

  // Resumen WhatsApp
  const resumen = [
    `Hola Rompe El Hielo, quiero cotizar un evento:`,
    `• Tipo de evento: ${inputTipoEvento.value}`,
    `• Fecha: ${inputFecha.value} — Turno: ${inputTurno.value}`,
    `• Adultos: ${adultos}`,
    menores > 0 ? `• Menores (Barra Teen): ${menores}` : '',
    `• Ubicación: ${zonaSeleccionada} ${kilometros !== null ? `(${kilometros} km)` : ''}`,
    `• Costo Barra Adultos: ${formatoARS.format(subtotalAdultos)}`,
    menores > 0 ? `• Costo Barra Teen: ${formatoARS.format(subtotalMenores)}` : '',
    `• Costo Traslado: ${trasladoTexto}`,
    `• TOTAL: ${formatoARS.format(subtotal)}`,
    `• Seña (50 %): ${formatoARS.format(senia)}`,
    "",
    "Entiendo que la barra libre incluye todos los cócteles + gaseosas y agua."
  ].filter(Boolean).join("\n");

  document.getElementById("btn-whatsapp").href =
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(resumen)}`;

  document.getElementById("btn-email").href =
    `mailto:${CONFIG.email}?subject=${encodeURIComponent("Cotización Rompe El Hielo - " + inputTipoEvento.value)}&body=${encodeURIComponent(resumen)}`;

  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
});

// 6. Lógica del botón Limpiar Formulario
btnLimpiar.addEventListener("click", () => {
  form.reset(); // Borra todos los inputs y selects
  resultado.hidden = true; // Oculta la cotización anterior
  errorFecha.textContent = "";
  errorAdultos.textContent = "";
  inputMenores.value = 0; // Asegura que menores vuelva a 0
  
  // Sube la pantalla suavemente hasta el inicio del formulario
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// 7. Inicializar
(async function init() {
  await cargarFechas();
})();
