/**
 * AGROLINHAS PRO - BANCO DE EQUIPAMENTOS & MACHINERY MANAGER
 * Gestão técnica de maquinários agrícolas, distribuidores de calcário/fertilizante,
 * plantadeiras, pulverizadores e tratores conforme banco_equipamentos_agricolas.xlsx.
 */
export const FleetManager = {
  STORAGE_KEY: 'agrolinhas_pro_equipment_v2',

  defaultMachines: [
    {
      id: 'eq-jan-lancer-10000',
      category: 'Distribuidor de Calcario/Fertilizante',
      brand: 'Jan',
      model: 'Lancer Magnu 10000',
      name: 'Distribuidor Lancer Magnu 10000 - Jan',
      implement: 'Distribuidor Lancer Magnu 10000',
      couplingSystem: 'Barra de tracao',
      capacityLiters: 10000,
      maxPayloadKg: 15000,
      requiredPowerHp: 130,
      widthMeters: 36.0,
      distributionWidthM: 36.0,
      ptoSpeedRpm: 540,
      diskSpeedRpm: 828,
      dimensions: {
        heightMm: 2696,
        widthMm: 3197,
        lengthMm: 7170
      },
      emptyWeightKg: 4040,
      wheelTrackMm: 2552,
      groundClearanceMm: 450,
      notes: 'Aplicacao de calcario umido ou seco, gesso, sementes, fertilizantes organicos, cama de aviario, casca de cafe. Fertilizantes granulares e sementes quando montada com esteira inox (opcional).',
      sourceUrl: 'https://www.jan.com.br/modelo/204/distribuicao/acoplado-pela-barra-de-tracao/lancer-magnu/10000-inox',
      registeredDate: '2026-09-05',
      numSections: 2,
      defaultSpeedKmH: 12.0,
      rowSpacingM: 0.45,
      active: true
    },
    {
      id: 'eq-jd-exactemerge-24l',
      category: 'Semeadora/Plantadeira',
      brand: 'John Deere',
      model: 'DB ExactEmerge 24L',
      name: 'Plantadeira DB ExactEmerge 24L - John Deere',
      implement: 'Plantadeira DB ExactEmerge 24L',
      couplingSystem: 'Barra de tracao',
      capacityLiters: 4200,
      maxPayloadKg: 6500,
      requiredPowerHp: 270,
      widthMeters: 12.0,
      distributionWidthM: 12.0,
      ptoSpeedRpm: 1000,
      diskSpeedRpm: null,
      dimensions: {
        heightMm: 3600,
        widthMm: 4200,
        lengthMm: 9800
      },
      emptyWeightKg: 11200,
      wheelTrackMm: 3000,
      groundClearanceMm: 500,
      notes: 'Plantadeira de alta precisao e velocidade (ate 16 km/h) com dosador eletrico ExactEmerge e corte individual de linhas.',
      sourceUrl: 'https://www.deere.com.br',
      registeredDate: '2026-09-05',
      numSections: 8,
      defaultSpeedKmH: 7.5,
      rowSpacingM: 0.45,
      active: false
    },
    {
      id: 'eq-fendt-momentum-30l',
      category: 'Semeadora/Plantadeira',
      brand: 'Fendt',
      model: 'Momentum 30L',
      name: 'Plantadeira Momentum 30L - Fendt',
      implement: 'Plantadeira Momentum 30L',
      couplingSystem: 'Barra de tracao',
      capacityLiters: 5300,
      maxPayloadKg: 7500,
      requiredPowerHp: 350,
      widthMeters: 15.0,
      distributionWidthM: 15.0,
      ptoSpeedRpm: 1000,
      diskSpeedRpm: null,
      dimensions: {
        heightMm: 3900,
        widthMm: 4500,
        lengthMm: 11000
      },
      emptyWeightKg: 14500,
      wheelTrackMm: 3200,
      groundClearanceMm: 520,
      notes: 'Sistema Smart Frame com auto-compensacao de terreno e fertilizacao sulco a sulco.',
      sourceUrl: 'https://www.fendt.com.br',
      registeredDate: '2026-09-05',
      numSections: 12,
      defaultSpeedKmH: 7.0,
      rowSpacingM: 0.50,
      active: false
    },
    {
      id: 'eq-jacto-uniport-3030',
      category: 'Pulverizador',
      brand: 'Jacto',
      model: 'Uniport 3030',
      name: 'Pulverizador Uniport 3030 - Jacto',
      implement: 'Barra de Pulverização 36m',
      couplingSystem: 'Autopropelido',
      capacityLiters: 3000,
      maxPayloadKg: 4500,
      requiredPowerHp: 243,
      widthMeters: 36.0,
      distributionWidthM: 36.0,
      ptoSpeedRpm: null,
      diskSpeedRpm: null,
      dimensions: {
        heightMm: 3950,
        widthMm: 3200,
        lengthMm: 8650
      },
      emptyWeightKg: 9950,
      wheelTrackMm: 2800,
      groundClearanceMm: 1550,
      notes: 'Pulverizador autopropelido com controle bico a bico, recirculacao continua e telemetria Otmis.',
      sourceUrl: 'https://www.jacto.com/brasil',
      registeredDate: '2026-09-05',
      numSections: 16,
      defaultSpeedKmH: 16.0,
      rowSpacingM: 0.45,
      active: false
    },
    {
      id: 'eq-stara-hercules-10000',
      category: 'Distribuidor de Calcario/Fertilizante',
      brand: 'Stara',
      model: 'Hércules 10000',
      name: 'Distribuidor Hércules 10000 - Stara',
      implement: 'Distribuidor Hércules 10000',
      couplingSystem: 'Barra de tracao',
      capacityLiters: 10000,
      maxPayloadKg: 15000,
      requiredPowerHp: 140,
      widthMeters: 36.0,
      distributionWidthM: 36.0,
      ptoSpeedRpm: 540,
      diskSpeedRpm: 850,
      dimensions: {
        heightMm: 2750,
        widthMm: 3150,
        lengthMm: 7200
      },
      emptyWeightKg: 4200,
      wheelTrackMm: 2500,
      groundClearanceMm: 460,
      notes: 'Distribuicao a lanco com esteira modulada de borracha e comporta dupla com taxa variavel.',
      sourceUrl: 'https://stara.com.br',
      registeredDate: '2026-09-05',
      numSections: 2,
      defaultSpeedKmH: 12.0,
      rowSpacingM: 0.45,
      active: false
    },
    {
      id: 'eq-jumil-terraco-13l',
      category: 'Semeadora/Plantadeira',
      brand: 'Jumil',
      model: 'PAP 2980 Terraço 13L',
      name: 'Semeadora Terraço 2980 13L - Jumil',
      implement: 'Semeadora Terraço 13L',
      couplingSystem: 'Barra de tracao',
      capacityLiters: 1600,
      maxPayloadKg: 2800,
      requiredPowerHp: 110,
      widthMeters: 5.85,
      distributionWidthM: 5.85,
      ptoSpeedRpm: 540,
      diskSpeedRpm: null,
      dimensions: {
        heightMm: 2400,
        widthMm: 6200,
        lengthMm: 4800
      },
      emptyWeightKg: 4100,
      wheelTrackMm: 2400,
      groundClearanceMm: 400,
      notes: 'Plantadeira articulada compacta com sistema pantografico para terrenos terraceados.',
      sourceUrl: 'https://www.jumil.com.br',
      registeredDate: '2026-09-05',
      numSections: 4,
      defaultSpeedKmH: 6.5,
      rowSpacingM: 0.45,
      active: false
    }
  ],

  getAll() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) {
      this.saveList(this.defaultMachines);
      return this.defaultMachines;
    }
    try {
      const list = JSON.parse(saved);
      if (!Array.isArray(list) || list.length === 0) {
        this.saveList(this.defaultMachines);
        return this.defaultMachines;
      }
      return list;
    } catch(e) {
      return this.defaultMachines;
    }
  },

  saveList(list) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  },

  getActive() {
    const list = this.getAll();
    return list.find(m => m.active) || list[0];
  },

  getById(id) {
    return this.getAll().find(m => m.id === id);
  },

  setActive(id) {
    const list = this.getAll().map(m => ({
      ...m,
      active: m.id === id
    }));
    this.saveList(list);
    return list;
  },

  add(equipment) {
    const list = this.getAll();
    const id = equipment.id || 'eq-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
    const newEq = {
      id,
      category: equipment.category || 'Outros',
      brand: equipment.brand || 'Personalizado',
      model: equipment.model || 'Modelo Padrão',
      name: equipment.name || `${equipment.model || 'Equipamento'} - ${equipment.brand || 'Custom'}`,
      implement: equipment.implement || equipment.name || equipment.model,
      couplingSystem: equipment.couplingSystem || 'Barra de tração',
      capacityLiters: parseFloat(equipment.capacityLiters) || null,
      maxPayloadKg: parseFloat(equipment.maxPayloadKg) || null,
      requiredPowerHp: parseFloat(equipment.requiredPowerHp) || null,
      widthMeters: parseFloat(equipment.widthMeters || equipment.distributionWidthM) || 12.0,
      distributionWidthM: parseFloat(equipment.distributionWidthM || equipment.widthMeters) || 12.0,
      ptoSpeedRpm: parseFloat(equipment.ptoSpeedRpm) || null,
      diskSpeedRpm: parseFloat(equipment.diskSpeedRpm) || null,
      dimensions: equipment.dimensions || {
        heightMm: parseFloat(equipment.heightMm) || null,
        widthMm: parseFloat(equipment.widthMm) || null,
        lengthMm: parseFloat(equipment.lengthMm) || null
      },
      emptyWeightKg: parseFloat(equipment.emptyWeightKg) || null,
      wheelTrackMm: parseFloat(equipment.wheelTrackMm) || null,
      groundClearanceMm: parseFloat(equipment.groundClearanceMm) || null,
      notes: equipment.notes || '',
      sourceUrl: equipment.sourceUrl || '',
      registeredDate: equipment.registeredDate || new Date().toISOString().split('T')[0],
      numSections: parseInt(equipment.numSections, 10) || 8,
      defaultSpeedKmH: parseFloat(equipment.defaultSpeedKmH) || 8.0,
      rowSpacingM: parseFloat(equipment.rowSpacingM) || 0.45,
      active: false
    };

    list.push(newEq);
    this.saveList(list);
    return newEq;
  },

  update(id, updatedData) {
    const list = this.getAll().map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        ...updatedData,
        id: m.id,
        active: m.active
      };
    });
    this.saveList(list);
    return list;
  },

  delete(id) {
    let list = this.getAll().filter(m => m.id !== id);
    if (list.length === 0) {
      list = [...this.defaultMachines];
    }
    if (!list.some(m => m.active)) {
      list[0].active = true;
    }
    this.saveList(list);
    return list;
  },

  resetDefaults() {
    this.saveList(this.defaultMachines);
    return this.defaultMachines;
  },

  /**
   * Importa linhas de objetos ou matrizes de planilha (ex: do XLSX)
   */
  importFromRawObjects(rawList) {
    if (!Array.isArray(rawList) || rawList.length === 0) return 0;
    const currentList = this.getAll();
    let addedCount = 0;

    rawList.forEach((row, idx) => {
      // Identificar colunas tanto por chave exata quanto por variações
      const category = row['Categoria'] || row.category || 'Outros';
      const brand = row['Marca'] || row.brand || '';
      const model = row['Modelo'] || row.model || '';
      const name = row['Nome Completo'] || row.name || (model ? `${model} - ${brand}` : `Equipamento ${idx + 1}`);
      const width = parseFloat(row['Largura de Distribuicao (m)'] || row['Largura de Distribuição (m)'] || row['Largura (m)'] || row.widthMeters || row.distributionWidthM) || 12.0;

      // Pular linhas de cabeçalho ou exemplo (ex: que começam com "(ex:)")
      if (category.startsWith('(ex:') || brand.startsWith('(ex:')) return;

      const newId = 'eq-imp-' + Date.now().toString(36) + '-' + idx;
      const eq = {
        id: newId,
        category,
        brand,
        model,
        name,
        implement: name,
        couplingSystem: row['Sistema de Acoplamento'] || row.couplingSystem || 'Barra de tração',
        capacityLiters: parseFloat(row['Capacidade Volumetrica (L)'] || row['Capacidade Volumétrica (L)'] || row.capacityLiters) || null,
        maxPayloadKg: parseFloat(row['Capacidade Maxima de Carga (kg)'] || row['Capacidade Máxima de Carga (kg)'] || row.maxPayloadKg) || null,
        requiredPowerHp: parseFloat(row['Potencia Requerida (CV)'] || row['Potência Requerida (CV)'] || row.requiredPowerHp) || null,
        widthMeters: width,
        distributionWidthM: width,
        ptoSpeedRpm: parseFloat(row['Rotacao TDP (rpm)'] || row['Rotação TDP (rpm)'] || row.ptoSpeedRpm) || null,
        diskSpeedRpm: parseFloat(row['Rotacao dos Discos (rpm)'] || row['Rotação dos Discos (rpm)'] || row.diskSpeedRpm) || null,
        dimensions: {
          heightMm: parseFloat(row['Altura (mm)'] || (row.dimensions && row.dimensions.heightMm)) || null,
          widthMm: parseFloat(row['Largura (mm)'] || (row.dimensions && row.dimensions.widthMm)) || null,
          lengthMm: parseFloat(row['Comprimento (mm)'] || (row.dimensions && row.dimensions.lengthMm)) || null
        },
        emptyWeightKg: parseFloat(row['Peso Vazio (kg)'] || row.emptyWeightKg) || null,
        wheelTrackMm: parseFloat(row['Bitola (mm)'] || row.wheelTrackMm) || null,
        groundClearanceMm: parseFloat(row['Vao Livre sob Eixo (mm)'] || row['Vão Livre sob Eixo (mm)'] || row.groundClearanceMm) || null,
        notes: row['Observacoes / Aplicacao'] || row['Observações / Aplicação'] || row.notes || '',
        sourceUrl: row['Fonte'] || row.sourceUrl || '',
        registeredDate: row['Data Cadastro'] || row.registeredDate || new Date().toISOString().split('T')[0],
        numSections: width >= 30 ? 16 : (width >= 15 ? 12 : 8),
        defaultSpeedKmH: width >= 24 ? 12.0 : 7.0,
        rowSpacingM: 0.45,
        active: false
      };

      currentList.push(eq);
      addedCount++;
    });

    if (addedCount > 0) {
      this.saveList(currentList);
    }
    return addedCount;
  }
};
