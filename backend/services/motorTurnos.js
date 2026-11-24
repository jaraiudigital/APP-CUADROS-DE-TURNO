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
    ultimoTurno: null,
    cronograma: {}
  }));

  // 1. Marcar primero las ausencias justificadas por rango de días
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

  // 2. Asignar turnos en los días restantes
  dias.forEach(dia => {
    const esDiaNoHabil = dia.esDomingo || dia.esFestivo;

    // Si la modalidad no trabaja domingos ni festivos, marcar descanso (si no tiene incapacidad/vacaciones)
    if (modalidad === 'LUNES_SABADO_DIA' && esDiaNoHabil) {
      controlEmpleados.forEach(emp => {
        if (!emp.cronograma[dia.numero]) {
          emp.cronograma[dia.numero] = 'DESCANSO';
        }
      });
      return;
    }

    const asignacionesDelDia = asignaciones.filter(a =>
      modalidad === 'LUNES_SABADO_DIA' ? a.turno === 'DIA' : true
    );

    asignacionesDelDia.forEach(asig => {
      const candidatos = controlEmpleados
        .filter(emp => {
          // Si ya tiene turno o novedad (Incapacidad, Vacaciones, etc.) ese día, no está disponible
          if (emp.cronograma[dia.numero]) return false;

          // Revisar peticiones puntuales de turno o día libre
          const peticion = emp.peticiones?.find(p => {
            const inicio = Number(p.diaInicio ?? p.dia);
            const fin = Number(p.diaFin ?? p.dia);
            return dia.numero >= inicio && dia.numero <= fin;
          });

          if (peticion?.tipo === 'LIBRE') return false;
          if (peticion?.tipo === 'SOLO_DIA' && asig.turno === 'NOCHE') return false;
          if (!emp.asignacionesPermitidas.includes(asig.id)) return false;
          if (emp.ultimoTurno === 'NOCHE' && asig.turno === 'DIA') return false;

          return true;
        })
        .sort((a, b) => a.horasAcumuladas - b.horasAcumuladas);

      if (candidatos.length > 0) {
        const elegido = candidatos[0];
        elegido.cronograma[dia.numero] = `${asig.nombre} (${asig.turno})`;
        elegido.horasAcumuladas += Number(asig.horas);
        elegido.ultimoTurno = asig.turno;
      }
    });

    // Rellenar con LIBRE los días sin asignación ni novedad
    controlEmpleados.forEach(emp => {
      if (!emp.cronograma[dia.numero]) {
        emp.cronograma[dia.numero] = 'LIBRE';
        emp.ultimoTurno = null;
      }
    });
  });

  return controlEmpleados;
}

module.exports = { generarMatrizTurnos };