// Edit only these values when preparing the tablet. A PIN in client-side code is an
// operational barrier, not a secret. Do not put API keys here.
window.EXPO_SETTINGS = Object.freeze({
  eventTitle: 'ExpoTan 2026',
  eventDates: '2, 3 y 4 de octubre',
  questionsPerEntry: 5,
  instagramHandle: '@usittel.tandil',
  instagramUrl: 'https://www.instagram.com/usittel.tandil/',
  basesUrl: '', // Add the approved Bases y Condiciones URL when available.
  finalMessage: 'Próximamente seguimos ampliando nuestra cobertura en Tandil.',
  newZone: 'Villa Italia',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycby07FRawfyudsjpuENDIQFurJ849VhwzgNBmBlID-fQCmXl6Gt-3bMHEFjVayFfRhJs/exec',
  adminPin: '2026', // Change before the event. Never treat this as real authentication.
  resetSeconds: 10,
  questions: [
    { id: 'inicio', text: '¿En qué año comenzó a brindar servicio USITTEL?', correctId: '2024', options: [
      { id: '2019', text: '2019' }, { id: '2021', text: '2021' }, { id: '2026', text: '2026' }, { id: '2024', text: '2024' }
    ] },
    { id: 'es', text: 'USITTEL es...', correctId: 'fibra', correctIds: ['fibra', 'internet'], options: [
      { id: 'fibra', text: 'La fibra óptica de tu ciudad' }, { id: 'telefonia', text: 'Un servicio de telefonía' },
      { id: 'internet', text: 'La mejor internet' }, { id: 'ninguna', text: 'Ninguna de las anteriores' }
    ] },
    { id: 'servicios', text: '¿Qué servicios ofrece USITTEL?', correctId: 'internet-tv-mesh', options: [
      { id: 'celular-cable', text: 'Internet, telefonía celular y cable' },
      { id: 'internet-tv-mesh', text: 'Internet, TV y WiFi Mesh' },
      { id: 'tv-fija', text: 'TV y telefonía fija' }, { id: 'solo-internet', text: 'Solo Internet' }
    ] },
    { id: 'simetrica', text: '¿Qué significa que una conexión sea “simétrica”?', correctId: 'subida-bajada', options: [
      { id: 'subida-bajada', text: 'Que tiene la misma velocidad de subida y de bajada' },
      { id: 'dia-noche', text: 'Que funciona igual de rápido de día y de noche' },
      { id: 'dispositivos', text: 'Que permite conectar la misma cantidad de dispositivos' },
      { id: 'dos-conexiones', text: 'Que tiene dos conexiones de Internet' }
    ] },
    { id: 'wifi', text: '¿Qué aparato usamos normalmente para conectarnos al WiFi?', correctId: 'modem', options: [
      { id: 'set-top-box', text: 'Set Top Box' }, { id: 'decodificador', text: 'Decodificador' },
      { id: 'modem', text: 'Módem' }, { id: 'hdmi', text: 'Cable HDMI' }
    ] }
  ]
});
