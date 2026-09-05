/**
 * AGROLINHAS PRO - SECTION CONTROL & AS-APPLIED COVERAGE ENGINE
 */
export const SectionEngine = {

  appliedPolygons: [],
  totalAvoidedOverlapM2: 0,

  reset() {
    this.appliedPolygons = [];
    this.totalAvoidedOverlapM2 = 0;
  },

  /**
   * Evaluates section status and records coverage footprints
   */
  processSections({
    position,       // [lng, lat]
    heading,        // degrees
    speedKmH,       // km/h
    implementWidth, // meters
    numSections,    // integer (2-16)
    autoControl,    // boolean
    fieldPolygon    // GeoJSON Polygon
  }) {
    if (!fieldPolygon) return { sectionStates: [], newPolygons: [], avoidedOverlapM2: 0 };

    const secW = implementWidth / numSections;
    const rad = (heading) * Math.PI / 180;
    const perpRad = rad + Math.PI / 2;
    const stepDistM = Math.max(1.5, (speedKmH * 1000 / 3600) * 0.4);

    const sectionStates = new Array(numSections).fill(true);
    const newPolygons = [];
    let avoidedM2ThisStep = 0;

    for (let s = 0; s < numSections; s++) {
      const offsetM = - (implementWidth / 2) + (s * secW) + (secW / 2);
      const dx = Math.sin(perpRad) * (offsetM / 111320);
      const dy = Math.cos(perpRad) * (offsetM / 110540);
      const secCenter = [position[0] + dx, position[1] + dy];

      let isInside = true;
      try {
        isInside = turf.booleanPointInPolygon(turf.point(secCenter), fieldPolygon);
      } catch(e) { isInside = false; }

      let isOverlap = false;
      if (autoControl && this.appliedPolygons.length > 5) {
        const checkIdx = Math.max(0, this.appliedPolygons.length - 200);
        for (let j = 0; j < checkIdx; j += 4) {
          const prevPoly = this.appliedPolygons[j];
          try {
            if (turf.booleanPointInPolygon(turf.point(secCenter), prevPoly)) {
              isOverlap = true;
              avoidedM2ThisStep += secW * stepDistM;
              break;
            }
          } catch(e) {}
        }
      }

      if (!isInside || isOverlap) {
        sectionStates[s] = false;
      } else {
        sectionStates[s] = true;

        const fdx = Math.sin(rad) * (stepDistM / 111320);
        const fdy = Math.cos(rad) * (stepDistM / 110540);
        const hW = secW / 2;
        const p1 = [secCenter[0] - Math.sin(perpRad)*(hW/111320), secCenter[1] - Math.cos(perpRad)*(hW/110540)];
        const p2 = [secCenter[0] + Math.sin(perpRad)*(hW/111320), secCenter[1] + Math.cos(perpRad)*(hW/110540)];
        const p3 = [p2[0] + fdx, p2[1] + fdy];
        const p4 = [p1[0] + fdx, p1[1] + fdy];

        const secPoly = turf.polygon([[p1, p2, p3, p4, p1]]);
        this.appliedPolygons.push(secPoly);
        newPolygons.push([p1, p2, p3, p4]);
      }
    }

    this.totalAvoidedOverlapM2 += avoidedM2ThisStep;

    return {
      sectionStates,
      newPolygons,
      avoidedOverlapM2: avoidedM2ThisStep
    };
  },

  getMetrics(fieldPolygon, implementWidth, numSections) {
    if (!fieldPolygon) return { appliedHa: 0, progressPercent: 0, avoidedHa: 0, savingsEstimateR$: 0 };
    const totalFieldHa = turf.area(fieldPolygon) / 10000;
    const appliedHa = (this.appliedPolygons.length * (implementWidth / numSections) * 2) / 10000;
    const avoidedHa = this.totalAvoidedOverlapM2 / 10000;
    const progress = Math.min(100, totalFieldHa > 0 ? (appliedHa / totalFieldHa) * 100 : 0);
    const savings = Math.round(avoidedHa * 450); // R$450/ha de economia média de insumos

    return {
      appliedHa: parseFloat(appliedHa.toFixed(2)),
      progressPercent: parseFloat(progress.toFixed(1)),
      avoidedHa: parseFloat(avoidedHa.toFixed(2)),
      savingsEstimateR$: savings
    };
  }
};
