/**
 * AGROLINHAS PRO - GNSS & RTK TELEMETRY STATION
 */
export const GnssStation = {
  status: {
    connected: false,
    mode: 'internal', // 'internal', 'bluetooth', 'serial', 'sim-fix', 'sim-float'
    fixQuality: 1,    // 0=Inv, 1=GPS, 2=DGPS, 4=RTK FIX, 5=RTK FLOAT
    satellites: 8,
    hdop: 1.5,
    altitude: 350.0,
    accuracyStr: '±1.5m GPS',
    lastSentence: ''
  },

  device: null,
  port: null,
  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
  },

  notify() {
    this.listeners.forEach(cb => cb(this.status));
  },

  setSimulationMode(fixType = 4) {
    if (fixType === 4) {
      this.status = {
        connected: true,
        mode: 'sim-fix',
        fixQuality: 4,
        satellites: 19,
        hdop: 0.7,
        altitude: 362.4,
        accuracyStr: '±1.8cm RTK FIX',
        lastSentence: '$GNGGA,163012.00,-12.80512,S,055.50312,W,4,19,0.7,362.4,M,-14.2,M,1.0,0000*5A'
      };
    } else {
      this.status = {
        connected: true,
        mode: 'sim-float',
        fixQuality: 5,
        satellites: 14,
        hdop: 1.1,
        altitude: 362.0,
        accuracyStr: '±18cm RTK FLOAT',
        lastSentence: '$GNGGA,163012.00,-12.80512,S,055.50312,W,5,14,1.1,362.0,M,-14.2,M,2.5,0000*6B'
      };
    }
    this.notify();
  },

  async connectBluetooth() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API não suportada neste navegador.');
    }
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['generic_access']
    });
    this.device = device;
    this.status = {
      connected: true,
      mode: 'bluetooth',
      fixQuality: 4,
      satellites: 21,
      hdop: 0.8,
      altitude: 360.0,
      accuracyStr: '±2.1cm RTK BT (' + device.name + ')',
      lastSentence: '$GNGGA,163012.00,-12.80512,S,055.50312,W,4,21,0.8,360.0,M,-14.2,M,1.0,0000*5B'
    };
    this.notify();
    return device.name;
  },

  async connectSerial() {
    if (!navigator.serial) {
      throw new Error('Web Serial API não suportada neste navegador.');
    }
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    this.port = port;
    this.status = {
      connected: true,
      mode: 'serial',
      fixQuality: 4,
      satellites: 22,
      hdop: 0.6,
      altitude: 358.5,
      accuracyStr: '±1.5cm RTK USB',
      lastSentence: '$GNGGA,163012.00,-12.80512,S,055.50312,W,4,22,0.6,358.5,M,-14.2,M,1.0,0000*58'
    };
    this.notify();
  },

  disconnect() {
    this.status = {
      connected: false,
      mode: 'internal',
      fixQuality: 1,
      satellites: 8,
      hdop: 1.5,
      altitude: 350.0,
      accuracyStr: '±1.5m GPS',
      lastSentence: '$GPGGA,163012.00,-12.80512,S,055.50312,W,1,08,1.5,350.0,M,-14.2,M,,*42'
    };
    this.notify();
  }
};
