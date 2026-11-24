// frontend/src/App.jsx
import { useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Eye, Download, Calendar, Users, Briefcase } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  // 1. Configuración general
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(11);
  const [modalidad, setModalidad] = useState('LUNES_DOMINGO_24H');

  // 2. Asignaciones
  const [asignaciones, setAsignaciones] = useState([
    { id: 'A1', nombre: 'Caja Principal', horas: 8, turno: 'DIA' },
    { id: 'A2', nombre: 'Soporte Nocturno', horas: 12, turno: 'NOCHE' }
  ]);
  const [nuevaAsig, setNuevaAsig] = useState({ nombre: '', horas: 8, turno: 'DIA' });

  // 3. Empleados y sus permisos/peticiones
  const [empleados, setEmpleados] = useState([
    {
      id: 'E1',
      nombre: 'Carlos Pérez',
      asignacionesPermitidas: ['A1', 'A2'],
      peticiones: [{ diaInicio: 15, diaFin: 15, tipo: 'LIBRE' }]
    },
    {
      id: 'E2',
      nombre: 'Ana Gómez',
      asignacionesPermitidas: ['A1'],
      peticiones: []
    }
  ]);
  const [nuevoEmpNombre, setNuevoEmpNombre] = useState('');

  // 4. Estados de previsualización editable
  const [diasMes, setDiasMes] = useState([]);
  const [matrizPreview, setMatrizPreview] = useState(null);
  const [nuevoEmpleadoTabla, setNuevoEmpleadoTabla] = useState('');

  // --- FUNCIONES DE ASIGNACIONES ---
  const agregarAsignacion = () => {
    if (!nuevaAsig.nombre.trim()) return;
    const id = `A${Date.now()}`;
    setAsignaciones([...asignaciones, { id, ...nuevaAsig, horas: Number(nuevaAsig.horas) }]);
    setNuevaAsig({ nombre: '', horas: 8, turno: 'DIA' });
  };

  const eliminarAsignacion = (id) => {
    setAsignaciones(asignaciones.filter(a => a.id !== id));
    setEmpleados(empleados.map(emp => ({
      ...emp,
      asignacionesPermitidas: emp.asignacionesPermitidas.filter(aId => aId !== id)
    })));
  };

  // --- FUNCIONES DE EMPLEADOS ---
  const agregarEmpleado = () => {
    if (!nuevoEmpNombre.trim()) return;
    setEmpleados([
      ...empleados,
      {
        id: `E${Date.now()}`,
        nombre: nuevoEmpNombre.trim(),
        asignacionesPermitidas: asignaciones.map(a => a.id),
        peticiones: []
      }
    ]);
    setNuevoEmpNombre('');
  };

  const eliminarEmpleado = (id) => {
    setEmpleados(empleados.filter(e => e.id !== id));
  };

  const togglePermisoAsignacion = (empId, asigId) => {
    setEmpleados(empleados.map(emp => {
      if (emp.id !== empId) return emp;
      const tiene = emp.asignacionesPermitidas.includes(asigId);
      return {
        ...emp,
        asignacionesPermitidas: tiene
          ? emp.asignacionesPermitidas.filter(id => id !== asigId)
          : [...emp.asignacionesPermitidas, asigId]
      };
    }));
  };

  const agregarPeticion = (empId) => {
    setEmpleados(empleados.map(emp => {
      if (emp.id !== empId) return emp;
      return {
        ...emp,
        peticiones: [...emp.peticiones, { diaInicio: 1, diaFin: 1, tipo: 'LIBRE' }]
      };
    }));
  };

  const actualizarPeticion = (empId, idxPeticion, campo, valor) => {
    setEmpleados(empleados.map(emp => {
      if (emp.id !== empId) return emp;
      const nuevasPet = [...emp.peticiones];
      const valorProcesado = (campo === 'diaInicio' || campo === 'diaFin') ? Number(valor) : valor;
      nuevasPet[idxPeticion] = {
        ...nuevasPet[idxPeticion],
        [campo]: valorProcesado
      };
      return { ...emp, peticiones: nuevasPet };
    }));
  };

  const eliminarPeticion = (empId, idxPeticion) => {
    setEmpleados(empleados.map(emp => {
      if (emp.id !== empId) return emp;
      return {
        ...emp,
        peticiones: emp.peticiones.filter((_, i) => i !== idxPeticion)
      };
    }));
  };

  // --- PREVISUALIZACIÓN Y EXCEL ---
  const novedadesAusencia = [
    'INCAPACIDAD',
    'LICENCIA MATERNIDAD',
    'CALAMIDAD',
    'VACACIONES'
  ];

  const opcionesTurno = [
    { etiqueta: 'LIBRE', horas: 0 },
    { etiqueta: 'DESCANSO', horas: 0 },
    { etiqueta: 'INCAPACIDAD', horas: 0 },
    { etiqueta: 'LICENCIA MATERNIDAD', horas: 0 },
    { etiqueta: 'CALAMIDAD', horas: 0 },
    { etiqueta: 'VACACIONES', horas: 0 },
    ...asignaciones.map(a => ({
      etiqueta: `${a.nombre} (${a.turno})`,
      horas: Number(a.horas)
    }))
  ];

  const recalcularHoras = (cronograma) => {
    return Object.values(cronograma).reduce((total, valorCelda) => {
      const encontrada = opcionesTurno.find(op => op.etiqueta === valorCelda);
      return total + (encontrada ? encontrada.horas : 0);
    }, 0);
  };

  const generarPrevisualizacion = async () => {
    if (asignaciones.length === 0 || empleados.length === 0) {
      alert('Debes agregar al menos una asignación y un empleado.');
      return;
    }
    try {
      const { data } = await axios.post(`${API_URL}/api/previsualizar-cuadro`, {
        anio,
        mes,
        modalidad,
        asignaciones,
        empleados
      });
      setDiasMes(data.dias);
      setMatrizPreview(data.matriz);
    } catch (error) {
      alert('Error al conectar con la API: ' + (error.response?.data?.error || error.message));
    }
  };

  const cambiarTurnoCelda = (empIndex, numeroDia, nuevoValor) => {
    const copiaMatriz = [...matrizPreview];
    const empleado = { ...copiaMatriz[empIndex] };
    empleado.cronograma = { ...empleado.cronograma, [numeroDia]: nuevoValor };
    empleado.horasAcumuladas = recalcularHoras(empleado.cronograma);
    copiaMatriz[empIndex] = empleado;
    setMatrizPreview(copiaMatriz);
  };

  const agregarFilaEnPreview = () => {
    if (!nuevoEmpleadoTabla.trim()) return;
    const cronogramaInicial = {};
    diasMes.forEach(d => {
      cronogramaInicial[d.numero] =
        modalidad === 'LUNES_SABADO_DIA' && (d.esDomingo || d.esFestivo) ? 'DESCANSO' : 'LIBRE';
    });

    setMatrizPreview([
      ...matrizPreview,
      {
        id: `E${Date.now()}`,
        nombre: nuevoEmpleadoTabla.trim(),
        cronograma: cronogramaInicial,
        horasAcumuladas: 0
      }
    ]);
    setNuevoEmpleadoTabla('');
  };

  const quitarFilaEnPreview = (empIndex) => {
    setMatrizPreview(matrizPreview.filter((_, idx) => idx !== empIndex));
  };

  const exportarExcel = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/exportar-excel`,
        { anio, mes, dias: diasMes, matriz: matrizPreview },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Cuadro_Turnos_${mes}_${anio}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al exportar Excel: ' + error.message);
    }
  };

  // --- ESTILOS REUTILIZABLES ---
  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  };

  const inputStyle = {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db'
  };

  const btnPrimary = {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '500'
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#111827' }}>
          Generador de Cuadros de Turnos (Colombia)
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Configura horarios, asignaciones, novedades del personal y exporta a Excel con festivos colombianos.
        </p>
      </header>

      {/* SECCIÓN 1: CONFIGURACIÓN DEL MES Y HORARIO */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="#2563eb" /> 1. Mes y Modalidad de Trabajo
        </h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Mes (1-12)</label>
            <input
              type="number"
              min="1"
              max="12"
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              style={{ ...inputStyle, width: '90px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Año</label>
            <input
              type="number"
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              style={{ ...inputStyle, width: '110px' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Jornada / Horario</label>
            <select value={modalidad} onChange={e => setModalidad(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="LUNES_SABADO_DIA">Lunes a Sábado (Sin festivos, solo turnos de día)</option>
              <option value="LUNES_DOMINGO_24H">Lunes a Domingo (Incluye festivos, turnos día y noche)</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: ASIGNACIONES Y HORAS */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={20} color="#2563eb" /> 2. Asignaciones y Cantidad de Horas
        </h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Nombre asignación (ej: Caja 1)"
            value={nuevaAsig.nombre}
            onChange={e => setNuevaAsig({ ...nuevaAsig, nombre: e.target.value })}
            style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
          />
          <input
            type="number"
            min="1"
            max="24"
            placeholder="Horas"
            value={nuevaAsig.horas}
            onChange={e => setNuevaAsig({ ...nuevaAsig, horas: e.target.value })}
            style={{ ...inputStyle, width: '90px' }}
          />
          <select
            value={nuevaAsig.turno}
            onChange={e => setNuevaAsig({ ...nuevaAsig, turno: e.target.value })}
            style={inputStyle}
          >
            <option value="DIA">Turno Día</option>
            <option value="NOCHE">Turno Noche</option>
          </select>
          <button onClick={agregarAsignacion} style={btnPrimary}>
            <Plus size={16} /> Agregar Asignación
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {asignaciones.map(asig => (
            <div
              key={asig.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px'
              }}
            >
              <span>
                <strong>{asig.nombre}</strong> — {asig.horas}h ({asig.turno})
              </span>
              <button
                onClick={() => eliminarAsignacion(asig.id)}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                title="Eliminar asignación"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 3: EMPLEADOS, HABILIDADES Y PETICIONES / NOVEDADES */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} color="#2563eb" /> 3. Empleados, Asignaciones Permitidas y Novedades
        </h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Nombre completo del empleado..."
            value={nuevoEmpNombre}
            onChange={e => setNuevoEmpNombre(e.target.value)}
            style={{ ...inputStyle, flex: 1, maxWidth: '350px' }}
          />
          <button onClick={agregarEmpleado} style={btnPrimary}>
            <Plus size={16} /> Agregar Empleado
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {empleados.map(emp => (
            <div key={emp.id} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '14px', backgroundColor: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '16px' }}>{emp.nombre}</strong>
                <button
                  onClick={() => eliminarEmpleado(emp.id)}
                  style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={15} /> Quitar
                </button>
              </div>

              {/* Asignaciones permitidas */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
                  Asignaciones que puede realizar:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {asignaciones.map(asig => (
                    <label key={asig.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={emp.asignacionesPermitidas.includes(asig.id)}
                        onChange={() => togglePermisoAsignacion(emp.id, asig.id)}
                      />
                      {asig.nombre}
                    </label>
                  ))}
                </div>
              </div>

              {/* Peticiones y novedades del empleado */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#4b5563' }}>Peticiones / Novedades:</span>
                  <button
                    onClick={() => agregarPeticion(emp.id)}
                    style={{ fontSize: '12px', padding: '2px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #9ca3af', background: 'white' }}
                  >
                    + Agregar Novedad
                  </button>
                </div>

                {emp.peticiones.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>Sin peticiones ni ausencias registradas</p>
                )}

                {emp.peticiones.map((pet, idxPet) => (
                  <div key={idxPet} style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px' }}>Del:</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={pet.diaInicio ?? pet.dia ?? 1}
                      onChange={e => actualizarPeticion(emp.id, idxPet, 'diaInicio', e.target.value)}
                      style={{ ...inputStyle, padding: '4px', width: '50px' }}
                    />
                    <span style={{ fontSize: '12px' }}>al:</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={pet.diaFin ?? pet.dia ?? 1}
                      onChange={e => actualizarPeticion(emp.id, idxPet, 'diaFin', e.target.value)}
                      style={{ ...inputStyle, padding: '4px', width: '50px' }}
                    />
                    <select
                      value={pet.tipo}
                      onChange={e => actualizarPeticion(emp.id, idxPet, 'tipo', e.target.value)}
                      style={{ ...inputStyle, padding: '4px', flex: 1, minWidth: '140px' }}
                    >
                      <option value="LIBRE">Día Libre</option>
                      <option value="SOLO_DIA">Solo Turno Día</option>
                      <option value="INCAPACIDAD">Incapacidad</option>
                      <option value="LICENCIA MATERNIDAD">Licencia de Maternidad</option>
                      <option value="CALAMIDAD">Calamidad</option>
                      <option value="VACACIONES">Vacaciones</option>
                    </select>
                    <button
                      onClick={() => eliminarPeticion(emp.id, idxPet)}
                      style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOTÓN PRINCIPAL DE GENERACIÓN */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={generarPrevisualizacion}
          style={{ ...btnPrimary, padding: '12px 24px', fontSize: '16px', backgroundColor: '#1d4ed8' }}
        >
          <Eye size={20} /> Generar Vista Previa del Cuadro
        </button>
      </div>

      {/* SECCIÓN 4: TABLA INTERACTIVA DE PREVISUALIZACIÓN */}
      {matrizPreview && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px' }}>Vista Previa Editable (Ajustes de último minuto)</h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Agregar persona de último minuto..."
                value={nuevoEmpleadoTabla}
                onChange={e => setNuevoEmpleadoTabla(e.target.value)}
                style={inputStyle}
              />
              <button onClick={agregarFilaEnPreview} style={{ ...btnPrimary, backgroundColor: '#4b5563' }}>
                <Plus size={16} /> Añadir fila
              </button>
            </div>

            <button
              onClick={exportarExcel}
              style={{ ...btnPrimary, backgroundColor: '#15803d', padding: '10px 20px' }}
            >
              <Download size={18} /> Exportar a Excel (.xlsx)
            </button>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '6px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #d1d5db', padding: '10px', position: 'sticky', left: 0, backgroundColor: '#f3f4f6', zIndex: 2, minWidth: '160px' }}>
                    Empleado
                  </th>
                  {diasMes.map(d => (
                    <th
                      key={d.numero}
                      style={{
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        minWidth: '160px',
                        backgroundColor: d.esDomingo || d.esFestivo ? '#fee2e2' : '#e0e7ff',
                        color: d.esDomingo || d.esFestivo ? '#991b1b' : '#1e3a8a'
                      }}
                    >
                      Día {d.numero} {d.esFestivo ? '(Festivo)' : d.esDomingo ? '(Dom)' : ''}
                    </th>
                  ))}
                  <th style={{ border: '1px solid #d1d5db', padding: '10px', backgroundColor: '#f3f4f6', minWidth: '100px' }}>
                    Total Horas
                  </th>
                  <th style={{ border: '1px solid #d1d5db', padding: '10px', backgroundColor: '#f3f4f6' }}>
                    Quitar
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrizPreview.map((emp, empIndex) => (
                  <tr key={emp.id}>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '600', position: 'sticky', left: 0, backgroundColor: '#ffffff', zIndex: 1 }}>
                      {emp.nombre}
                    </td>

                    {diasMes.map(d => {
                      const valorActual = emp.cronograma[d.numero] || 'LIBRE';
                      const esNovedad = novedadesAusencia.includes(valorActual);
                      const esLibre = valorActual === 'LIBRE' || valorActual === 'DESCANSO';

                      return (
                        <td
                          key={d.numero}
                          style={{
                            border: '1px solid #d1d5db',
                            padding: '4px',
                            backgroundColor: d.esDomingo || d.esFestivo ? '#fff5f5' : '#ffffff'
                          }}
                        >
                          <select
                            value={valorActual}
                            onChange={e => cambiarTurnoCelda(empIndex, d.numero, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              backgroundColor: esNovedad ? '#fef3c7' : esLibre ? '#f9fafb' : '#dcfce7',
                              fontWeight: esLibre ? 'normal' : '600'
                            }}
                          >
                            {opcionesTurno.map((op, i) => (
                              <option key={i} value={op.etiqueta}>
                                {op.etiqueta}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}

                    <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: '700' }}>
                      {emp.horasAcumuladas} h
                    </td>

                    <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>
                      <button
                        onClick={() => quitarFilaEnPreview(empIndex)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Eliminar del cuadro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}