// backend/services/motorTurnos.js
const NOVEDADES_AUSENCIA = [
  'INCAPACIDAD',
  'LICENCIA MATERNIDAD',
  'CALAMIDAD',
  'VACACIONES'
];

function generarMatrizTurnos(dias, empleados, asignaciones, modalidad) {
  const controlEmpleados = empleados.map(emp => ({
    ...emp,
    horasAcumuladas: 0,
    ultimaJornada: null, // 'AM' o 'PM'
    cronograma: {}
  }));

  // 1. Marcar ausencias justificadas por rango de días
  controlEmpleados.forEach(emp => {
    dias.forEach(dia => {
      const novedad = emp.peticiones?.find(p => {
        const inicio = Number(p.diaInicio ?? p.dia);
        const fin = Number(p.diaFin ?? p.dia);
        return (
          NOVEDADES_AUSENCIA.includes(p.tipo) &&
          dia.numero >= inicio &&
          dia.numero <= fin
        );
      });

      if (novedad) {
        emp.cronograma[dia.numero] = novedad.tipo;
      }
    });
  });

  // 2. Asignar turnos respetando jornada AM/PM, horario y días aplicables
  dias.forEach(dia => {
    const fechaObj = new Date(dia.fecha + 'T00:00:00');
    const diaSemana = fechaObj.getDay(); // 0=Dom ... 6=Sáb
    const esDiaNoHabil = dia.esDomingo || dia.esFestivo;

    if (modalidad === 'LUNES_SABADO_DIA' && esDiaNoHabil) {
      controlEmpleados.forEach(emp => {
        if (!emp.cronograma[dia.numero]) {
          emp.cronograma[dia.numero] = 'DESCANSO';
        }
      });
      return;
    }

    // Filtrar asignaciones activas para ese día de la semana y modalidad
    const asignacionesDelDia = asignaciones.filter(a => {
      const jornada = a.jornada || (a.turno === 'NOCHE' ? 'PM' : 'AM');
      if (modalidad === 'LUNES_SABADO_DIA' && jornada === 'PM') return false;

      // Verificar si la asignación aplica este día de la semana
      if (Array.isArray(a.diasAplicables) && a.diasAplicables.length > 0) {
        return a.diasAplicables.includes(diaSemana);
      }
      return true;
    });

    asignacionesDelDia.forEach(asig => {
      const jornadaAsig = asig.jornada || (asig.turno === 'NOCHE' ? 'PM' : 'AM');
      const etiquetaHorario = asig.horario ? ` ${asig.horario}` : '';
      const etiquetaTurno = `${asig.nombre} (${jornadaAsig}${etiquetaHorario})`;

      const candidatos = controlEmpleados
        .filter(emp => {
          if (emp.cronograma[dia.numero]) return false;

          const peticion = emp.peticiones?.find(p => {
            const inicio = Number(p.diaInicio ?? p.dia);
            const fin = Number(p.diaFin ?? p.dia);
            return dia.numero >= inicio && dia.numero <= fin;
          });

          if (peticion?.tipo === 'LIBRE') return false;
          if (peticion?.tipo === 'SOLO_DIA' && jornadaAsig === 'PM') return false;
          if (!emp.asignacionesPermitidas.includes(asig.id)) return false;

          // Evitar doblar turno: PM ayer -> AM hoy
          if (emp.ultimaJornada === 'PM' && jornadaAsig === 'AM') return false;

          return true;
        })
        .sort((a, b) => a.horasAcumuladas - b.horasAcumuladas);

      if (candidatos.length > 0) {
        const elegido = candidatos[0];
        elegido.cronograma[dia.numero] = etiquetaTurno;
        elegido.horasAcumuladas += Number(asig.horas);
        elegido.ultimaJornada = jornadaAsig;
      }
    });

    controlEmpleados.forEach(emp => {
      if (!emp.cronograma[dia.numero]) {
        emp.cronograma[dia.numero] = 'LIBRE';
        emp.ultimaJornada = null;
      }
    });
  });

  return controlEmpleados;
}

module.exports = { generarMatrizTurnos };