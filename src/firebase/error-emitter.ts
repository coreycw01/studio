
'use client';

type ErrorCallback = (error: any) => void;

class ErrorEmitter {
  private listeners: Record<string, ErrorCallback[]> = {};

  on(channel: string, callback: ErrorCallback) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }
    this.listeners[channel].push(callback);
    return () => {
      this.listeners[channel] = this.listeners[channel].filter(l => l !== callback);
    };
  }

  emit(channel: string, error: any) {
    if (this.listeners[channel]) {
      this.listeners[channel].forEach(callback => callback(error));
    }
  }
}

export const errorEmitter = new ErrorEmitter();
