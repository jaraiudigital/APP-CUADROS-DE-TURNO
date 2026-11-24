// backend/services/calendarioService.js

// Calcula el Domingo de Pascua (Algoritmo de Meeus/Jones/Butcher)
function obtenerPascua(anio) {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

// Traslada una fecha al lunes siguiente (Ley Emiliani en Colombia)
function siguienteLunes(fecha) {
  const f = new Date(fecha);
  const diaSemana = f.getDay(); // 0 = Dom, 1 = Lun...
  if (diaSemana === 1) return f;
  const diasASumar = diaSemana === 0 ? 1 : 8 - diaSemana;
  f.setDate(f.getDate() + diasASumar);
  return f;
}

function sumarDias(fecha, dias) {
  const f = new Date(fecha);
  f.setDate(f.getDate() + dias);
  return f;
}

function formatearISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function obtenerFestivosColombia(anio) {
  const pascua = obtenerPascua(anio);
  const festivos = [
    // Festivos fijos
    new Date(anio, 0, 1),   // Año Nuevo
    new Date(anio, 4, 1),   // Día del Trabajo
    new Date(anio, 6, 20),  // Independencia
    new Date(anio, 7, 7),   // Batalla de Boyacá
    new Date(anio, 11, 8),  // Inmaculada Concepción
    new Date(anio, 11, 25), // Navidad

    // Festivos trasladables (Ley Emiliani)
    siguienteLunes(new Date(anio, 0, 6)),   // Reyes Magos
    siguienteLunes(new Date(anio, 2, 19)),  // San José
    siguienteLunes(new Date(anio, 5, 29)),  // San Pedro y San Pablo
    siguienteLunes(new Date(anio, 7, 15)),  // Asunción de la Virgen
    siguienteLunes(new Date(anio, 9, 12)),  // Día de la Raza
    siguienteLunes(new Date(anio, 10, 1)),  // Todos los Santos
    siguienteLunes(new Date(anio, 10, 11)), // Independencia de Cartagena

    // Relativos a Semana Santa
    sumarDias(pascua, -3),                  // Jueves Santo
    sumarDias(pascua, -2),                  // Viernes Santo
    siguienteLunes(sumarDias(pascua, 39)),  // Ascensión del Señor
    siguienteLunes(sumarDias(pascua, 60)),  // Corpus Christi
    siguienteLunes(sumarDias(pascua, 68)),  // Sagrado Corazón
  ];

  return festivos.map(formatearISO);
}

function obtenerDiasDelMes(anio, mes) {
  const anioNum = Number(anio);
  const mesNum = Number(mes);
  const festivos = obtenerFestivosColombia(anioNum);
  const totalDias = new Date(anioNum, mesNum, 0).getDate();
  const dias = [];

  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = new Date(anioNum, mesNum - 1, dia);
    const fechaISO = formatearISO(fecha);
    const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado

    dias.push({
      numero: dia,
      fecha: fechaISO,
      esDomingo: diaSemana === 0,
      esSabado: diaSemana === 6,
      esFestivo: festivos.includes(fechaISO)
    });
  }
  return dias;
}

module.exports = { obtenerDiasDelMes };