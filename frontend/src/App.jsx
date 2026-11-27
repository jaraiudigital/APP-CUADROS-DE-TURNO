// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import { Plus, Trash2, Eye, Download, Calendar, Users, Briefcase, Save, History, LogOut } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const DIAS_SEMANA = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [recuperandoClave, setRecuperandoClave] = useState(false);
  const [nuevaClave, setNuevaClave] = useState('');

  // Configuración general
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(11);
  const [modalidad, setModalidad] = useState('LUNES_DOMINGO_24H');

  // Asignaciones con AM/PM, horario y días aplicables
  const [asignaciones, setAsignaciones] = useState([]);
  const [nuevaAsig, setNuevaAsig] = useState({
    nombre: '',
    horas: 8,
    jornada: 'AM',
    horario: '06:00 - 14:00',
    diasAplicables: [1, 2, 3, 4, 5, 6, 0]
  });

  // Empleados
  const [empleados, setEmpleados] = useState([]);
  const [nuevoEmpNombre, setNuevoEmpNombre] = useState('');

  // Previsualización e Historial
  const [diasMes, setDiasMes] = useState([]);
  const [matrizPreview, setMatrizPreview] = useState(null);
  const [nuevoEmpleadoTabla, setNuevoEmpleadoTabla] = useState('');
  const [historialCuadros, setHistorialCuadros] = useState([]);

  // --- CONTROL DE SESIÓN ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarDatosUsuario(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setRecuperandoClave(true);
      }
      if (session) cargarDatosUsuario(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const cargarDatosUsuario = async (userId) => {
    // 1. Cargar entorno (empleados y asignaciones)
    const { data: entorno } = await supabase
      .from('entornos')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (entorno) {
      setAsignaciones(entorno.asignaciones || []);
      setEmpleados(entorno.empleados || []);
    }

    // 2. Cargar historial de cuadros
    cargarHistorial(userId);
  };

  const cargarHistorial = async (userId) => {
    const { data } = await supabase
      .from('cuadros_guardados')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setHistorialCuadros(data);
  };

  const guardarEntornoEnNube = async () => {
    if (!session) return;
    const { error } = await supabase.from('entornos').upsert({
      user_id: session.user.id,
      asignaciones,
      empleados,
      updated_at: new Date().toISOString()
    });
    if (error) alert('Error al guardar entorno: ' + error.message);
    else alert('Entorno (empleados y asignaciones) guardado correctamente.');
  };

  const guardarCuadroEnHistorial = async () => {
    if (!session || !matrizPreview) return;
    const { error } = await supabase.from('cuadros_guardados').insert({
      user_id: session.user.id,
      anio,
      mes,
      modalidad,
      dias: diasMes,
      matriz: matrizPreview
    });
    if (error) alert('Error al guardar cuadro: ' + error.message);
    else {
      alert('Cuadro guardado en el historial.');
      cargarHistorial(session.user.id);
    }
  };

  const cargarCuadroDeHistorial = (cuadro) => {
    setAnio(cuadro.anio);
    setMes(cuadro.mes);
    setModalidad(cuadro.modalidad);
    setDiasMes(cuadro.dias);
    setMatrizPreview(cuadro.matriz);
  };

  const actualizarPassword = async () => {
    const { error } = await supabase.auth.updateUser({ password: nuevaClave });
    if (error) alert('Error: ' + error.message);
    else {
      alert('Contraseña actualizada correctamente.');
      setRecuperandoClave(false);
      setNuevaClave('');
    }
  };

  if (!session) return <Auth />;

  if (recuperandoClave) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '8px' }}>
        <h3>Establecer Nueva Contraseña</h3>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={nuevaClave}
          onChange={e => setNuevaClave(e.target.value)}
          style={{ width: '100%', padding: '10px', margin: '12px 0', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button onClick={actualizarPassword} style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }}>
          Guardar Nueva Contraseña
        </button>
      </div>
    );
  }

  // --- FUNCIONES DE ASIGNACIONES ---
  const toggleDiaAsignacion = (diaId) => {
    const existe = nuevaAsig.diasAplicables.includes(diaId);
    setNuevaAsig({
      ...nuevaAsig,
      diasAplicables: existe
        ? nuevaAsig.diasAplicables.filter(d => d !== diaId)
        : [...nuevaAsig.diasAplicables, diaId]
    });
  };

  const agregarAsignacion = () => {
    if (!nuevaAsig.nombre.trim()) return;
    if (nuevaAsig.diasAplicables.length === 0) {
      alert('Selecciona al menos un día de la semana para la asignación.');
      return;
    }
    const id = `A${Date.now()}`;
    setAsignaciones([
      ...asignaciones,
      {
        id,
        nombre: nuevaAsig.nombre.trim(),
        horas: Number(nuevaAsig.horas),
        jornada: nuevaAsig.jornada,
        horario: nuevaAsig.horario.trim(),
        diasAplicables: nuevaAsig.diasAplicables
      }
    ]);
    setNuevaAsig({
      nombre: '',
      horas: 8,
      jornada: 'AM',
      horario: '06:00 - 14:00',
      diasAplicables: [1, 2, 3, 4, 5, 6, 0]
    });
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
      nuevasPet[idxPeticion] = { ...nuevasPet[idxPeticion], [campo]: valorProcesado };
      return { ...emp, peticiones: nuevasPet };
    }));
  };

  const eliminarPeticion = (empId, idxPeticion) => {
    setEmpleados(empleados.map(emp => {
      if (emp.id !== empId) return emp;
      return { ...emp, peticiones: emp.peticiones.filter((_, i) => i !== idxPeticion) };
    }));
  };

  // --- PREVISUALIZACIÓN Y EXCEL ---
  const novedadesAusencia = ['INCAPACIDAD', 'LICENCIA MATERNIDAD', 'CALAMIDAD', 'VACACIONES'];

  const opcionesTurno = [
    { etiqueta: 'LIBRE', horas: 0 },
    { etiqueta: 'DESCANSO', horas: 0 },
    { etiqueta: 'INCAPACIDAD', horas: 0 },
    { etiqueta: 'LICENCIA MATERNIDAD', horas: 0 },
    { etiqueta: 'CALAMIDAD', horas: 0 },
    { etiqueta: 'VACACIONES', horas: 0 },
    ...asignaciones.map(a => {
      const jornada = a.jornada || 'AM';
      const horarioTxt = a.horario ? ` ${a.horario}` : '';
      return {
        etiqueta: `${a.nombre} (${jornada}${horarioTxt})`,
        horas: Number(a.horas)
      };
    })
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
      { id: `E${Date.now()}`, nombre: nuevoEmpleadoTabla.trim(), cronograma: cronogramaInicial, horasAcumuladas: 0 }
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

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  };

  const inputStyle = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' };

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
      {/* BARRA SUPERIOR DE USUARIO Y GUARDADO DE ENTORNO */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>
            Generador de Cuadros de Turnos (Colombia)
          </h1>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Usuario: {session.user.email}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={guardarEntornoEnNube} style={{ ...btnPrimary, backgroundColor: '#0d9488' }}>
            <Save size={16} /> Guardar Empleados y Asignaciones
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ ...btnPrimary, backgroundColor: '#6b7280' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </header>

      {/* HISTORIAL DE CUADROS ANTERIORES */}
      {historialCuadros.length > 0 && (
        <section style={cardStyle}>
          <h2 style={{ fontSize: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="#2563eb" /> Cuadros Guardados Anteriormente
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {historialCuadros.map(c => (
              <button
                key={c.id}
                onClick={() => cargarCuadroDeHistorial(c)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', cursor: 'pointer', fontSize: '13px' }}
              >
                Mes {c.mes}/{c.anio} ({new Date(c.created_at).toLocaleDateString()})
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 1: CONFIGURACIÓN DEL MES Y HORARIO */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="#2563eb" /> 1. Mes y Modalidad de Trabajo
        </h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Mes (1-12)</label>
            <input type="number" min="1" max="12" value={mes} onChange={e => setMes(Number(e.target.value))} style={{ ...inputStyle, width: '90px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Año</label>
            <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ ...inputStyle, width: '110px' }} />
          </div>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Jornada / Horario</label>
            <select value={modalidad} onChange={e => setModalidad(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="LUNES_SABADO_DIA">Lunes a Sábado (Sin festivos, solo turnos AM)</option>
              <option value="LUNES_DOMINGO_24H">Lunes a Domingo 24 Horas (Incluye festivos, turnos AM y PM)</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: ASIGNACIONES CON AM/PM, HORARIO Y DÍAS */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={20} color="#2563eb" /> 2. Asignaciones, Jornada (AM/PM), Horario y Días
        </h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Nombre asignación (ej: Urgencias)"
            value={nuevaAsig.nombre}
            onChange={e => setNuevaAsig({ ...nuevaAsig, nombre: e.target.value })}
            style={{ ...inputStyle, flex: 1, minWidth: '180px' }}
          />
          <input
            type="number"
            min="1"
            max="24"
            placeholder="Horas"
            value={nuevaAsig.horas}
            onChange={e => setNuevaAsig({ ...nuevaAsig, horas: e.target.value })}
            style={{ ...inputStyle, width: '80px' }}
          />
          <select
            value={nuevaAsig.jornada}
            onChange={e => setNuevaAsig({ ...nuevaAsig, jornada: e.target.value })}
            style={inputStyle}
          >
            <option value="AM">Jornada AM</option>
            <option value="PM">Jornada PM</option>
          </select>
          <input
            type="text"
            placeholder="Horario (ej: 07:00 - 19:00)"
            value={nuevaAsig.horario}
            onChange={e => setNuevaAsig({ ...nuevaAsig, horario: e.target.value })}
            style={{ ...inputStyle, width: '170px' }}
          />
          <button onClick={agregarAsignacion} style={btnPrimary}>
            <Plus size={16} /> Agregar Asignación
          </button>
        </div>

        {/* Selector de días aplicables */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', fontSize: '13px' }}>
          <span style={{ fontWeight: '600', color: '#4b5563' }}>Días en que aplica:</span>
          {DIAS_SEMANA.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nuevaAsig.diasAplicables.includes(d.id)}
                onChange={() => toggleDiaAsignacion(d.id)}
              />
              {d.label}
            </label>
          ))}
        </div>

        {/* Tarjetas de asignaciones creadas */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {asignaciones.map(asig => {
            const diasTexto = (asig.diasAplicables || [])
              .map(id => DIAS_SEMANA.find(d => d.id === id)?.label)
              .filter(Boolean)
              .join(', ');

            return (
              <div
                key={asig.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <div>
                  <strong>{asig.nombre}</strong> — {asig.horas}h ({asig.jornada} | {asig.horario || 'Sin horario'})
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>Días: {diasTexto || 'Todos'}</div>
                </div>
                <button
                  onClick={() => eliminarAsignacion(asig.id)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 3: EMPLEADOS, HABILIDADES Y NOVEDADES */}
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
                      {asig.nombre} ({asig.jornada})
                    </label>
                  ))}
                </div>
              </div>

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
                      <option value="SOLO_DIA">Solo Turno AM</option>
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

      {/* BOTÓN PRINCIPAL */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={generarPrevisualizacion}
          style={{ ...btnPrimary, padding: '12px 24px', fontSize: '16px', backgroundColor: '#1d4ed8' }}
        >
          <Eye size={20} /> Generar Vista Previa del Cuadro
        </button>
      </div>

      {/* SECCIÓN 4: TABLA INTERACTIVA */}
      {matrizPreview && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px' }}>Vista Previa Editable</h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Agregar persona..."
                value={nuevoEmpleadoTabla}
                onChange={e => setNuevoEmpleadoTabla(e.target.value)}
                style={inputStyle}
              />
              <button onClick={agregarFilaEnPreview} style={{ ...btnPrimary, backgroundColor: '#4b5563' }}>
                <Plus size={16} /> Añadir fila
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={guardarCuadroEnHistorial} style={{ ...btnPrimary, backgroundColor: '#7c3aed' }}>
                <Save size={18} /> Guardar en Historial
              </button>
              <button onClick={exportarExcel} style={{ ...btnPrimary, backgroundColor: '#15803d' }}>
                <Download size={18} /> Exportar Excel (.xlsx)
              </button>
            </div>
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
                        minWidth: '185px',
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