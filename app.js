const CONFIG = {
  precioPorAdulto: 20000,      
  precioPorMenor: 9000,        
  minimoAdultos: 20,           
  seniaPorcentaje: 0.5,
  whatsapp: "5491176449944",   
  email: "adrianlazarte2013@gmail.com", 
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

// Elementos del Modal
const modalDatos = document.getElementById("modal-datos");
const btnWhatsapp = document.getElementById("btn-whatsapp");
const btnConfirmarLead = document.getElementById("btn-confirmar-lead");
const btnCancelarLead = document.getElementById("btn-cancelar-lead");

let fechasOcupadas = [];
let mensajeWaGlobal = ""; 

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

function validarDisponibilidad() {
  const fechaVal = inputFecha.value;
  const turnoVal = inputTurno.value;

  if (!fechaVal || !turnoVal) {
    errorFecha.textContent = "";
    return;
  }

  const estaOcupado = fechasOcupadas.some(item => {
    return item.fecha === fechaVal && 
           (item.turno === turnoVal || item.turno === "Todo el día");
  });

  if (estaOcupado) {
    errorFecha.textContent = `Ese turno (${turnoVal}) ya está reservado. Elegí otro turno u otra fecha.`;
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

form.querySelectorAll("input, select").forEach(campo => {
  campo.addEventListener("change", () => { resultado.hidden = true; });
});

const formatoARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorFecha.textContent = "";
  errorAdultos.textContent = "";
  let valido = true;

  if (!inputTipoEvento.value) { alert("Seleccioná el tipo de evento."); valido = false; }
  if (!inputFecha.value) { errorFecha.textContent = "Seleccioná una fecha."; valido = false; }
  if (!inputTurno.value) { errorFecha.textContent = "Seleccioná un turno."; valido = false; }

  validarDisponibilidad();
  if (errorFecha.textContent !== "") valido = false;

  const adultos = Number(inputAdultos.value) || 0;
  const menores = Number(inputMenores.value) || 0;

  if (adultos < CONFIG.minimoAdultos) {
    errorAdultos.textContent = `El mínimo es de ${CONFIG.minimoAdultos} adultos.`;
    valido = false;
  }

  if (!inputUbicacion.value) { alert("Seleccioná tu ubicación."); valido = false; }
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

  if (menores > 0) incluyeBase.push(`Barra Teen: 10 mocktails exclusivos para menores (${menores} pax)`);

  incluyeBase.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    lista.appendChild(li);
  });

  resultado.hidden = false;

  // Guardamos el mensaje en una variable global para usarlo en el modal
  mensajeWaGlobal = [
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

  // Email directo
  document.getElementById("btn-email").href =
    `mailto:${CONFIG.email}?subject=${encodeURIComponent("Cotización Rompe El Hielo - " + inputTipoEvento.value)}&body=${encodeURIComponent(mensajeWaGlobal)}`;

  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
});

// --- LÓGICA DEL MODAL ---
btnWhatsapp.addEventListener("click", () => {
  modalDatos.hidden = false; // Abre el modal
});

btnCancelarLead.addEventListener("click", () => {
  modalDatos.hidden = true; // Cierra el modal
});

btnConfirmarLead.addEventListener("click", () => {
  const nombre = document.getElementById("lead-nombre").value.trim();
  const telefono = document.getElementById("lead-telefono").value.trim();

  if (!nombre || !telefono) {
    alert("Por favor, completá tu nombre y teléfono para enviar la cotización.");
    return;
  }

  // Agregamos los datos al mensaje final
  const mensajeFinal = mensajeWaGlobal + `\n\nMis datos de contacto:\n• Nombre: ${nombre}\n• Teléfono: ${telefono}`;
  
  // Abrimos WhatsApp
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensajeFinal)}`, '_blank');
  
  // Cerramos el modal
  modalDatos.hidden = true;
});

(async function init() {
  await cargarFechas();
})();
