/**
 * AGROLINHAS PRO - AGRONOMIC CALCULATOR & WORK ORDER SERVICE
 */
export const WorkOrderService = {

  calculateInputs({
    areaHa,
    crop = 'Soja',
    seedsPerHa = 280000,
    seedsPerSack = 50000,
    fertilizerKgHa = 350,
    dieselLHa = 5.5
  }) {
    const totalSacks = Math.ceil((areaHa * seedsPerHa) / seedsPerSack);
    const totalFertilizerKg = areaHa * fertilizerKgHa;
    const totalFertilizerBags = (totalFertilizerKg / 1000).toFixed(1);
    const totalDieselL = Math.round(areaHa * dieselLHa);
    const estimatedCostR$ = Math.round((totalDieselL * 6.20) + (areaHa * 180));

    return {
      totalSacks,
      totalFertilizerKg,
      totalFertilizerBags,
      totalDieselL,
      estimatedCostR$
    };
  },

  generateTextReport(data) {
    return `AGROLINHAS PRO - ORDEM DE SERVIÇO DE PLANTIO
Data de Emissão: ${data.date}
Fazenda: ${data.farm}
Talhão: ${data.fieldName}
Cultura: ${data.crop}
Operador / Maquinário: ${data.operator} / ${data.machine}
------------------------------------------------------------
ESPECIFICAÇÕES TÉCNICAS DO TALHÃO:
- Área Total: ${data.areaHa} ha (${(data.areaHa/2.42).toFixed(2)} Alqueires SP)
- Total de Passadas: ${data.linesCount} passadas
- Distância Total: ${data.totalKm} km
- Largura Útil: ${data.implementWidth} m (${data.numSections} Seções)
- Rumo / Azimute: ${data.headingDeg}°
- Tempo Estimado: ${data.estTime}
------------------------------------------------------------
RELAÇÃO DE INSUMOS & RECOMENDAÇÃO:
- Sementes: ${data.seedSacks} sacas
- Adubação de Base: ${data.fertilizerBags} Bags (1.000 kg)
- Diesel Estimado: ${data.dieselL} Litros
- Custo Operacional Estimado: R$ ${data.costEst.toLocaleString('pt-BR')}
------------------------------------------------------------
Assinatura Resp. Técnico (CREA): ________________________
Assinatura do Operador:         ________________________
`;
  }
};
