/**
 * AGROLINHAS PRO - GUIDANCE & LINE GENERATION ENGINE
 * Cálculo de linhas retas A-B, curvas de nível com base em DEM real,
 * cabeceiras e exportador profissional em formato KML/GeoJSON.
 */
export const GuidanceEngine = {

  /**
   * Calcula o azimute ótimo ao longo do lado mais longo do polígono
   */
  calculateBestAngle(polygonGeoJSON) {
    if (!polygonGeoJSON) return { angle: 90, frontLengthMeters: 0 };
    const geom = polygonGeoJSON.geometry || polygonGeoJSON;
    const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
    if (!coords || coords.length < 2) return { angle: 90, frontLengthMeters: 0 };

    let maxDist = 0, bestBearing = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = turf.point(coords[i]);
      const p2 = turf.point(coords[i + 1]);
      const d = turf.distance(p1, p2, { units: 'meters' });
      if (d > maxDist) {
        maxDist = d;
        bestBearing = turf.bearing(p1, p2);
      }
    }
    return {
      angle: Math.round((bestBearing + 360) % 180),
      frontLengthMeters: Math.round(maxDist)
    };
  },

  /**
   * Gera linhas retas A-B paralelas.
   * Se customABPoints for fornecido ([ [lonA, latA], [lonB, latB] ]), utiliza os pontos marcados.
   */
  generateStraightAB(polygonGeoJSON, implementWidth, headingAngle = 90, customABPoints = null) {
    const bbox = turf.bbox(polygonGeoJSON);
    const diag = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[3]]), { units: 'meters' });
    let baseLine = null;

    if (customABPoints && customABPoints.length >= 2) {
      const a = customABPoints[0];
      const b = customABPoints[1];
      const bearing = turf.bearing(turf.point(a), turf.point(b));
      const extendDist = diag * 1.5;

      const p1 = turf.destination(turf.point(a), extendDist / 1000, bearing + 180, { units: 'kilometers' });
      const p2 = turf.destination(turf.point(b), extendDist / 1000, bearing, { units: 'kilometers' });
      baseLine = turf.lineString([p1.geometry.coordinates, p2.geometry.coordinates]);
    } else {
      const center = turf.center(polygonGeoJSON);
      const pCenter = center.geometry.coordinates;
      const rad = (90 - headingAngle) * Math.PI / 180;
      const dx = Math.cos(rad) * (diag / 111320) * 1.5;
      const dy = Math.sin(rad) * (diag / 110540) * 1.5;

      baseLine = turf.lineString([
        [pCenter[0] - dx, pCenter[1] - dy],
        [pCenter[0] + dx, pCenter[1] + dy]
      ]);
    }

    const maxSteps = Math.min(250, Math.ceil((diag / 2) / implementWidth) + 4);
    const allSegments = [];

    const clipAndAdd = (lineGeo) => {
      const lineLen = turf.length(lineGeo, { units: 'meters' });
      if (lineLen <= 0) return;
      const numPts = Math.max(20, Math.ceil(lineLen / 3));
      let run = [];

      for (let i = 0; i <= numPts; i++) {
        const pt = turf.along(lineGeo, (i / numPts) * lineLen, { units: 'meters' });
        let inside = false;
        try {
          inside = turf.booleanPointInPolygon(pt, polygonGeoJSON);
        } catch (e) {
          inside = false;
        }

        if (inside) {
          run.push(pt.geometry.coordinates);
        } else {
          if (run.length >= 2) allSegments.push(run);
          run = [];
        }
      }
      if (run.length >= 2) allSegments.push(run);
    };

    clipAndAdd(baseLine);

    for (let dir = -1; dir <= 1; dir += 2) {
      for (let k = 1; k <= maxSteps; k++) {
        const dist = dir * k * implementWidth;
        try {
          const offset = turf.lineOffset(baseLine, dist, { units: 'meters' });
          const obbox = turf.bbox(offset);
          const noOverlap = obbox[2] < bbox[0] || obbox[0] > bbox[2] || obbox[3] < bbox[1] || obbox[1] > bbox[3];
          if (noOverlap) break;
          clipAndAdd(offset);
        } catch (e) {
          break;
        }
      }
    }

    return {
      guideLineCoords: baseLine.geometry.coordinates,
      plantingSegments: allSegments
    };
  },

  /**
   * Gera curvas de nível baseadas em grade altimétrica DEM/IDW
   */
  generateContourDEM(polygonGeoJSON, implementWidth, percentile = 50, elevationGrid = null) {
    const bbox = turf.bbox(polygonGeoJSON);
    const minX = bbox[0], minY = bbox[1], maxX = bbox[2], maxY = bbox[3];
    const nx = elevationGrid ? elevationGrid.nx : 40;
    const ny = elevationGrid ? elevationGrid.ny : 40;
    const values = elevationGrid ? elevationGrid.values : null;

    let gridValues = values;
    if (!gridValues) {
      gridValues = new Array(nx * ny);
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const lon = minX + (x / (nx - 1)) * (maxX - minX);
          const lat = minY + (y / (ny - 1)) * (maxY - minY);
          gridValues[x + y * nx] = (Math.sin(lat * 120) * 12) + (Math.cos(lon * 90) * 10);
        }
      }
    }

    let minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < gridValues.length; i++) {
      if (gridValues[i] < minV) minV = gridValues[i];
      if (gridValues[i] > maxV) maxV = gridValues[i];
    }

    const target = minV + (maxV - minV) * (percentile / 100);
    const contourGen = d3.contours().size([nx, ny]).thresholds([target]);
    const contourResult = contourGen(gridValues);

    const allSegments = [];
    let guideCoords = null;

    if (contourResult.length && contourResult[0].coordinates.length) {
      let bestRing = null, bestLen = 0;
      contourResult[0].coordinates.forEach(polygonRings => {
        const ring = polygonRings[0];
        if (ring.length > bestLen) {
          bestLen = ring.length;
          bestRing = ring;
        }
      });

      if (bestRing) {
        const baseCoords = bestRing.map(p => [
          minX + (p[0] / (nx - 1)) * (maxX - minX),
          minY + (p[1] / (ny - 1)) * (maxY - minY)
        ]);
        guideCoords = baseCoords;
        const baseLine = turf.lineString(baseCoords);
        const diag = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[3]]), { units: 'meters' });
        const maxSteps = Math.min(120, Math.ceil((diag / 2) / implementWidth) + 3);

        const clipAndPush = (line) => {
          const coords = line.geometry.coordinates;
          let run = [];
          for (let i = 0; i < coords.length; i++) {
            let inside = false;
            try {
              inside = turf.booleanPointInPolygon(turf.point(coords[i]), polygonGeoJSON);
            } catch (e) {
              inside = false;
            }
            if (inside) {
              run.push(coords[i]);
            } else {
              if (run.length >= 2) allSegments.push(run);
              run = [];
            }
          }
          if (run.length >= 2) allSegments.push(run);
        };

        clipAndPush(baseLine);

        for (let dir = -1; dir <= 1; dir += 2) {
          for (let k = 1; k <= maxSteps; k++) {
            const dist = dir * k * implementWidth;
            try {
              const offset = turf.lineOffset(baseLine, dist, { units: 'meters' });
              const obbox = turf.bbox(offset);
              const noOverlap = obbox[2] < bbox[0] || obbox[0] > bbox[2] || obbox[3] < bbox[1] || obbox[1] > bbox[3];
              if (noOverlap) break;
              clipAndPush(offset);
            } catch (e) {
              break;
            }
          }
        }
      }
    }

    return {
      guideLineCoords: guideCoords,
      plantingSegments: allSegments
    };
  },

  /**
   * Gera passadas de manobra na cabeceira (bordadura)
   */
  generateHeadlands(polygonGeoJSON, implementWidth, passesCount) {
    const headlandRings = [];
    if (passesCount <= 0 || !polygonGeoJSON) return headlandRings;

    for (let p = 1; p <= passesCount; p++) {
      const bufDist = - (p * implementWidth - (implementWidth / 2));
      try {
        const buffered = turf.buffer(polygonGeoJSON, bufDist, { units: 'meters' });
        if (buffered && buffered.geometry) {
          const hcoords = buffered.geometry.coordinates[0];
          if (hcoords && hcoords.length > 2) {
            headlandRings.push(hcoords);
          }
        }
      } catch (e) {}
    }
    return headlandRings;
  },

  /**
   * Exporta todo o projeto de linhas para o formato KML compatível com monitores
   */
  exportToKML(lastResult, fieldPolygonGeoJSON = null, fieldName = 'Talhao') {
    if (!lastResult || !lastResult.plantingSegments) return null;

    let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
    kml += `  <name>AgroLinhas Pro - ${fieldName}</name>\n`;

    // Estilos
    kml += '  <Style id="guideStyle">\n';
    kml += '    <LineStyle><color>ff129cf3</color><width>4</width></LineStyle>\n';
    kml += '  </Style>\n';
    kml += '  <Style id="plantStyle">\n';
    kml += '    <LineStyle><color>ff2ecc71</color><width>2.5</width></LineStyle>\n';
    kml += '  </Style>\n';
    kml += '  <Style id="headlandStyle">\n';
    kml += '    <LineStyle><color>ff3498db</color><width>2</width></LineStyle>\n';
    kml += '  </Style>\n';
    kml += '  <Style id="boundaryStyle">\n';
    kml += '    <LineStyle><color>ffffff00</color><width>2</width></LineStyle>\n';
    kml += '    <PolyStyle><color>222ecc71</color></PolyStyle>\n';
    kml += '  </Style>\n';

    // Limite do Talhão
    if (fieldPolygonGeoJSON) {
      const geom = fieldPolygonGeoJSON.geometry || fieldPolygonGeoJSON;
      const rings = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
      rings.forEach((ring, idx) => {
        kml += '  <Placemark>\n';
        kml += `    <name>Limite do Talhão ${idx + 1}</name>\n`;
        kml += '    <styleUrl>#boundaryStyle</styleUrl>\n';
        kml += '    <Polygon><outerBoundaryIs><LinearRing><coordinates>\n';
        kml += '      ' + ring[0].map(c => `${c[0]},${c[1]},0`).join(' ') + '\n';
        kml += '    </coordinates></LinearRing></outerBoundaryIs></Polygon>\n';
        kml += '  </Placemark>\n';
      });
    }

    // Linha-Guia
    if (lastResult.guideLineCoords && lastResult.guideLineCoords.length >= 2) {
      kml += '  <Placemark>\n';
      kml += '    <name>Linha-Guia Mestre (Master Reference)</name>\n';
      kml += '    <styleUrl>#guideStyle</styleUrl>\n';
      kml += '    <LineString><coordinates>\n';
      kml += '      ' + lastResult.guideLineCoords.map(c => `${c[0]},${c[1]},0`).join(' ') + '\n';
      kml += '    </coordinates></LineString>\n';
      kml += '  </Placemark>\n';
    }

    // Linhas de Plantio
    lastResult.plantingSegments.forEach((seg, i) => {
      kml += '  <Placemark>\n';
      kml += `    <name>Passada ${i + 1}</name>\n`;
      kml += '    <styleUrl>#plantStyle</styleUrl>\n';
      kml += '    <LineString><coordinates>\n';
      kml += '      ' + seg.map(c => `${c[0]},${c[1]},0`).join(' ') + '\n';
      kml += '    </coordinates></LineString>\n';
      kml += '  </Placemark>\n';
    });

    // Cabeceiras
    if (lastResult.headlandRings) {
      lastResult.headlandRings.forEach((hring, i) => {
        kml += '  <Placemark>\n';
        kml += `    <name>Cabeceira Volta ${i + 1}</name>\n`;
        kml += '    <styleUrl>#headlandStyle</styleUrl>\n';
        kml += '    <LineString><coordinates>\n';
        kml += '      ' + hring.map(c => `${c[0]},${c[1]},0`).join(' ') + '\n';
        kml += '    </coordinates></LineString>\n';
        kml += '  </Placemark>\n';
      });
    }

    kml += '</Document>\n</kml>';
    return kml;
  },

  /**
   * Parser robusto para arquivos KML (Google Earth, QGIS, monitores)
   */
  parseKMLPolygon(kmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(kmlText, 'text/xml');
    const coordNodes = xml.getElementsByTagName('coordinates');
    if (coordNodes.length === 0) return null;

    const raw = coordNodes[0].textContent.trim();
    const pts = raw.split(/\s+/).map(p => {
      const parts = p.split(',');
      return [parseFloat(parts[0]), parseFloat(parts[1])];
    }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));

    if (pts.length < 3) return null;
    const first = pts[0], last = pts[pts.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      pts.push(first);
    }
    return { type: 'Polygon', coordinates: [pts] };
  }
};
