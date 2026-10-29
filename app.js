// --- 1. CONFIGURACIÓN ---
const SUPABASE_URL = "https://kzhalkrxltkopzwybjyn.supabase.co"; // <-- PEGAR LA URL AQUÍ
const SUPABASE_KEY = "sb_publishable_bYmLIMkZX-GdbnlSjAC3Ww_dvcCIUvM"; // <-- PEGAR LA ANON KEY AQUÍ

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIG = {
  precioPorAdulto: 20000, precioPorMenor: 9000, minimoAdultos: 20, seniaPorcentaje: 0.5,
  whatsapp: "5491176449944", email: "adrianlazarte2013@gmail.com", costoPorKm: (90000 / 52),
  distanciasZonas: { "San Miguel": 0, "Zona Norte": 25, "Zona Oeste": 25, "Zona Sur": 45, "Capital (CABA)": 52, "La Plata": 90 }
};

// Elementos del DOM
const form = document.getElementById("form-cotizador");
const inputFecha = document.getElementById("fecha");
const inputTurno = document.getElementById("turno");
const inputAdultos = document.getElementById("adultos");
const inputMenores = document.getElementById("menores");
const inputUbicacion = document.getElementById("ubicacion");
const inputTipoEvento = document.getElementById("tipo-evento");
const errorFecha = document.getElementById("error-fecha");
const errorAdultos = document.getElementById("error-adultos");
const resultado = document.getElementById("resultado");
const modalLead = document.getElementById("modal-lead");
const formLead = document.getElementById("form-lead");

let fechasOcupadas = [];
let datosCotizacionActual = {}; // Guardamos los datos acá antes de enviarlos

// --- 2. CARGAR FECHAS DESDE SUPABASE ---
async function cargarFechas() {
  try {
    // Lee la tabla "bloqueos"
    const { data, error } = await supabaseClient.from('bloqueos').select('*');
    if (error) throw error;
    fechasOcupadas = data;
  } catch (err) {
    console.error("Error al cargar bloqueos:", err);
    fechasOcupadas = [];
  }
}

// --- 3. VALIDACIONES Y DISPONIBILIDAD ---
function validarDisponibilidad() {
  const fechaVal = inputFecha.value;
  const turnoVal = inputTurno.value;
  if (!fechaVal || !turnoVal) { errorFecha.textContent = ""; return; }

  const estaOcupado = fechasOcupadas.some(item => {
    if (item.fecha !== fechaVal) return false;
    if (!item.turno || item.turno === "Todo el día" || item.turno === turnoVal) return true;
    return false;
  });

  if (estaOcupado) {
    errorFecha.textContent = `Esa fecha y turno ya están reservados. Elegí otra opción.`;
    inputTurno.value = ""; 
  } else {
    errorFecha.textContent = "";
  }
}

inputFecha.addEventListener("change", validarDisponibilidad);
inputTurno.addEventListener("change", validarDisponibilidad);
form.querySelectorAll("input, select").forEach(campo => {
  campo.addEventListener("change", () => { resultado.hidden = true; });
});

const formatoARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

