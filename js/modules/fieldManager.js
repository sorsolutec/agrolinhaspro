/**
 * AGROLINHAS PRO - FARM & FIELD MANAGEMENT SERVICE
 */
export const FieldManager = {
  STORAGE_KEY: 'agrolinhas_pro_fields',

  demoFields: [
    {
      id: 'demo-1',
      name: 'Talhão Soja - Gleba 01',
      farm: 'Fazenda Santa Fé',
      crop: 'Soja',
      areaHa: 18.5,
      date: '28/08/2026',
      polygon: {
        type: 'Feature',
        properties: { name: 'Talhão Soja - Gleba 01' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-55.5120, -12.8050],
            [-55.5030, -12.8070],
            [-55.5010, -12.8150],
            [-55.5110, -12.8170],
            [-55.5150, -12.8100],
            [-55.5120, -12.8050]
          ]]
        }
      }
    },
    {
      id: 'demo-2',
      name: 'Talhão Topografia - Curvas',
      farm: 'Fazenda Santa Fé',
      crop: 'Milho Safrinha',
      areaHa: 32.0,
      date: '28/08/2026',
      polygon: {
        type: 'Feature',
        properties: { name: 'Talhão Topografia - Curvas' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-55.5350, -12.7900],
            [-55.5200, -12.7920],
            [-55.5180, -12.8040],
            [-55.5270, -12.8090],
            [-55.5390, -12.8010],
            [-55.5350, -12.7900]
          ]]
        }
      }
    }
  ],

  getAll() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) {
      this.saveList(this.demoFields);
      return this.demoFields;
    }
    try {
      return JSON.parse(saved);
    } catch(e) {
      return this.demoFields;
    }
  },

  saveList(list) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  },

  add(field) {
    const list = this.getAll();
    list.unshift(field);
    this.saveList(list);
    return list;
  },

  remove(id) {
    let list = this.getAll();
    list = list.filter(f => f.id !== id);
    this.saveList(list);
    return list;
  }
};
