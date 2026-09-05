/**
 * AGROLINHAS PRO - SHAPEFILE (.SHP) & NHP (TOPCON/STARA) HANDLER
 * Suporte completo a Importação e Exportação de arquivos ESRI Shapefile (.shp.zip) e NHP.
 */

export const ShapefileHandler = {

  /**
   * Converte texto de arquivo NHP (Topcon/Stara/AgLeader) para GeoJSON Polygon / LineString
   * @param {string} nhpText
   * @returns {object} GeoJSON Feature ou FeatureCollection
   */
  parseNHP(nhpText) {
    if (!nhpText || typeof nhpText !== 'string') {
      throw new Error('Conteúdo do arquivo NHP inválido ou vazio.');
    }

    const lines = nhpText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const boundaryCoords = [];
    const abLineCoords = [];
    let currentSection = null;
    let fieldName = 'Talhao_NHP';

    for (const line of lines) {
      if (line.startsWith('[HEADER]') || line.startsWith('[INFO]')) {
        currentSection = 'HEADER';
        continue;
      } else if (line.startsWith('[BOUNDARY]') || line.startsWith('[LIMITE]')) {
        currentSection = 'BOUNDARY';
        continue;
      } else if (line.startsWith('[LINE_AB]') || line.startsWith('[AB_LINE]')) {
        currentSection = 'LINE_AB';
        continue;
      } else if (line.startsWith('[')) {
        currentSection = 'OTHER';
        continue;
      }

      if (line.includes('FIELD_NAME=') || line.includes('NOME_TALHAO=')) {
        const parts = line.split('=');
        if (parts[1]) fieldName = parts[1].trim();
      }

      // Processa coordenadas
      const parts = line.split(/[,;\s\t]+/).map(p => parseFloat(p)).filter(p => !isNaN(p));
      if (parts.length >= 2) {
        // Formato NHP comum: Lat, Lon ou Lon, Lat, Elev
        let lat = parts[0], lon = parts[1];
        if (Math.abs(lat) > 180 || Math.abs(lon) > 90) {
          // Se ordem for Lon, Lat
          lon = parts[0];
          lat = parts[1];
        }
        
        // Inverte se lat estiver na faixa de longitude
        if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
          const tmp = lat; lat = lon; lon = tmp;
        }

        if (currentSection === 'BOUNDARY') {
          boundaryCoords.push([lon, lat]);
        } else if (currentSection === 'LINE_AB') {
          abLineCoords.push([lon, lat]);
        } else {
          // Se não souber a seção mas tiver pares válidos
          boundaryCoords.push([lon, lat]);
        }
      }
    }

    if (boundaryCoords.length < 3 && abLineCoords.length < 2) {
      throw new Error('Não foram encontradas coordenadas válidas de limite ou linha A-B no arquivo NHP.');
    }

    const features = [];

    if (boundaryCoords.length >= 3) {
      // Assegura anel fechado
      const first = boundaryCoords[0];
      const last = boundaryCoords[boundaryCoords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        boundaryCoords.push([first[0], first[1]]);
      }
      features.push({
        type: 'Feature',
        properties: { name: fieldName, type: 'boundary' },
        geometry: { type: 'Polygon', coordinates: [boundaryCoords] }
      });
    }

    if (abLineCoords.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { name: `${fieldName}_Linha_AB`, type: 'ab_line' },
        geometry: { type: 'LineString', coordinates: abLineCoords }
      });
    }

    if (features.length === 1) return features[0];
    return { type: 'FeatureCollection', features };
  },

  /**
   * Exporta linhas de plantio e limite do talhão para o formato NHP (Monitores Topcon, Stara, AgLeader)
   */
  exportToNHP(lastResult, fieldPolygonGeoJSON, fieldName = 'Talhao') {
    let nhp = `; AGROLINHAS PRO - NHP GUIDANCE & BOUNDARY FILE\n`;
    nhp += `; Exportado em: ${new Date().toISOString()}\n\n`;
    nhp += `[HEADER]\n`;
    nhp += `FIELD_NAME=${fieldName}\n`;
    nhp += `CREATOR=AgroLinhas Pro v2.5.0\n`;
    nhp += `UNIT=METRIC\n\n`;

    // Limite do Talhão
    if (fieldPolygonGeoJSON) {
      const geom = fieldPolygonGeoJSON.geometry || fieldPolygonGeoJSON;
      const ring = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
      if (ring && ring.length > 0) {
        nhp += `[BOUNDARY]\n`;
        nhp += `; Lat, Lon, Elev\n`;
        ring.forEach(c => {
          nhp += `${c[1].toFixed(8)}, ${c[0].toFixed(8)}, 0.00\n`;
        });
        nhp += `\n`;
      }
    }

    // Linha-Guia Mestre A-B
    if (lastResult && lastResult.guideLineCoords && lastResult.guideLineCoords.length >= 2) {
      nhp += `[LINE_AB]\n`;
      nhp += `; Lat, Lon\n`;
      lastResult.guideLineCoords.forEach(c => {
        nhp += `${c[1].toFixed(8)}, ${c[0].toFixed(8)}\n`;
      });
      nhp += `\n`;
    }

    // Passadas de Plantio
    if (lastResult && lastResult.plantingSegments && lastResult.plantingSegments.length > 0) {
      nhp += `[PASSES]\n`;
      lastResult.plantingSegments.forEach((seg, idx) => {
        nhp += `; Passada ${idx + 1}\n`;
        seg.forEach(c => {
          nhp += `${c[1].toFixed(8)}, ${c[0].toFixed(8)}\n`;
        });
      });
    }

    return nhp;
  },

  /**
   * Converte GeoJSON / Linhas de Plantio para ESRI Shapefile (.shp, .dbf, .shx, .prj) dentro de um arquivo ZIP
   * @param {object} geojson - Feature ou FeatureCollection GeoJSON
   * @param {string} fieldName
   * @returns {Promise<Blob>} Arquivo ZIP pronto para download contendo o Shapefile
   */
  async exportToShapefileZip(geojson, fieldName = 'Talhao_AgroLinhas') {
    if (typeof JSZip === 'undefined') {
      throw new Error('Biblioteca JSZip necessária para gerar arquivos Shapefile (.zip).');
    }

    const zip = new JSZip();
    const folderName = fieldName.replace(/[^a-zA-Z0-9_-]/g, '_');

    // PRJ Standard WGS84
    const prjContent = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
    zip.file(`${folderName}.prj`, prjContent);

    // Converte a geometria GeoJSON para Shapefile binário nativo
    const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
    const isPolygon = features.some(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
    const shapeType = isPolygon ? 5 : 3; // 5 = Polygon, 3 = PolyLine

    const shpBuffer = this._buildShpBinary(features, shapeType);
    const dbfBuffer = this._buildDbfBinary(features);
    const shxBuffer = this._buildShxBinary(features, shapeType);

    zip.file(`${folderName}.shp`, shpBuffer);
    zip.file(`${folderName}.dbf`, dbfBuffer);
    zip.file(`${folderName}.shx`, shxBuffer);

    return await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  },

  /**
   * Parser universal para arquivos Shapefile em Zip (usando shpjs se disponível ou parser nativo)
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<object>} GeoJSON
   */
  async parseShapefileZipBuffer(arrayBuffer) {
    if (typeof shp !== 'undefined') {
      // shpjs do CDN unpkg/cdnjs
      const res = await shp(arrayBuffer);
      if (Array.isArray(res)) {
        return { type: 'FeatureCollection', features: res.flatMap(r => r.features || [r]) };
      }
      return res;
    }

    // Se shpjs não estiver carregado, abre com JSZip e faz parse do .shp
    if (typeof JSZip !== 'undefined') {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const shpFileKey = Object.keys(zip.files).find(k => k.toLowerCase().endsWith('.shp'));
      if (!shpFileKey) {
        throw new Error('Nenhum arquivo .shp encontrado dentro do pacote ZIP.');
      }
      const shpBuf = await zip.files[shpFileKey].async('arraybuffer');
      return this._parseRawShpBuffer(shpBuf);
    }

    throw new Error('Nenhuma biblioteca de descompactação Shapefile (.zip) encontrada.');
  },

  /**
   * Parser binário nativo de arquivo .shp
   * @private
   */
  _parseRawShpBuffer(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const fileCode = view.getInt32(0, false); // Big endian
    if (fileCode !== 9994) {
      throw new Error('Arquivo .shp inválido (código de cabeçalho incorreto).');
    }

    const shapeType = view.getInt32(32, true); // Little endian (3=PolyLine, 5=Polygon)
    let offset = 100; // Cabeçalho tem 100 bytes
    const features = [];

    while (offset < arrayBuffer.byteLength) {
      if (offset + 8 > arrayBuffer.byteLength) break;
      const recNum = view.getInt32(offset, false);
      const recLength = view.getInt32(offset + 4, false) * 2; // em bytes
      offset += 8;

      if (recLength <= 0 || offset + recLength > arrayBuffer.byteLength) break;

      const recShapeType = view.getInt32(offset, true);
      if (recShapeType === 0) {
        // Null shape
        offset += recLength;
        continue;
      }

      if (recShapeType === 3 || recShapeType === 5) {
        // PolyLine or Polygon
        const numParts = view.getInt32(offset + 36, true);
        const numPoints = view.getInt32(offset + 40, true);
        
        let partOffset = offset + 44;
        const parts = [];
        for (let i = 0; i < numParts; i++) {
          parts.push(view.getInt32(partOffset + i * 4, true));
        }

        let ptsOffset = partOffset + numParts * 4;
        const allPoints = [];
        for (let i = 0; i < numPoints; i++) {
          const x = view.getFloat64(ptsOffset + i * 16, true);
          const y = view.getFloat64(ptsOffset + i * 16 + 8, true);
          allPoints.push([x, y]);
        }

        const rings = [];
        for (let i = 0; i < numParts; i++) {
          const startIdx = parts[i];
          const endIdx = (i < numParts - 1) ? parts[i + 1] : numPoints;
          rings.push(allPoints.slice(startIdx, endIdx));
        }

        if (recShapeType === 5) {
          features.push({
            type: 'Feature',
            properties: { id: recNum },
            geometry: { type: 'Polygon', coordinates: rings }
          });
        } else {
          features.push({
            type: 'Feature',
            properties: { id: recNum },
            geometry: { type: 'MultiLineString', coordinates: rings }
          });
        }
      }

      offset += recLength;
    }

    if (features.length === 0) throw new Error('Nenhuma geometria válida lida do arquivo .shp');
    if (features.length === 1) return features[0];
    return { type: 'FeatureCollection', features };
  },

  /**
   * Construtor de buffer .shp binário
   * @private
   */
  _buildShpBinary(features, shapeType) {
    // Calcula bboxes e tamanhos de registros
    let totalBytes = 100;
    const recordBuffers = [];

    let globalMinX = Infinity, globalMinY = Infinity, globalMaxX = -Infinity, globalMaxY = -Infinity;

    features.forEach((feat, idx) => {
      const geom = feat.geometry || feat;
      let rings = [];

      if (geom.type === 'Polygon') rings = geom.coordinates;
      else if (geom.type === 'MultiPolygon') rings = geom.coordinates.flat(1);
      else if (geom.type === 'LineString') rings = [geom.coordinates];
      else if (geom.type === 'MultiLineString') rings = geom.coordinates;

      if (!rings || rings.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let totalPts = 0;

      rings.forEach(r => {
        r.forEach(pt => {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
          totalPts++;
        });
      });

      if (minX < globalMinX) globalMinX = minX;
      if (maxX > globalMaxX) globalMaxX = maxX;
      if (minY < globalMinY) globalMinY = minY;
      if (maxY > globalMaxY) globalMaxY = maxY;

      const numParts = rings.length;
      const recContentLen = 44 + (numParts * 4) + (totalPts * 16); // bytes
      totalBytes += 8 + recContentLen;

      recordBuffers.push({
        recNum: idx + 1,
        recContentLen,
        shapeType,
        minX, minY, maxX, maxY,
        numParts,
        totalPts,
        rings
      });
    });

    if (globalMinX === Infinity) { globalMinX = 0; globalMinY = 0; globalMaxX = 0; globalMaxY = 0; }

    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);

    // Cabeçalho de 100 bytes
    view.setInt32(0, 9994, false); // File code
    view.setInt32(24, totalBytes / 2, false); // File length (16-bit words)
    view.setInt32(28, 1000, true); // Version
    view.setInt32(32, shapeType, true); // Shape type
    view.setFloat64(36, globalMinX, true);
    view.setFloat64(44, globalMinY, true);
    view.setFloat64(52, globalMaxX, true);
    view.setFloat64(60, globalMaxY, true);

    let offset = 100;

    recordBuffers.forEach(rec => {
      view.setInt32(offset, rec.recNum, false);
      view.setInt32(offset + 4, rec.recContentLen / 2, false);
      offset += 8;

      view.setInt32(offset, rec.shapeType, true);
      view.setFloat64(offset + 4, rec.minX, true);
      view.setFloat64(offset + 12, rec.minY, true);
      view.setFloat64(offset + 20, rec.maxX, true);
      view.setFloat64(offset + 28, rec.maxY, true);
      view.setInt32(offset + 36, rec.numParts, true);
      view.setInt32(offset + 40, rec.totalPts, true);

      let partOffset = offset + 44;
      let ptOffset = partOffset + (rec.numParts * 4);
      let ptCount = 0;

      rec.rings.forEach((ring, pIdx) => {
        view.setInt32(partOffset + pIdx * 4, ptCount, true);
        ring.forEach(pt => {
          view.setFloat64(ptOffset, pt[0], true);
          view.setFloat64(ptOffset + 8, pt[1], true);
          ptOffset += 16;
          ptCount++;
        });
      });

      offset += rec.recContentLen;
    });

    return buffer;
  },

  /**
   * Construtor de buffer .shx binário (índice)
   * @private
   */
  _buildShxBinary(features, shapeType) {
    const numRecs = features.length;
    const totalBytes = 100 + (numRecs * 8);
    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);

    view.setInt32(0, 9994, false);
    view.setInt32(24, totalBytes / 2, false);
    view.setInt32(28, 1000, true);
    view.setInt32(32, shapeType, true);

    let currentShpOffset = 100;

    features.forEach((feat, i) => {
      const geom = feat.geometry || feat;
      let rings = [];

      if (geom.type === 'Polygon') rings = geom.coordinates;
      else if (geom.type === 'MultiPolygon') rings = geom.coordinates.flat(1);
      else if (geom.type === 'LineString') rings = [geom.coordinates];
      else if (geom.type === 'MultiLineString') rings = geom.coordinates;

      let totalPts = 0;
      rings.forEach(r => totalPts += r.length);
      const recContentLen = 44 + (rings.length * 4) + (totalPts * 16);

      view.setInt32(100 + i * 8, currentShpOffset / 2, false);
      view.setInt32(100 + i * 8 + 4, recContentLen / 2, false);

      currentShpOffset += 8 + recContentLen;
    });

    return buffer;
  },

  /**
   * Construtor de buffer .dbf (dBASE III) binário
   * @private
   */
  _buildDbfBinary(features) {
    const numRecords = features.length;
    const headerBytes = 32 + 32 + 1; // Header + 1 Field (NAME, C, 50) + Header Terminator (0x0D)
    const recordBytes = 51; // 1 byte deletion flag + 50 bytes text
    const totalBytes = headerBytes + (numRecords * recordBytes) + 1; // + 1 EOF (0x1A)

    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    view.setUint8(0, 0x03); // dBASE III
    const now = new Date();
    view.setUint8(1, now.getFullYear() - 2000);
    view.setUint8(2, now.getMonth() + 1);
    view.setUint8(3, now.getDate());
    view.setUint32(4, numRecords, true);
    view.setUint16(8, headerBytes, true);
    view.setUint16(10, recordBytes, true);

    // Campo: NAME (Character, 50 bytes)
    const fieldNameStr = 'NAME';
    for (let i = 0; i < fieldNameStr.length; i++) {
      bytes[32 + i] = fieldNameStr.charCodeAt(i);
    }
    bytes[32 + 11] = 0x43; // Type 'C'
    bytes[32 + 16] = 50;   // Length 50

    bytes[64] = 0x0D; // Fim dos cabeçalhos de campos

    let offset = headerBytes;
    features.forEach((feat, idx) => {
      bytes[offset] = 0x20; // 0x20 = válido (não deletado)
      const nameVal = (feat.properties && feat.properties.name) || `Linha_${idx + 1}`;
      const encoder = new TextEncoder();
      const encoded = encoder.encode(nameVal.slice(0, 50));
      for (let i = 0; i < 50; i++) {
        bytes[offset + 1 + i] = (i < encoded.length) ? encoded[i] : 0x20;
      }
      offset += recordBytes;
    });

    bytes[totalBytes - 1] = 0x1A; // EOF
    return buffer;
  }
};
