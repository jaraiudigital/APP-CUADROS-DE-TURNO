// frontend/src/Auth.jsx
import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [modo, setModo] = useState('LOGIN'); // 'LOGIN' | 'REGISTRO' | 'RECUPERAR'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      if (modo === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (modo === 'REGISTRO') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMensaje('Registro exitoso. Revisa tu correo para confirmar tu cuenta (o inicia sesión).');
      } else if (modo === 'RECUPERAR') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setMensaje('Te enviamos un enlace a tu correo para restablecer la contraseña.');
      }
    } catch (err) {
      setMensaje('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>
        {modo === 'LOGIN' && 'Iniciar Sesión'}
        {modo === 'REGISTRO' && 'Crear Cuenta'}
        {modo === 'RECUPERAR' && 'Recuperar Contraseña'}
      </h2>

      <form onSubmit={manejarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />

        {modo !== 'RECUPERAR' && (
          <input
            type="password"
            placeholder="Contraseña (mínimo 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
        )}

        <button
          type="submit"
          disabled={cargando}
          style={{ padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          {cargando ? 'Procesando...' : modo === 'LOGIN' ? 'Entrar' : modo === 'REGISTRO' ? 'Registrarme' : 'Enviar enlace'}
        </button>
      </form>

      {mensaje && (
        <p style={{ marginTop: '12px', fontSize: '13px', color: mensaje.startsWith('Error') ? '#dc2626' : '#15803d' }}>
          {mensaje}
        </p>
      )}

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', textAlign: 'center' }}>
        {modo !== 'LOGIN' && (
          <button onClick={() => setModo('LOGIN')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
            Volver a Iniciar Sesión
          </button>
        )}
        {modo === 'LOGIN' && (
          <>
            <button onClick={() => setModo('REGISTRO')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
              ¿No tienes cuenta? Regístrate aquí
            </button>
            <button onClick={() => setModo('RECUPERAR')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
              Olvidé mi contraseña
            </button>
          </>
        )}
      </div>
    </div>
  );
}