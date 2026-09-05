/**
 * AGROLINHAS PRO - FIELD CUT & ZONING MANAGER (ÁREAS ABERTAS X FECHADAS)
 * Permite delimitar áreas de lavoura (abertas) vs preservação/APP (fechadas),
 * com corte linear, recorte de ilhas/matas internas e seleção interativa no mapa.
 */
export const CutManager = {
  cutLines: [],
  cutParts: [],
  exclusionHoles: [],
  partColors: ['#2ecc71', '#3498db', '#e67e22', '#9b59b6', '#1abc9c', '#f1c40f', '#e74c3c'],

  reset() {
    this.cutLines = [];
    this.cutParts = [];
    this.exclusionHoles = [];
  },

  addCutLine(polylineGeoJSON) {
    if (!polylineGeoJSON) return;
    this.cutLines.push(polylineGeoJSON);
  },

  addExclusionHole(polygonGeoJSON) {
    if (!polygonGeoJSON) return;
    this.exclusionHoles.push(polygonGeoJSON);
  },

  /**
   * Divide o polígono base aplicando linhas de corte e recortes de ilhas/mata interna
   */
  applyCuts(basePolygonGeoJSON) {
    if (!basePolygonGeoJSON) {
      this.cutParts = [];
      return [];
    }

    let openPolygons = [basePolygonGeoJSON];
    const closedHoles = [];

    // 1. Aplica recortes de matas internas / ilhas (Holes)
    this.exclusionHoles.forEach(hole => {
      // Identifica a geometria da mata interna que intersecta o talhão
      try {
        const intersection = turf.intersect(basePolygonGeoJSON, hole);
        if (intersection && turf.area(intersection) > 10) {
          closedHoles.push(intersection);
        }
      } catch (e) {
        closedHoles.push(hole);
      }

      const nextPolygons = [];
      openPolygons.forEach(poly => {
        let diff = null;
        try {
          diff = turf.difference(poly, hole);
        } catch (e) {
          diff = null;
        }

        if (!diff) {
          nextPolygons.push(poly);
          return;
        }

        const flat = turf.flatten(diff);
        flat.features.forEach(f => {
          if (turf.area(f) > 10) nextPolygons.push(f);
        });
      });
      openPolygons = nextPolygons;
    });

    // 2. Aplica as linhas de corte sobre os polígonos abertos
    this.cutLines.forEach(line => {
      const buffered = turf.buffer(line, 0.3, { units: 'meters' });
      const nextPolygons = [];

      openPolygons.forEach(poly => {
        let diff = null;
        try {
          diff = turf.difference(poly, buffered);
        } catch (e) {
          diff = null;
        }

        if (!diff) {
          nextPolygons.push(poly);
          return;
        }

        const flat = turf.flatten(diff);
        flat.features.forEach(f => {
          if (turf.area(f) > 10) nextPolygons.push(f);
        });
      });

      openPolygons = nextPolygons;
    });

    // Monta a lista unificada de partes (Abertas + Fechadas)
    const allPartsList = [];
    let partIndex = 0;

    openPolygons.forEach(p => {
      const areaM2 = turf.area(p);
      allPartsList.push({
        id: `part-${partIndex + 1}`,
        index: partIndex,
        geojson: p,
        tag: 'open',
        color: this.partColors[partIndex % this.partColors.length],
        areaHa: areaM2 / 10000
      });
      partIndex++;
    });

    closedHoles.forEach(h => {
      const areaM2 = turf.area(h);
      allPartsList.push({
        id: `part-${partIndex + 1}`,
        index: partIndex,
        geojson: h,
        tag: 'closed',
        color: '#e74c3c',
        areaHa: areaM2 / 10000,
        isHole: true
      });
      partIndex++;
    });

    this.cutParts = allPartsList;
    return this.cutParts;
  },

  /**
   * Alterna a tag de uma parte específica ('open' <-> 'closed')
   */
  togglePartTag(index) {
    if (this.cutParts[index]) {
      this.cutParts[index].tag = this.cutParts[index].tag === 'open' ? 'closed' : 'open';
    }
    return this.cutParts;
  },

  setPartTag(index, tag) {
    if (this.cutParts[index]) {
      this.cutParts[index].tag = tag;
    }
    return this.cutParts;
  },

  /**
   * Inverte todas as tags das partes
   */
  invertSelection() {
    this.cutParts.forEach(p => {
      p.tag = p.tag === 'open' ? 'closed' : 'open';
    });
    return this.cutParts;
  },

  setAllTags(tag = 'open') {
    this.cutParts.forEach(p => {
      p.tag = tag;
    });
    return this.cutParts;
  },

  /**
   * Retorna métricas resumidas de área aberta vs fechada
   */
  getAreaMetrics(basePolygonGeoJSON) {
    const totalAreaM2 = basePolygonGeoJSON ? turf.area(basePolygonGeoJSON) : 0;
    const totalHa = totalAreaM2 / 10000;

    if (this.cutParts.length === 0) {
      return {
        totalHa,
        openHa: totalHa,
        closedHa: 0,
        openPercent: 100,
        closedPercent: 0,
        partsCount: 1
      };
    }

    const openHa = this.cutParts.filter(p => p.tag === 'open').reduce((acc, p) => acc + p.areaHa, 0);
    const closedHa = this.cutParts.filter(p => p.tag === 'closed').reduce((acc, p) => acc + p.areaHa, 0);
    const openPercent = totalHa > 0 ? Math.min(100, Math.round((openHa / totalHa) * 100)) : 0;
    const closedPercent = totalHa > 0 ? Math.min(100, Math.round((closedHa / totalHa) * 100)) : 0;

    return {
      totalHa,
      openHa,
      closedHa,
      openPercent,
      closedPercent,
      partsCount: this.cutParts.length
    };
  },

  /**
   * Retorna a união geométrica apenas das partes marcadas como 'open'
   */
  getMergedOpenPolygon() {
    const openParts = this.cutParts.filter(p => p.tag === 'open').map(p => p.geojson);
    if (openParts.length === 0) return null;
    if (openParts.length === 1) return openParts[0];

    try {
      const combined = turf.combine(turf.featureCollection(openParts));
      return combined.features[0];
    } catch (e) {
      return openParts[0];
    }
  },

  getTotalOpenAreaHa() {
    const openParts = this.cutParts.filter(p => p.tag === 'open');
    return openParts.reduce((acc, p) => acc + p.areaHa, 0);
  },

  /**
   * Exporta arquivo KML apenas com os polígonos das áreas abertas
   */
  exportOpenKML() {
    const openParts = this.cutParts.filter(p => p.tag === 'open');
    if (openParts.length === 0) return null;

    let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
    kml += '  <name>AgroLinhas Pro - Areas Abertas (Lavoura)</name>\n';
    kml += '  <Style id="aberta">\n';
    kml += '    <LineStyle><color>ff2ecc71</color><width>2.5</width></LineStyle>\n';
    kml += '    <PolyStyle><color>4d2ecc71</color></PolyStyle>\n';
    kml += '  </Style>\n';

    openParts.forEach((part, i) => {
      const geom = part.geojson.geometry || part.geojson;
      const rings = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

      rings.forEach((polyCoords, j) => {
        kml += '  <Placemark>\n';
        kml += `    <name>Gleba Aberta ${i + 1}${rings.length > 1 ? `.${j + 1}` : ''} (${part.areaHa.toFixed(2)} ha)</name>\n`;
        kml += '    <styleUrl>#aberta</styleUrl>\n';
        kml += '    <Polygon>\n';
        kml += '      <outerBoundaryIs><LinearRing><coordinates>\n';
        kml += '        ' + polyCoords[0].map(c => `${c[0]},${c[1]},0`).join(' ') + '\n';
        kml += '      </coordinates></LinearRing></outerBoundaryIs>\n';
        kml += '    </Polygon>\n';
        kml += '  </Placemark>\n';
      });
    });

    kml += '</Document>\n</kml>';
    return kml;
  }
};
