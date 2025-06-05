// src/events/progressEvents.ts - ARCHIVO COMPLETAMENTE NUEVO
class ProgressEventEmitter {
    private listeners: { [key: string]: Function[] } = {};
    
    on(event: string, callback: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
      console.log(`🔔 Registrado listener para: ${event}, Total: ${this.listeners[event].length}`);
    }
    
    off(event: string, callback: Function) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        console.log(`🔕 Removido listener para: ${event}, Restantes: ${this.listeners[event].length}`);
      }
    }
    
    emit(event: string, data?: any) {
      console.log(`📡 Emitiendo evento: ${event}`, data);
      if (this.listeners[event] && this.listeners[event].length > 0) {
        console.log(`📢 Notificando a ${this.listeners[event].length} listeners`);
        this.listeners[event].forEach((callback, index) => {
          try {
            callback(data);
            console.log(`✅ Listener ${index + 1} ejecutado correctamente`);
          } catch (error) {
            console.error(`❌ Error en listener ${index + 1} de ${event}:`, error);
          }
        });
      } else {
        console.warn(`⚠️ No hay listeners para evento: ${event}`);
      }
    }
  }
  
  export const progressEvents = new ProgressEventEmitter();
  
  // Registrar globalmente para acceso desde cualquier parte
  if (typeof global !== 'undefined') {
    (global as any).progressEvents = progressEvents;
  }