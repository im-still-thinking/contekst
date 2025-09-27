declare global {
  interface Window {
    opener: Window | null;
  }
  
  const chrome: any;
}

export {};





