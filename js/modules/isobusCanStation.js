/**
 * AGROLINHAS PRO - ISOBUS (ISO 11783) & BARRAMENTO CAN TELEMETRY STATION
 * Leitura de telemetria de tratores e colhedoras via WebSockets, Bluetooth CAN e USB-Serial SLCAN.
 * Decodificador de mensagens J1939 (PGN/SPN) e ISOBUS Task Controller (TC-GEO / TC-BAS).
 */

export const IsobusCanStation = {
  status: {
    connected: false,
    mode: 'disconnected', // 'websocket', 'bluetooth', 'serial', 'simulated'
    gatewayUrl: 'ws://localhost:8088',
    engineRpm: 1950,
    vehicleSpeedKmh: 6.8,
    fuelRateLh: 18.5,
    engineTempC: 84,
    hydraulicPressureBar: 180,
    applicationRateLha: 120.0,
    isobusSectionBitmap: 0xFFFF, // 16 seções ativas (todas ligadas)
    isobusTcStatus: 'OK (ISOBUS TC-GEO)',
    lastFrameHex: '0CF00400#0000003058000000',
    totalCanFrames: 0
  },

  websocket: null,
  device: null,
  port: null,
  simTimer: null,
  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
  },

  notify() {
    this.listeners.forEach(cb => cb(this.status));
  },

  /**
   * Conecta ao Gateway CAN / ISOBUS via WebSockets (SocketCAN / ESP32-CAN / Gateway IP)
   * @param {string} url - ex: ws://192.168.1.100:8088
   */
  async connectWebSocket(url = 'ws://localhost:8088') {
    return new Promise((resolve, reject) => {
      try {
        if (this.websocket) {
          this.websocket.close();
        }

        const ws = new WebSocket(url);
        this.status.gatewayUrl = url;

        ws.onopen = () => {
          this.websocket = ws;
          this.status.connected = true;
          this.status.mode = 'websocket';
          this.notify();
          resolve(true);
        };

        ws.onmessage = (event) => {
          this._processIncomingCanMessage(event.data);
        };

        ws.onerror = (err) => {
          reject(new Error(`Falha de conexão com Gateway CAN em ${url}`));
        };

        ws.onclose = () => {
          if (this.status.mode === 'websocket') {
            this.status.connected = false;
            this.status.mode = 'disconnected';
            this.notify();
          }
        };
      } catch(e) {
        reject(e);
      }
    });
  },

  /**
   * Conecta a um dongle Bluetooth CAN (Macchina M2, ELM327, ESP32 CAN)
   */
  async connectBluetooth() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API não suportada neste navegador.');
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['generic_access', '00001101-0000-1000-8000-00805f9b34fb']
    });

    this.device = device;
    this.status.connected = true;
    this.status.mode = 'bluetooth';
    this.notify();
    return device.name || 'Dongle Bluetooth CAN';
  },

  /**
   * Conecta a um adaptador USB-Serial CAN (SLCAN / Lawicel protocol)
   */
  async connectSerial(baudRate = 115200) {
    if (!navigator.serial) {
      throw new Error('Web Serial API não suportada neste navegador.');
    }

    const port = await navigator.serial.requestPort();
    await port.open({ baudRate });
    this.port = port;
    this.status.connected = true;
    this.status.mode = 'serial';
    this.notify();
    this._readSerialStream(port);
  },

  /**
   * Ativa o Simulador de Barramento ISOBUS / CAN bus J1939 em tempo real
   */
  startSimulation() {
    this.stopSimulation();
    this.status.connected = true;
    this.status.mode = 'simulated';

    this.simTimer = setInterval(() => {
      // Simula variações dinâmicas da telemetria da máquina no campo
      const rpmVar = (Math.random() * 40 - 20);
      const speedVar = (Math.random() * 0.4 - 0.2);
      const fuelVar = (Math.random() * 1.0 - 0.5);

      this.status.engineRpm = Math.max(800, Math.min(2400, Math.round(this.status.engineRpm + rpmVar)));
      this.status.vehicleSpeedKmh = Math.max(0, Math.min(30, parseFloat((this.status.vehicleSpeedKmh + speedVar).toFixed(1))));
      this.status.fuelRateLh = Math.max(5, Math.min(50, parseFloat((this.status.fuelRateLh + fuelVar).toFixed(1))));
      this.status.engineTempC = 83 + Math.floor(Math.random() * 4);
      this.status.hydraulicPressureBar = 175 + Math.floor(Math.random() * 10);
      this.status.applicationRateLha = parseFloat((120.0 + (Math.random() * 4 - 2)).toFixed(1));
      
      this.status.totalCanFrames += 12;
      this.status.lastFrameHex = `0CF00400#${Math.floor(Math.random()*0xFFFFFFFFFFFF).toString(16).padStart(16, '0').toUpperCase()}`;

      this.notify();
    }, 500);

    this.notify();
  },

  stopSimulation() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  },

  disconnect() {
    this.stopSimulation();
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.status.connected = false;
    this.status.mode = 'disconnected';
    this.notify();
  },

  /**
   * Processa mensagens CAN recebidas via Socket / WebSocket (formato JSON ou SocketCAN hex string)
   * @private
   */
  _processIncomingCanMessage(rawData) {
    this.status.totalCanFrames++;
    let messageStr = typeof rawData === 'string' ? rawData : new TextDecoder().decode(rawData);

    try {
      if (messageStr.startsWith('{')) {
        // Objeto JSON do Gateway CAN
        const json = JSON.parse(messageStr);
        if (json.rpm !== undefined) this.status.engineRpm = json.rpm;
        if (json.speed !== undefined) this.status.vehicleSpeedKmh = json.speed;
        if (json.fuel !== undefined) this.status.fuelRateLh = json.fuel;
        if (json.temp !== undefined) this.status.engineTempC = json.temp;
        if (json.sections !== undefined) this.status.isobusSectionBitmap = json.sections;
        this.status.lastFrameHex = JSON.stringify(json).slice(0, 32);
      } else {
        // Formato SocketCAN string: "0CF00400#0000003058000000" ou Lawicel "t0CF004008..."
        this.status.lastFrameHex = messageStr.trim().slice(0, 32);
        this._decodeJ1939Frame(messageStr.trim());
      }
    } catch(e) {
      // Ignora frames corrompidos
    }

    this.notify();
  },

  /**
   * Decodificador de PGNs J1939 / ISOBUS
   * @private
   */
  _decodeJ1939Frame(frameStr) {
    let canId = 0;
    let dataHex = '';

    if (frameStr.includes('#')) {
      const parts = frameStr.split('#');
      canId = parseInt(parts[0], 16);
      dataHex = parts[1] || '';
    } else if (frameStr.startsWith('t') || frameStr.startsWith('T')) {
      canId = parseInt(frameStr.slice(1, 9), 16);
      dataHex = frameStr.slice(10);
    } else {
      return;
    }

    // Extrai o PGN (Parameter Group Number) do CAN ID de 29 bits (J1939)
    const pgn = (canId >> 8) & 0x3FFFF;

    // Converte os bytes hex para Array de inteiros
    const bytes = [];
    for (let i = 0; i < dataHex.length; i += 2) {
      bytes.push(parseInt(dataHex.slice(i, i + 2), 16) || 0);
    }

    // 1. PGN 61444 (0x0CF004 - EEC1: Electronic Engine Controller 1)
    if (pgn === 61444 || (canId & 0x0FFFFF00) === 0x0CF00400) {
      if (bytes.length >= 5) {
        const rawRpm = (bytes[4] << 8) | bytes[3];
        this.status.engineRpm = Math.round(rawRpm * 0.125);
      }
    }

    // 2. PGN 65265 (0x18FEF1 - CCVS: Cruise Control & Vehicle Speed)
    else if (pgn === 65265 || (canId & 0x0FFFFF00) === 0x18FEF100) {
      if (bytes.length >= 3) {
        const rawSpeed = (bytes[2] << 8) | bytes[1];
        this.status.vehicleSpeedKmh = parseFloat((rawSpeed / 256.0).toFixed(1));
      }
    }

    // 3. PGN 65266 (0x18FEF2 - LFE: Fuel Economy)
    else if (pgn === 65266 || (canId & 0x0FFFFF00) === 0x18FEF200) {
      if (bytes.length >= 2) {
        const rawFuel = (bytes[1] << 8) | bytes[0];
        this.status.fuelRateLh = parseFloat((rawFuel * 0.05).toFixed(1));
      }
    }

    // 4. PGN 65262 (0x18FEEE - ET1: Engine Temperature)
    else if (pgn === 65262 || (canId & 0x0FFFFF00) === 0x18FEEE00) {
      if (bytes.length >= 1) {
        this.status.engineTempC = bytes[0] - 40;
      }
    }

    // 5. ISOBUS Task Controller (TC) Section Control
    else if (pgn === 65096 || pgn === 61184) {
      if (bytes.length >= 2) {
        this.status.isobusSectionBitmap = (bytes[1] << 8) | bytes[0];
      }
    }
  },

  /**
   * Leitura contínua da porta serial (Web Serial)
   * @private
   */
  async _readSerialStream(port) {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // Mantém o resto incompleto
        lines.forEach(line => this._processIncomingCanMessage(line));
      }
    } catch (e) {
      console.warn('Conexão serial CAN encerrada:', e);
    } finally {
      reader.releaseLock();
    }
  }
};
