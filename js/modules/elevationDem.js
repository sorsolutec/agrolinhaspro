/**
 * AGROLINHAS PRO - DIGITAL ELEVATION MODEL (DEM) & TOPOGRAPHY SERVICE
 * Suporte a Modelo Digital de Elevação Real (Copernicus DEM via Open-Meteo)
 * e Levantamento Topográfico RTK via CSV/TXT com Proj4 e interpolação IDW.
 */

// Definições de Projeção UTM SIRGAS 2000 (Brasil)
export const UTM_DEFS = {
  latlon: 'WGS84',
  utm20s: '+proj=utm +zone=20 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  utm21s: '+proj=utm +zone=21 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  utm22s: '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  utm23s: '+proj=utm +zone=23 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  utm24s: '+proj=utm +zone=24 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
};

export const ElevationDem = {
  currentMode: 'srtm', // 'srtm' (Copernicus DEM) ou 'csv' (Levantamento RTK)
  scatterPoints: null, // Pontos topográficos [{lon, lat, z}]
  cachedGrid: null,    // Malha interpolada {nx, ny, minX, minY, maxX, maxY, values, provider}
  isBusy: false,

  /**
   * Faz o parse de arquivo CSV/TXT de levantamento com coordenadas X, Y, Z
   */
  parseCsvPoints(text, coordSystem = 'latlon') {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const raw = [];

    lines.forEach(line => {
      const parts = line.split(/[,;\t]+/).map(s => s.trim().replace(',', '.'));
      if (parts.length < 3) return;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const z = parseFloat(parts[2]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        raw.push([x, y, z]);
      }
    });

    if (raw.length < 3) {
      throw new Error('O arquivo deve conter pelo menos 3 pontos topográficos válidos (X, Y, Z).');
    }

    const pts = [];
    if (coordSystem === 'latlon') {
      raw.forEach(p => pts.push({ lon: p[0], lat: p[1], z: p[2] }));
    } else {
      const def = UTM_DEFS[coordSystem];
      if (!def || typeof proj4 === 'undefined') {
        throw new Error('Projeção UTM não configurada ou biblioteca Proj4 não carregada.');
      }
      raw.forEach(p => {
        const ll = proj4(def, 'WGS84', [p[0], p[1]]);
        pts.push({ lon: ll[0], lat: ll[1], z: p[2] });
      });
    }

    this.scatterPoints = pts;
    this.cachedGrid = null;
    return pts;
  },

  /**
   * Interpolação espacial por Ponderação pelo Inverso da Distância (IDW)
   */
  idwAt(lon, lat, pts) {
    let num = 0, den = 0;
    const len = pts.length;
    for (let i = 0; i < len; i++) {
      const dx = pts[i].lon - lon;
      const dy = pts[i].lat - lat;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1e-16) return pts[i].z;
      const w = 1 / d2;
      num += w * pts[i].z;
      den += w;
    }
    return den > 0 ? num / den : 0;
  },

  buildIDWGrid(pts, minX, minY, maxX, maxY, nx = 40, ny = 40) {
    const values = new Array(nx * ny);
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const lon = minX + (x / (nx - 1)) * (maxX - minX);
        const lat = minY + (y / (ny - 1)) * (maxY - minY);
        values[x + y * nx] = this.idwAt(lon, lat, pts);
      }
    }
    return { nx, ny, minX, minY, maxX, maxY, values, provider: 'Levantamento RTK (IDW)' };
  },

  /**
   * Consulta em lotes à API Open-Meteo (Copernicus DEM 90m)
   */
  async fetchOpenMeteoBatch(batch) {
    const lats = batch.map(p => p[0].toFixed(6)).join(',');
    const lons = batch.map(p => p[1].toFixed(6)).join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Open-Meteo HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.elevation) throw new Error('Resposta sem elevação.');
    return data.elevation.map(v => v === null ? 0 : v);
  },

  /**
   * Fallback: consulta à API Open-Elevation
   */
  async fetchOpenElevationBatch(batch) {
    const locStr = batch.map(p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join('|');
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${encodeURIComponent(locStr)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Open-Elevation HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.results) throw new Error('Resposta sem resultados.');
    return data.results.map(r => r.elevation === null ? 0 : r.elevation);
  },

  /**
   * Busca e monta a grade de elevação altimétrica real
   */
  async fetchElevationGrid(minX, minY, maxX, maxY, nx = 36, ny = 36, onProgress = null) {
    const locations = [];
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        locations.push([minY + (y / (ny - 1)) * (maxY - minY), minX + (x / (nx - 1)) * (maxX - minX)]);
      }
    }

    const values = new Array(nx * ny).fill(0);
    const batchSize = 100;
    const totalBatches = Math.ceil(locations.length / batchSize);
    let provider = 'Copernicus DEM (Open-Meteo)';

    for (let b = 0; b < totalBatches; b++) {
      const batch = locations.slice(b * batchSize, (b + 1) * batchSize);
      let result = null;
      try {
        result = await this.fetchOpenMeteoBatch(batch);
        provider = 'Copernicus DEM (Open-Meteo)';
      } catch (e1) {
        try {
          result = await this.fetchOpenElevationBatch(batch);
          provider = 'Open-Elevation';
        } catch (e2) {
          throw new Error('Falha na consulta de elevação online. Verifique a conexão com a internet.');
        }
      }

      result.forEach((v, i) => {
        values[b * batchSize + i] = v;
      });

      if (onProgress) {
        onProgress(Math.round(((b + 1) / totalBatches) * 100), provider);
      }
    }

    return { nx, ny, minX, minY, maxX, maxY, values, provider };
  },

  /**
   * Amostragem bilinear na grade altimétrica
   */
  sampleGrid(grid, lon, lat) {
    if (!grid || !grid.values) return 0;
    let fx = (lon - grid.minX) / (grid.maxX - grid.minX) * (grid.nx - 1);
    let fy = (lat - grid.minY) / (grid.maxY - grid.minY) * (grid.ny - 1);
    fx = Math.max(0, Math.min(grid.nx - 1, fx));
    fy = Math.max(0, Math.min(grid.ny - 1, fy));

    const x0 = Math.floor(fx), x1 = Math.min(grid.nx - 1, x0 + 1);
    const y0 = Math.floor(fy), y1 = Math.min(grid.ny - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;

    const v00 = grid.values[x0 + y0 * grid.nx];
    const v10 = grid.values[x1 + y0 * grid.nx];
    const v01 = grid.values[x0 + y1 * grid.nx];
    const v11 = grid.values[x1 + y1 * grid.nx];

    const v0 = v00 * (1 - tx) + v10 * tx;
    const v1 = v01 * (1 - tx) + v11 * tx;
    return v0 * (1 - ty) + v1 * ty;
  },

  /**
   * Garante a disponibilidade da malha de elevação
   */
  async ensureGrid(bbox, onProgress = null) {
    const minX = bbox[0], minY = bbox[1], maxX = bbox[2], maxY = bbox[3];
    const boundsKey = `${minX.toFixed(5)},${minY.toFixed(5)},${maxX.toFixed(5)},${maxY.toFixed(5)}|${this.currentMode}`;

    if (this.cachedGrid && this.cachedGrid.boundsKey === boundsKey) {
      return this.cachedGrid;
    }

    let grid = null;
    if (this.currentMode === 'csv') {
      if (!this.scatterPoints || this.scatterPoints.length < 3) {
        throw new Error('Carregue um arquivo de levantamento CSV/TXT com coordenadas X, Y, Z primeiro.');
      }
      grid = this.buildIDWGrid(this.scatterPoints, minX, minY, maxX, maxY);
    } else {
      grid = await this.fetchElevationGrid(minX, minY, maxX, maxY, 36, 36, onProgress);
    }

    grid.boundsKey = boundsKey;
    this.cachedGrid = grid;
    return grid;
  },

  /**
   * Calcula as métricas de relevo ao longo do talhão ou de uma linha guia
   */
  calculateProfile(polygonOrLineGeoJSON, grid = null) {
    if (!polygonOrLineGeoJSON) return null;
    const bbox = turf.bbox(polygonOrLineGeoJSON);
    const minLon = bbox[0], minLat = bbox[1], maxLon = bbox[2], maxLat = bbox[3];

    const profile = [];
    let minE = Infinity, maxE = -Infinity;
    const steps = 40;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const lon = minLon + progress * (maxLon - minLon);
      const lat = minLat + progress * (maxLat - minLat);

      let elev = 0;
      if (grid) {
        elev = Math.round(this.sampleGrid(grid, lon, lat) * 10) / 10;
      } else {
        // Fallback analítico se grid ainda não carregado
        elev = 350 + Math.sin(lat * 180) * 18 + Math.cos(lon * 150) * 14;
        elev = Math.round(elev * 10) / 10;
      }

      profile.push(elev);
      if (elev < minE) minE = elev;
      if (elev > maxE) maxE = elev;
    }

    const delta = Math.round((maxE - minE) * 10) / 10;
    const totalDistM = turf.distance(turf.point([minLon, minLat]), turf.point([maxLon, maxLat]), { units: 'meters' });
    const slope = totalDistM > 0 ? ((delta / totalDistM) * 100).toFixed(1) : '2.0';

    return {
      minElev: minE === Infinity ? 0 : minE,
      maxElev: maxE === -Infinity ? 0 : maxE,
      deltaElev: delta,
      avgSlope: parseFloat(slope),
      profileData: profile,
      provider: grid ? grid.provider : 'Prévia Rápida'
    };
  },

  /**
   * Renderiza o gráfico de perfil no elemento Canvas
   */
  drawCanvasProfile(canvas, profileResult, activePercentile = 50) {
    if (!canvas || !profileResult || !profileResult.profileData.length) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const data = profileResult.profileData;
    const min = profileResult.minElev;
    const max = profileResult.maxElev;
    const range = (max - min) || 1;

    // Linhas de grade de fundo
    ctx.strokeStyle = '#1b2c20';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.moveTo(0, h * 0.25); ctx.lineTo(w, h * 0.25);
    ctx.moveTo(0, h * 0.75); ctx.lineTo(w, h * 0.75);
    ctx.stroke();

    // Gradiente sob a curva
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(46, 204, 113, 0.45)');
    grad.addColorStop(1, 'rgba(46, 204, 113, 0.02)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const norm = (data[i] - min) / range;
      const y = h - (norm * (h - 22) + 11);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Linha da curva altimétrica
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const norm = (data[i] - min) / range;
      const y = h - (norm * (h - 22) + 11);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Linha tracejada do percentil de referência
    const targetNorm = activePercentile / 100;
    const targetY = h - (targetNorm * (h - 22) + 11);
    ctx.strokeStyle = '#f39c12';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rótulos de Cota
    ctx.fillStyle = '#92a698';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${max.toFixed(0)}m`, 6, 12);
    ctx.fillText(`${min.toFixed(0)}m`, 6, h - 4);
    ctx.fillStyle = '#f39c12';
    ctx.fillText(`Alvo: ${(min + range * (activePercentile / 100)).toFixed(0)}m`, w - 70, targetY - 4);
  }
};