// --- 4. CALCULAR ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorFecha.textContent = ""; errorAdultos.textContent = "";
  let valido = true;

  if (!inputTipoEvento.value) { alert("Seleccioná el tipo de evento."); valido = false; }
  if (!inputFecha.value) { errorFecha.textContent = "Seleccioná una fecha."; valido = false; }
  if (!inputTurno.value) { errorFecha.textContent = "Seleccioná un turno."; valido = false; }
  validarDisponibilidad();
  if (errorFecha.textContent !== "") valido = false;

  const adultos = Number(inputAdultos.value) || 0;
  const menores = Number(inputMenores.value) || 0;
  if (adultos < CONFIG.minimoAdultos) { errorAdultos.textContent = `El mínimo es de ${CONFIG.minimoAdultos} adultos.`; valido = false; }
  if (!inputUbicacion.value) { alert("Seleccioná tu ubicación."); valido = false; }

  if (!valido) return;

  // Cálculos
  const subtotalAdultos = adultos * CONFIG.precioPorAdulto;
  const subtotalMenores = menores * CONFIG.precioPorMenor;
  const zonaSeleccionada = inputUbicacion.value;
  const kilometros = CONFIG.distanciasZonas[zonaSeleccionada];
  let trasladoTexto = "", totalTraslado = 0;

  if (kilometros === null) { trasladoTexto = "A cotizar"; } 
  else if (kilometros === 0) { trasladoTexto = "¡Bonificado! (0 km)"; } 
  else { totalTraslado = Math.round(kilometros * CONFIG.costoPorKm); trasladoTexto = `${kilometros} km — ${formatoARS.format(totalTraslado)}`; }

  const subtotal = subtotalAdultos + subtotalMenores + totalTraslado;
  const senia = subtotal * CONFIG.seniaPorcentaje;
  const saldo = subtotal - senia;

  // Guardamos los datos para usarlos en el modal
  datosCotizacionActual = {
    tipo_evento: inputTipoEvento.value, fecha: inputFecha.value, turno: inputTurno.value,
    adultos: adultos, menores: menores, zona: zonaSeleccionada, total: subtotal, senia: senia, saldo: saldo,
    trasladoTexto: trasladoTexto, subtotalAdultos: subtotalAdultos, subtotalMenores: subtotalMenores, kilometros: kilometros
  };

  // Pintar en pantalla
  document.getElementById("costo-adultos").textContent = formatoARS.format(subtotalAdultos);
  document.getElementById("fila-menores").hidden = menores === 0;
  if (menores > 0) document.getElementById("costo-menores").textContent = formatoARS.format(subtotalMenores);
  document.getElementById("costo-traslado").textContent = trasladoTexto;
  document.getElementById("total").textContent = formatoARS.format(subtotal);
  document.getElementById("senia").textContent = formatoARS.format(senia);
  document.getElementById("saldo").textContent = formatoARS.format(saldo);

  resultado.hidden = false;
  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
});

// --- 5. MODAL Y ENVÍO A SUPABASE ---
document.getElementById("btn-reservar").addEventListener("click", () => {
  modalLead.hidden = false;
});

document.getElementById("btn-cerrar-modal").addEventListener("click", () => {
  modalLead.hidden = true;
});

formLead.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("lead-nombre").value;
  const telefono = document.getElementById("lead-telefono").value;
  const btnSubmit = formLead.querySelector('button[type="submit"]');
  
  btnSubmit.textContent = "Guardando...";
  btnSubmit.disabled = true;

  // 1. Guardar en la Base de Datos (Supabase)
  const { error } = await supabaseClient.from('reservas').insert([{
    nombre: nombre,
    telefono: telefono,
    tipo_evento: datosCotizacionActual.tipo_evento,
    fecha: datosCotizacionActual.fecha,
    turno: datosCotizacionActual.turno,
    adultos: datosCotizacionActual.adultos,
    menores: datosCotizacionActual.menores,
    zona: datosCotizacionActual.zona,
    total: datosCotizacionActual.total
  }]);

  if (error) {
    alert("Hubo un error al guardar. Por favor intentá de nuevo.");
    console.error(error);
    btnSubmit.textContent = "Confirmar y Enviar";
    btnSubmit.disabled = false;
    return;
  }

  // 2. Armar mensaje de WhatsApp
  const resumen = [
    `Hola Rompe El Hielo, acabo de cotizar en la web:`,
    `• Nombre: ${nombre}`,
    `• Tipo de evento: ${datosCotizacionActual.tipo_evento}`,
    `• Fecha: ${datosCotizacionActual.fecha} — Turno: ${datosCotizacionActual.turno}`,
    `• Adultos: ${datosCotizacionActual.adultos}`,
    datosCotizacionActual.menores > 0 ? `• Menores: ${datosCotizacionActual.menores}` : '',
    `• Ubicación: ${datosCotizacionActual.zona}`,
    `• TOTAL: ${formatoARS.format(datosCotizacionActual.total)}`,
    `• Seña (50 %): ${formatoARS.format(datosCotizacionActual.senia)}`,
    "",
    "¿Me pasan los datos para transferir la seña y bloquear la fecha?"
  ].filter(Boolean).join("\n");

  const whatsappURL = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(resumen)}`;

  // 3. Redirigir a WhatsApp
  window.open(whatsappURL, '_blank');
  
  // 4. Resetear todo
  modalLead.hidden = true;
  form.reset();
  resultado.hidden = true;
  btnSubmit.textContent = "Confirmar y Enviar";
  btnSubmit.disabled = false;
});

// Botón limpiar
document.getElementById("btn-limpiar").addEventListener("click", () => {
  form.reset(); resultado.hidden = true; errorFecha.textContent = ""; errorAdultos.textContent = "";
  inputMenores.value = 0; window.scrollTo({ top: 0, behavior: "smooth" });
});

// Inicializar
(async function init() { await cargarFechas(); })();
