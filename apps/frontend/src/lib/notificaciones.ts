let audioCtx: AudioContext | null = null;

// Los navegadores bloquean audio hasta que hay un gesto del usuario (click).
// Esto se llama una vez desde el botón "Activar sonido" de la pantalla de cocina;
// después de eso, reproducirBeep() puede sonar aunque lo dispare un evento de socket.
export function activarSonido() {
  if (typeof window === 'undefined') return;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function reproducirBeep() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 880;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const resultado = await Notification.requestPermission();
  return resultado === 'granted';
}

export function notificarNuevoPedido(mesa?: string | null) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification('Nuevo pedido', {
    body: mesa ? `Mesa ${mesa}` : 'Pedido sin mesa asignada',
  });
}
