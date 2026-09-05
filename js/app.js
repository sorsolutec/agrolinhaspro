/**
 * AGROLINHAS PRO - MASTER APPLICATION COORDINATOR & SPA ROUTER
 * Integração completa com Estação GIS, Delimitação Intuitiva de Área Aberta x Fechada (APP/Mata),
 * Topografia DEM Real (Copernicus) & RTK CSV com Proj4, Navegação AgriBus HUD
 * e Piloto Automático Agrícola.
 */
import { GuidanceEngine } from './modules/guidanceEngine.js';
import { SectionEngine } from './modules/sectionEngine.js';
import { GnssStation } from './modules/gnssStation.js';
import { ElevationDem, UTM_DEFS } from './modules/elevationDem.js';
import { FieldManager } from './modules/fieldManager.js';
import { FleetManager } from './modules/fleetManager.js';
import { WorkOrderService } from './modules/workOrder.js';
import { CutManager } from './modules/cutManager.js';
import { MemorialParser } from './modules/memorialParser.js';

(function() {
  'use strict';

  // --- APP STATE ---
  const state = {
    currentView: 'gis',
    currentPolygon: null,
    originalPolygon: null,
    generatedLines: [],
    headlandLines: [],
    guideLine: null,
    customABPoints: [],
    isPickingAB: false,
    mode: 'straight-ab',
    headingAngle: 90,
    contourPercentile: 50,
    headlandPasses: 0,
    isDarkTheme: true,
    isNavigating: false,
    navMode: 'none',
    simTimer: null,
    simSpeedMultiplier: 1,
    activeLayer: 'esri',
    showCoverageLayer: true,
    activeMachine: FleetManager.getActive(),
    implementWidth: (FleetManager.getActive() && FleetManager.getActive().widthMeters) || 12.0,
    currentFieldMeta: null,
    elevationProfile: null,
    isCuttingLine: false,
    isCuttingHole: false,
    fleetFilterCategory: 'all',
    fleetSearchQuery: '',
    selectedDetailMachineId: null
  };

  // --- DOM ELEMENTS ---
  const els = {
    sidebar: document.getElementById('app-sidebar'),
    btnToggleSidebar: document.getElementById('btnToggleSidebar'),
    viewTitle: document.getElementById('currentViewTitle'),
    viewSubtitle: document.getElementById('currentViewSubtitle'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    rtkPill: document.getElementById('rtkPill'),
    rtkDot: document.getElementById('rtkDot'),
    rtkLabel: document.getElementById('rtkLabel'),
    rtkSats: document.getElementById('rtkSats'),
    toast: document.getElementById('appToast'),

    // Map & GIS elements
    mapContainer: document.getElementById('map'),
    btnDrawPoly: document.getElementById('btnDrawPoly'),
    btnImportFile: document.getElementById('btnImportFile'),
    fileInput: document.getElementById('fileInput'),
    btnImportMemorial: document.getElementById('btnImportMemorial'),
    memorialInput: document.getElementById('memorialInput'),
    exportFormatSelect: document.getElementById('exportFormatSelect'),
    btnExportMasterAB: document.getElementById('btnExportMasterAB'),
    mobileOverlay: document.getElementById('mobileOverlay'),
    gisPanel: document.getElementById('gisPanel'),
    btnGisPanelHandle: document.getElementById('btnGisPanelHandle'),
    lineSpacingInput: document.getElementById('lineSpacingInput'),
    spacingPresetsChips: document.getElementById('spacingPresetsChips'),
    activeMachineBadge: document.getElementById('activeMachineBadge'),
    btnClearField: document.getElementById('btnClearField'),
    btnGenerateLines: document.getElementById('btnGenerateLines'),
    btnAutoAngle: document.getElementById('btnAutoAngle'),
    btnPickAB: document.getElementById('btnPickAB'),
    abStatusText: document.getElementById('abStatusText'),
    headingSlider: document.getElementById('headingSlider'),
    headingValDisp: document.getElementById('headingValDisp'),
    contourSlider: document.getElementById('contourSlider'),
    contourValDisp: document.getElementById('contourValDisp'),
    canvasDemProfile: document.getElementById('canvasDemProfile'),
    btnLayerPicker: document.getElementById('btnLayerPicker'),
    layerSelectorModal: document.getElementById('layerSelectorModal'),
    btnToggleCoverage: document.getElementById('btnToggleCoverage'),
    btnGpsLocate: document.getElementById('btnGpsLocate'),
    btnFitBounds: document.getElementById('btnFitBounds'),
    gisFieldAreaBadge: document.getElementById('gisFieldAreaBadge'),

    // Topografia & DEM
    btnElevModeSrtm: document.getElementById('btnElevModeSrtm'),
    btnElevModeCsv: document.getElementById('btnElevModeCsv'),
    csvElevControls: document.getElementById('csvElevControls'),
    csvCoordSystem: document.getElementById('csvCoordSystem'),
    csvFileInput: document.getElementById('csvFileInput'),
    btnUploadCsv: document.getElementById('btnUploadCsv'),
    elevStatusText: document.getElementById('elevStatusText'),
    btnPrepElev: document.getElementById('btnPrepElev'),
    topoMinElevDisp: document.getElementById('topoMinElevDisp'),
    topoMaxElevDisp: document.getElementById('topoMaxElevDisp'),
    topoDeltaElevDisp: document.getElementById('topoDeltaElevDisp'),
    topoSlopeDisp: document.getElementById('topoSlopeDisp'),

    // Linhas de Corte & Zoneamento
    cutSectionCard: document.getElementById('cutSectionCard'),
    btnCutLine: document.getElementById('btnCutLine'),
    btnCutHole: document.getElementById('btnCutHole'),
    btnInvertTags: document.getElementById('btnInvertTags'),
    btnCutReset: document.getElementById('btnCutReset'),
    cutPartsList: document.getElementById('cutPartsList'),
    btnUseOpenParts: document.getElementById('btnUseOpenParts'),
    btnExportOpenKML: document.getElementById('btnExportOpenKML'),
    btnExportPlantingKML: document.getElementById('btnExportPlantingKML'),

    // Barra Flutuante de Delimitação no Mapa
    mapZoningToolbar: document.getElementById('mapZoningToolbar'),
    btnQuickCut: document.getElementById('btnQuickCut'),
    btnQuickHole: document.getElementById('btnQuickHole'),
    btnQuickInvert: document.getElementById('btnQuickInvert'),
    btnQuickReset: document.getElementById('btnQuickReset'),
    btnQuickConfirm: document.getElementById('btnQuickConfirm'),
    zoningOpenHa: document.getElementById('zoningOpenHa'),
    zoningClosedHa: document.getElementById('zoningClosedHa'),

    // AgriBus HUD
    agribusHud: document.getElementById('agribusHud'),
    hudHeading: document.getElementById('hudHeading'),
    hudSpeed: document.getElementById('hudSpeed'),
    hudTrackNum: document.getElementById('hudTrackNum'),
    hudDevDirection: document.getElementById('hudDevDirection'),
    hudDevValue: document.getElementById('hudDevValue'),
    hudAccuracy: document.getElementById('hudAccuracy'),
    sectionBoxesContainer: document.getElementById('sectionBoxesContainer'),

    // Navigation Controls
    btnStartSim: document.getElementById('btnStartSim'),
    btnStartGps: document.getElementById('btnStartGps'),
    btnStopNav: document.getElementById('btnStopNav'),

    // Modals
    gnssModal: document.getElementById('gnssModal'),
    btnCloseGnssModal: document.getElementById('btnCloseGnssModal'),
    btnBtConnect: document.getElementById('btnBtConnect'),
    btnSerialConnect: document.getElementById('btnSerialConnect'),
    btnSimFix: document.getElementById('btnSimFix'),
    btnSimFloat: document.getElementById('btnSimFloat'),
    btnDisconnectGnss: document.getElementById('btnDisconnectGnss'),
    nmeaStreamArea: document.getElementById('nmeaStreamArea'),

    workOrderModal: document.getElementById('workOrderModal'),
    btnCloseWorkOrderModal: document.getElementById('btnCloseWorkOrderModal'),
    btnPrintWorkOrder: document.getElementById('btnPrintWorkOrder'),
    btnExportWorkOrderTxt: document.getElementById('btnExportWorkOrderTxt'),

    // Tables & Equipment Managers
    fieldsTableBody: document.getElementById('fieldsTableBody'),
    fleetTableBody: document.getElementById('fleetTableBody'),
    quickMachineSelect: document.getElementById('quickMachineSelect'),
    btnOpenAddEquipmentModal: document.getElementById('btnOpenAddEquipmentModal'),
    btnImportXlsx: document.getElementById('btnImportXlsx'),
    xlsxFileInput: document.getElementById('xlsxFileInput'),
    btnExportEquipmentJson: document.getElementById('btnExportEquipmentJson'),
    btnResetEquipmentDefaults: document.getElementById('btnResetEquipmentDefaults'),
    equipmentCategoryFilter: document.getElementById('equipmentCategoryFilter'),
    equipmentSearchInput: document.getElementById('equipmentSearchInput'),

    // Equipment Modals
    modalEquipmentForm: document.getElementById('modalEquipmentForm'),
    btnCloseEquipmentFormModal: document.getElementById('btnCloseEquipmentFormModal'),
    btnCancelEquipmentForm: document.getElementById('btnCancelEquipmentForm'),
    formEquipment: document.getElementById('formEquipment'),
    equipmentFormTitle: document.getElementById('equipmentFormTitle'),
    eqFormId: document.getElementById('eqFormId'),
    eqFormCategory: document.getElementById('eqFormCategory'),
    eqFormBrand: document.getElementById('eqFormBrand'),
    eqFormModel: document.getElementById('eqFormModel'),
    eqFormName: document.getElementById('eqFormName'),
    eqFormWidth: document.getElementById('eqFormWidth'),
    eqFormCapacity: document.getElementById('eqFormCapacity'),
    eqFormPayload: document.getElementById('eqFormPayload'),
    eqFormPower: document.getElementById('eqFormPower'),
    eqFormPto: document.getElementById('eqFormPto'),
    eqFormDisks: document.getElementById('eqFormDisks'),
    eqFormCoupling: document.getElementById('eqFormCoupling'),
    eqFormWeight: document.getElementById('eqFormWeight'),
    eqFormHeight: document.getElementById('eqFormHeight'),
    eqFormDimWidth: document.getElementById('eqFormDimWidth'),
    eqFormLength: document.getElementById('eqFormLength'),
    eqFormTrack: document.getElementById('eqFormTrack'),
    eqFormClearance: document.getElementById('eqFormClearance'),
    eqFormNotes: document.getElementById('eqFormNotes'),
    eqFormSource: document.getElementById('eqFormSource'),

    modalEquipmentDetails: document.getElementById('modalEquipmentDetails'),
    btnCloseEqDetailModal: document.getElementById('btnCloseEqDetailModal'),
    eqDetailTitle: document.getElementById('eqDetailTitle'),
    eqDetailBody: document.getElementById('eqDetailBody'),
    eqDetailSourceLink: document.getElementById('eqDetailSourceLink'),
    btnSelectFromDetail: document.getElementById('btnSelectFromDetail')
  };

  // --- TOAST NOTIFICATIONS ---
  function showToast(msg, duration = 3000) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), duration);
  }

  // --- MAP SETUP ---
  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([-12.805, -55.503], 14);

  const baseLayers = {
    esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Esri World Imagery'
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, attribution: '&copy; CartoDB'
    }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17, attribution: '&copy; OpenTopoMap'
    })
  };
  baseLayers.esri.addTo(map);

  const drawnItems = new L.FeatureGroup().addTo(map);
  const cutLayer = new L.FeatureGroup().addTo(map);
  const coverageLayer = L.layerGroup().addTo(map);
  const plantingLinesLayer = L.layerGroup().addTo(map);
  const headlandLayer = L.layerGroup().addTo(map);
  const guideLineLayer = L.layerGroup().addTo(map);
  const abMarkersLayer = L.layerGroup().addTo(map);
  const tractorLayer = L.layerGroup().addTo(map);

  const tractorIcon = L.divIcon({
    className: 'tractor-marker-wrapper',
    html: '<div id="tractorIconMarker" style="transform: rotate(0deg); transition: transform 0.2s linear; width:38px; height:38px; display:flex; align-items:center; justify-content:center; background:#2ecc71; color:#fff; border-radius:50%; border:2px solid #fff; box-shadow:0 0 14px rgba(46,204,113,0.9); font-size:18px;"><i class="fa-solid fa-location-arrow"></i></div>',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
  let tractorMarker = null;

  // Leaflet Draw Control for Boundary Polygons
  const drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems, remove: false },
    draw: {
      polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#2ecc71', weight: 3 } },
      marker: false, circle: false, circlemarker: false, rectangle: false, polyline: false
    }
  });

  // Leaflet Draw Control for Cut Polylines
  const cutDrawControl = new L.Control.Draw({
    draw: {
      polyline: { shapeOptions: { color: '#e74c3c', weight: 3.5, dashArray: '5, 5' } },
      polygon: false, marker: false, circle: false, circlemarker: false, rectangle: false
    }
  });

  // Leaflet Draw Control for Internal Forest/APP Holes
  const holeDrawControl = new L.Control.Draw({
    draw: {
      polygon: { shapeOptions: { color: '#e74c3c', weight: 2.5, fillColor: '#e74c3c', fillOpacity: 0.35 } },
      polyline: false, marker: false, circle: false, circlemarker: false, rectangle: false
    }
  });

  // --- VIEW SWITCHING ---
  function switchView(targetView) {
    state.currentView = targetView;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === targetView);
    });
    document.querySelectorAll('.view-container').forEach(view => {
      view.classList.toggle('active', view.id === 'view-' + targetView);
    });

    const titles = {
      gis: { title: 'Estação Cartográfica GIS', subtitle: 'Planejamento e Traçado de Linhas de Plantio' },
      cabin: { title: 'Piloto Cabine & Lightbar HUD', subtitle: 'Navegação em Tempo Real & Controle de Seções' },
      rtk: { title: 'Estação GNSS / RTK & Sensores', subtitle: 'Conexão Bluetooth / Serial NMEA e Status de Fix' },
      fleet: { title: 'Banco de Equipamentos & Maquinários', subtitle: 'Catálogo técnico de distribuidores, plantadeiras e pulverizadores' }
    };

    if (titles[targetView]) {
      els.viewTitle.textContent = titles[targetView].title;
      els.viewSubtitle.textContent = titles[targetView].subtitle;
    }

    if (targetView === 'gis') {
      setTimeout(() => map.invalidateSize(), 150);
    } else if (targetView === 'fleet') {
      renderFleetTable();
    }
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  // --- MOBILE SIDEBAR & GIS PANEL ---
  const mobileOverlay = document.getElementById('mobileOverlay');
  const gisPanel = document.getElementById('gisPanel');
  const btnGisPanelHandle = document.getElementById('btnGisPanelHandle');

  function isMobile() {
    return window.innerWidth <= 899;
  }

  function openMobileSidebar() {
    if (els.sidebar) els.sidebar.classList.add('mobile-open');
    if (mobileOverlay) mobileOverlay.classList.add('active');
  }

  function closeMobileSidebar() {
    if (els.sidebar) els.sidebar.classList.remove('mobile-open');
    if (mobileOverlay) mobileOverlay.classList.remove('active');
  }

  els.btnToggleSidebar.addEventListener('click', () => {
    if (isMobile()) {
      if (els.sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    } else {
      els.sidebar.classList.toggle('collapsed');
      setTimeout(() => map.invalidateSize(), 200);
    }
  });

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => closeMobileSidebar());
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (isMobile()) closeMobileSidebar();
    });
  });

  // GIS Panel handle — tap or drag to toggle mobile-expanded
  if (btnGisPanelHandle && gisPanel) {
    let dragStartY = 0;
    let panelExpanded = false;

    function togglePanel(expand) {
      panelExpanded = expand;
      gisPanel.classList.toggle('mobile-expanded', expand);
      setTimeout(() => map.invalidateSize(), 350);
    }

    btnGisPanelHandle.addEventListener('click', () => {
      if (isMobile()) togglePanel(!panelExpanded);
    });

    btnGisPanelHandle.addEventListener('touchstart', (e) => {
      dragStartY = e.touches[0].clientY;
    }, { passive: true });

    btnGisPanelHandle.addEventListener('touchmove', (e) => {
      const dy = dragStartY - e.touches[0].clientY;
      if (dy > 30) togglePanel(true);
      else if (dy < -30) togglePanel(false);
    }, { passive: true });
  }

  els.btnThemeToggle.addEventListener('click', () => {
    state.isDarkTheme = !state.isDarkTheme;
    document.body.classList.toggle('light-theme', !state.isDarkTheme);
    els.btnThemeToggle.innerHTML = state.isDarkTheme ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    showToast(state.isDarkTheme ? 'Modo Noturno ativado' : 'Modo Claro ativado');
  });

  // --- POLÍGONO & GESTÃO DO TALHÃO ---
  function setPolygon(geoJSON, meta = null) {
    drawnItems.clearLayers();
    plantingLinesLayer.clearLayers();
    headlandLayer.clearLayers();
    guideLineLayer.clearLayers();
    abMarkersLayer.clearLayers();
    cutLayer.clearLayers();
    CutManager.reset();

    state.currentPolygon = geoJSON;
    state.originalPolygon = geoJSON;
    state.currentFieldMeta = meta;
    state.customABPoints = [];
    updateABStatusText();

    const layer = L.geoJSON(geoJSON, {
      style: { color: '#2ecc71', weight: 3, fillOpacity: 0.15 }
    });
    layer.eachLayer(l => drawnItems.addLayer(l));

    try {
      map.fitBounds(layer.getBounds(), { padding: [40, 40] });
    } catch(e) {}

    const areaM2 = turf.area(geoJSON);
    const ha = (areaM2 / 10000).toFixed(2);
    els.gisFieldAreaBadge.textContent = `${ha} ha`;

    // Atualiza Topografia DEM
    updateDemAltimetry(geoJSON);

    // Exibe seção de corte de talhão e toolbar flutuante
    if (els.cutSectionCard) {
      els.cutSectionCard.style.display = 'block';
      renderCutPartsList([]);
    }
    updateZoningHUD([]);

    els.btnGenerateLines.disabled = false;
    els.btnExportPlantingKML.disabled = true;
    showToast(`Talhão carregado: ${ha} ha`);
  }

  function updateDemAltimetry(geoJSON) {
    state.elevationProfile = ElevationDem.calculateProfile(geoJSON, ElevationDem.cachedGrid);
    if (state.elevationProfile && els.canvasDemProfile) {
      ElevationDem.drawCanvasProfile(els.canvasDemProfile, state.elevationProfile, state.contourPercentile);
      els.topoMinElevDisp.textContent = `${state.elevationProfile.minElev.toFixed(0)} m`;
      els.topoMaxElevDisp.textContent = `${state.elevationProfile.maxElev.toFixed(0)} m`;
      els.topoDeltaElevDisp.textContent = `${state.elevationProfile.deltaElev.toFixed(1)} m`;
      els.topoSlopeDisp.textContent = `${state.elevationProfile.avgSlope}%`;
    }
  }

  // --- GESTÃO DE DESENHO (HANDLERS DIRETOS) ---
  let activeDrawHandler = null;

  function stopActiveDrawing() {
    if (activeDrawHandler) {
      try { activeDrawHandler.disable(); } catch(e) {}
      activeDrawHandler = null;
    }
    state.isCuttingLine = false;
    state.isCuttingHole = false;
  }

  els.btnDrawPoly.addEventListener('click', () => {
    stopActiveDrawing();
    activeDrawHandler = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: { color: '#2ecc71', weight: 3 }
    });
    activeDrawHandler.enable();
    showToast('Clique no mapa para desenhar os vértices do talhão.');
  });

  map.on(L.Draw.Event.CREATED, e => {
    if (state.isCuttingLine) {
      state.isCuttingLine = false;
      activeDrawHandler = null;
      const cutLineGeo = e.layer.toGeoJSON();
      CutManager.addCutLine(cutLineGeo);
      applyCutLines();
      showToast('✂️ Linha de corte aplicada! Clique nas partes para alternar zoneamento.');
      return;
    }

    if (state.isCuttingHole) {
      state.isCuttingHole = false;
      activeDrawHandler = null;
      const holeGeo = e.layer.toGeoJSON();
      CutManager.addExclusionHole(holeGeo);
      applyCutLines();
      showToast('🌲 Área de mata/APP interna recortada com sucesso!');
      return;
    }

    activeDrawHandler = null;
    const gj = e.layer.toGeoJSON();
    setPolygon(gj.geometry ? gj : { type: 'Feature', properties: {}, geometry: gj });
  });

  els.btnClearField.addEventListener('click', () => {
    if (confirm('Deseja limpar o talhão, linhas e cortes traçados?')) {
      stopActiveDrawing();
      drawnItems.clearLayers();
      cutLayer.clearLayers();
      plantingLinesLayer.clearLayers();
      headlandLayer.clearLayers();
      guideLineLayer.clearLayers();
      abMarkersLayer.clearLayers();
      coverageLayer.clearLayers();
      SectionEngine.reset();
      CutManager.reset();
      state.currentPolygon = null;
      state.originalPolygon = null;
      state.generatedLines = [];
      state.customABPoints = [];
      els.gisFieldAreaBadge.textContent = '0.00 ha';
      els.btnGenerateLines.disabled = true;
      els.btnExportPlantingKML.disabled = true;
      if (els.exportFormatSelect) els.exportFormatSelect.disabled = true;
      if (els.btnExportMasterAB) els.btnExportMasterAB.disabled = true;
      if (els.cutSectionCard) els.cutSectionCard.style.display = 'none';
      if (els.mapZoningToolbar) els.mapZoningToolbar.style.display = 'none';
      saveGisState();
      updateABStatusText();
      showToast('Área limpa.');
    }
  });

  // --- IMPORTAÇÃO DE ARQUIVOS (KML, GeoJSON, JSON) ---
  els.btnImportFile.addEventListener('click', () => els.fileInput.click());

  els.fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target.result;
        let geom = null;
        if (file.name.toLowerCase().endsWith('.kml')) {
          geom = GuidanceEngine.parseKMLPolygon(text);
        } else {
          const parsed = JSON.parse(text);
          geom = parsed.geometry ? parsed.geometry : (parsed.type === 'FeatureCollection' ? parsed.features[0].geometry : parsed);
        }
        if (!geom) throw new Error('Não foi possível identificar um polígono válido no arquivo.');
        setPolygon({ type: 'Feature', properties: { name: file.name }, geometry: geom });
      } catch(err) {
        alert('Erro ao importar arquivo: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // --- IMPORTAÇÃO DE MEMORIAIS DESCRITIVOS (PDF/TXT) ---
  if (els.btnImportMemorial) {
    els.btnImportMemorial.addEventListener('click', () => {
      if (els.memorialInput) els.memorialInput.click();
    });

    if (els.memorialInput) {
      els.memorialInput.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;

        const prevText = els.btnImportMemorial.innerHTML;
        els.btnImportMemorial.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando Memorial...';
        els.btnImportMemorial.disabled = true;

        try {
          const result = await MemorialParser.processarArquivo(file);

          // Converte para coordenadas [lon, lat] padrão GeoJSON
          const coordinates = result.coordsLatLon.map(c => [c.lon, c.lat]);

          // Garante que o anel do polígono seja fechado
          if (coordinates.length > 0) {
            const first = coordinates[0];
            const last = coordinates[coordinates.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              coordinates.push([...first]);
            }
          }

          const fieldName = (result.dados && result.dados.nome) || file.name.replace(/\.[^/.]+$/, '');
          const farmName = (result.dados && (result.dados.imovel || result.dados.proprietario)) || 'Fazenda Modelo';

          const geojsonFeature = {
            type: 'Feature',
            properties: {
              name: fieldName,
              farm: farmName,
              areaDeclarada: result.dados ? result.dados.areaDeclarada : null,
              proprietario: result.dados ? result.dados.proprietario : null,
              municipio: result.dados ? result.dados.municipio : null,
              zonaUTM: result.zona
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            }
          };

          const meta = {
            name: fieldName,
            farm: farmName,
            crop: 'Soja'
          };

          switchView('gis');
          setPolygon(geojsonFeature, meta);
          showToast(`✅ Memorial importado: ${result.totalVertices} vértices carregados!`);
        } catch (err) {
          console.error('Erro ao processar memorial:', err);
          alert('Erro ao importar memorial descritivo:\n\n' + err.message);
        } finally {
          els.btnImportMemorial.innerHTML = prevText;
          els.btnImportMemorial.disabled = false;
          e.target.value = '';
        }
      });
    }
  }

  // --- ✂️ LINHAS DE CORTE, RECORTES INTERNOS & ZONEAMENTO INTUITIVO ---
  function triggerCutLine() {
    if (!state.currentPolygon) return alert('Defina ou carregue um talhão primeiro.');
    stopActiveDrawing();
    state.isCuttingLine = true;
    activeDrawHandler = new L.Draw.Polyline(map, {
      shapeOptions: { color: '#e74c3c', weight: 3.5, dashArray: '5, 5' }
    });
    activeDrawHandler.enable();
    showToast('✂️ Desenhe a linha cruzando o talhão de ponta a ponta.');
  }

  function triggerCutHole() {
    if (!state.currentPolygon) return alert('Defina ou carregue um talhão primeiro.');
    stopActiveDrawing();
    state.isCuttingHole = true;
    activeDrawHandler = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: { color: '#e74c3c', weight: 2.5, fillColor: '#e74c3c', fillOpacity: 0.35 }
    });
    activeDrawHandler.enable();
    showToast('🌲 Desenhe o polígono contornando a mata/APP interna.');
  }

  if (els.btnCutLine) els.btnCutLine.addEventListener('click', triggerCutLine);
  if (els.btnQuickCut) els.btnQuickCut.addEventListener('click', triggerCutLine);

  if (els.btnCutHole) els.btnCutHole.addEventListener('click', triggerCutHole);
  if (els.btnQuickHole) els.btnQuickHole.addEventListener('click', triggerCutHole);

  function applyCutLines() {
    if (!state.originalPolygon) return;
    const parts = CutManager.applyCuts(state.originalPolygon);
    renderCutPartsList(parts);
    updateZoningHUD(parts);
  }

  function updateZoningHUD(parts) {
    if (!els.mapZoningToolbar) return;
    if (!state.originalPolygon) {
      els.mapZoningToolbar.style.display = 'none';
      return;
    }
    els.mapZoningToolbar.style.display = 'flex';
    const metrics = CutManager.getAreaMetrics(state.originalPolygon);
    els.zoningOpenHa.innerHTML = `<i class="fa-solid fa-seedling"></i> ${metrics.openHa.toFixed(2)} ha Úteis (${metrics.openPercent}%)`;
    els.zoningClosedHa.innerHTML = `<i class="fa-solid fa-tree"></i> ${metrics.closedHa.toFixed(2)} ha APP/Reserva`;
  }

  function renderCutPartsList(parts) {
    if (!els.cutPartsList) return;
    els.cutPartsList.innerHTML = '';
    cutLayer.clearLayers();

    // Redesenha as linhas de corte
    CutManager.cutLines.forEach(line => {
      L.geoJSON(line, { style: { color: '#e74c3c', weight: 3, dashArray: '6, 4' } }).addTo(cutLayer);
    });

    if (parts.length === 0) {
      els.btnUseOpenParts.disabled = true;
      els.btnExportOpenKML.disabled = true;
      return;
    }

    parts.forEach((part, i) => {
      const isOpen = part.tag === 'open';

      // Camada visual do polígono no mapa com interatividade total
      const polyLayer = L.geoJSON(part.geojson, {
        style: {
          color: isOpen ? '#2ecc71' : '#e74c3c',
          weight: 2.5,
          fillColor: isOpen ? '#2ecc71' : '#e74c3c',
          fillOpacity: isOpen ? 0.35 : 0.12,
          dashArray: isOpen ? null : '6, 4'
        }
      }).addTo(cutLayer);

      // Clique direto no mapa para alternar o zoneamento da parte
      polyLayer.on('click', () => {
        const updated = CutManager.togglePartTag(i);
        renderCutPartsList(updated);
        updateZoningHUD(updated);
        const tagLabel = updated[i].tag === 'open' ? '🌱 Aberta (Lavoura)' : '🌲 Fechada (APP/Mata)';
        showToast(`Parte ${i + 1} alterada para: ${tagLabel}`);
      });

      // Efeito de destaque no hover
      polyLayer.on('mouseover', () => {
        polyLayer.setStyle({ weight: 4, fillOpacity: isOpen ? 0.55 : 0.25 });
      });
      polyLayer.on('mouseout', () => {
        polyLayer.setStyle({ weight: 2.5, fillOpacity: isOpen ? 0.35 : 0.12 });
      });

      // Tooltip informativo
      const tooltipMsg = isOpen
        ? `🌱 Parte ${i + 1} (${part.areaHa.toFixed(2)} ha) • Aberta (Clique p/ fechar)`
        : `🌲 Parte ${i + 1} (${part.areaHa.toFixed(2)} ha) • Fechada / APP (Clique p/ abrir)`;
      polyLayer.bindTooltip(tooltipMsg, {
        sticky: true,
        className: `part-interactive-tooltip ${part.tag}`
      });

      // Item na lista lateral
      const item = document.createElement('div');
      item.className = 'cut-part-item';
      item.innerHTML = `
        <div class="cut-part-left">
          <span class="cut-part-color" style="background:${isOpen ? '#2ecc71' : '#e74c3c'};"></span>
          <div>
            <div class="cut-part-name">Parte ${i + 1}</div>
            <div class="cut-part-ha">${part.areaHa.toFixed(2)} ha</div>
          </div>
        </div>
        <div class="tag-toggle-group">
          <button class="tag-btn ${isOpen ? 'active-open' : ''}" data-idx="${i}" data-tag="open">Aberta</button>
          <button class="tag-btn ${!isOpen ? 'active-closed' : ''}" data-idx="${i}" data-tag="closed">Fechada</button>
        </div>
      `;
      els.cutPartsList.appendChild(item);
    });

    els.cutPartsList.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', ev => {
        const idx = parseInt(ev.target.dataset.idx, 10);
        const tag = ev.target.dataset.tag;
        const updated = CutManager.setPartTag(idx, tag);
        renderCutPartsList(updated);
        updateZoningHUD(updated);
      });
    });

    const hasOpen = parts.some(p => p.tag === 'open');
    els.btnUseOpenParts.disabled = !hasOpen;
    els.btnExportOpenKML.disabled = !hasOpen;
  }

  function invertZoningSelection() {
    if (CutManager.cutParts.length === 0) return alert('Realize ao menos um corte no talhão primeiro.');
    const updated = CutManager.invertSelection();
    renderCutPartsList(updated);
    updateZoningHUD(updated);
    showToast('Seleção invertida!');
  }

  els.btnInvertTags.addEventListener('click', invertZoningSelection);
  els.btnQuickInvert.addEventListener('click', invertZoningSelection);

  function resetFieldCuts() {
    if (!state.originalPolygon) return;
    CutManager.reset();
    cutLayer.clearLayers();
    renderCutPartsList([]);
    setPolygon(state.originalPolygon);
    showToast('Cortes removidos. Talhão original restaurado.');
  }

  els.btnCutReset.addEventListener('click', resetFieldCuts);
  els.btnQuickReset.addEventListener('click', resetFieldCuts);

  function confirmOpenPlantingArea() {
    const merged = CutManager.getMergedOpenPolygon();
    if (!merged) return alert('Nenhuma parte marcada como aberta (lavoura).');

    state.currentPolygon = merged;
    drawnItems.clearLayers();
    const layer = L.geoJSON(merged, { style: { color: '#2ecc71', weight: 3, fillOpacity: 0.2 } });
    layer.eachLayer(l => drawnItems.addLayer(l));

    const ha = CutManager.getTotalOpenAreaHa().toFixed(2);
    els.gisFieldAreaBadge.textContent = `${ha} ha`;
    updateDemAltimetry(merged);
    updateZoningHUD(CutManager.cutParts);
    showToast(`Área útil de plantio confirmada: ${ha} ha! Agora você pode gerar as linhas.`);
  }

  els.btnUseOpenParts.addEventListener('click', confirmOpenPlantingArea);
  els.btnQuickConfirm.addEventListener('click', confirmOpenPlantingArea);

  els.btnExportOpenKML.addEventListener('click', () => {
    const kml = CutManager.exportOpenKML();
    if (!kml) return alert('Nenhuma área aberta para exportação.');
    downloadFile(kml, 'areas_abertas_lavoura.kml', 'application/vnd.google-earth.kml+xml');
    showToast('KML de Áreas Abertas exportado com sucesso!');
  });

  // --- ⛰️ TOPOGRAFIA & ELEVAÇÃO REAL / CSV RTK ---
  els.btnElevModeSrtm.addEventListener('click', () => {
    ElevationDem.currentMode = 'srtm';
    els.btnElevModeSrtm.classList.add('active');
    els.btnElevModeCsv.classList.remove('active');
    els.csvElevControls.style.display = 'none';
    els.elevStatusText.textContent = 'Elevação real Copernicus DEM via Open-Meteo pronta para consulta online.';
    showToast('Modo Altimetria Real (Copernicus DEM) ativado.');
  });

  els.btnElevModeCsv.addEventListener('click', () => {
    ElevationDem.currentMode = 'csv';
    els.btnElevModeCsv.classList.add('active');
    els.btnElevModeSrtm.classList.remove('active');
    els.csvElevControls.style.display = 'flex';
    els.elevStatusText.textContent = ElevationDem.scatterPoints
      ? `${ElevationDem.scatterPoints.length} pontos RTK carregados. Clique em Atualizar Altimetria.`
      : 'Carregue um arquivo CSV/TXT com coordenadas (X, Y, Z).';
    showToast('Modo Levantamento Topográfico RTK ativado.');
  });

  els.btnUploadCsv.addEventListener('click', () => els.csvFileInput.click());

  els.csvFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target.result;
        const coordSystem = els.csvCoordSystem.value;
        const pts = ElevationDem.parseCsvPoints(text, coordSystem);
        const zMin = Math.min(...pts.map(p => p.z));
        const zMax = Math.max(...pts.map(p => p.z));
        els.elevStatusText.textContent = `${pts.length} pontos carregados (Cotas: ${zMin.toFixed(1)}m a ${zMax.toFixed(1)}m).`;
        showToast(`${pts.length} pontos RTK carregados!`);
      } catch(err) {
        alert('Erro no arquivo CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  els.btnPrepElev.addEventListener('click', async () => {
    if (!state.currentPolygon) return alert('Carregue um talhão no GIS primeiro.');
    const bbox = turf.bbox(state.currentPolygon);
    els.btnPrepElev.disabled = true;
    els.btnPrepElev.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';

    try {
      await ElevationDem.ensureGrid(bbox, (pct, prov) => {
        els.elevStatusText.textContent = `Buscando elevação (${prov})... ${pct}%`;
      });
      updateDemAltimetry(state.currentPolygon);
      els.elevStatusText.textContent = `Altimetria atualizada com sucesso (${ElevationDem.cachedGrid.provider}).`;
      showToast('Altimetria real sincronizada!');
    } catch(err) {
      els.elevStatusText.textContent = 'Erro: ' + err.message;
      alert('Falha na elevação: ' + err.message);
    } finally {
      els.btnPrepElev.disabled = false;
      els.btnPrepElev.innerHTML = '<i class="fa-solid fa-mountain"></i> Atualizar Altimetria Real';
    }
  });

  // --- 🧭 MARCAÇÃO INTERATIVA DE RETA A-B ---
  function updateABStatusText() {
    if (!els.abStatusText) return;
    if (state.customABPoints.length === 0) {
      els.abStatusText.textContent = 'Nenhum ponto marcado (clique em Marcar A & B para balizar no mapa)';
      els.abStatusText.style.color = 'var(--text-muted)';
    } else if (state.customABPoints.length === 1) {
      els.abStatusText.textContent = 'Ponto A marcado! Clique no mapa para posicionar o Ponto B.';
      els.abStatusText.style.color = 'var(--gold)';
    } else {
      els.abStatusText.textContent = `Pontos A e B definidos (Rumo: ${state.headingAngle}°).`;
      els.abStatusText.style.color = 'var(--accent)';
    }
  }

  els.btnPickAB.addEventListener('click', () => {
    abMarkersLayer.clearLayers();
    guideLineLayer.clearLayers();
    state.customABPoints = [];
    state.isPickingAB = true;
    updateABStatusText();
    showToast('Clique no mapa para marcar o PONTO A');
  });

  map.on('click', ev => {
    if (!state.isPickingAB) return;
    const latlng = ev.latlng;
    const isFirst = state.customABPoints.length === 0;
    const label = isFirst ? 'A' : 'B';

    const marker = L.circleMarker(latlng, {
      color: '#f39c12', radius: 7, fillColor: '#f39c12', fillOpacity: 1, weight: 2
    }).addTo(abMarkersLayer);
    marker.bindTooltip(`<div class="ab-marker-pill">Ponto ${label}</div>`, {
      permanent: true, direction: 'top', offset: [0, -8]
    }).openTooltip();

    state.customABPoints.push([latlng.lng, latlng.lat]);
    updateABStatusText();

    if (isFirst) {
      showToast('Ponto A definido! Agora clique no PONTO B.');
    } else {
      state.isPickingAB = false;
      const ptA = state.customABPoints[0];
      const ptB = state.customABPoints[1];
      const bearing = turf.bearing(turf.point(ptA), turf.point(ptB));
      const normAngle = Math.round((bearing + 360) % 180);
      state.headingAngle = normAngle;
      els.headingSlider.value = normAngle;
      els.headingValDisp.textContent = `${normAngle}°`;
      updateABStatusText();
      showToast(`Linha A-B definida! Azimute: ${normAngle}°`);
    }
  });

  els.btnAutoAngle.addEventListener('click', () => {
    if (!state.currentPolygon) return;
    const res = GuidanceEngine.calculateBestAngle(state.currentPolygon);
    state.headingAngle = res.angle;
    state.customABPoints = [];
    abMarkersLayer.clearLayers();
    updateABStatusText();
    els.headingSlider.value = res.angle;
    els.headingValDisp.textContent = `${res.angle}°`;
    showToast(`Melhor Ângulo: ${res.angle}° (${res.frontLengthMeters}m de frente)`);
  });

  els.headingSlider.addEventListener('input', e => {
    state.headingAngle = parseInt(e.target.value, 10);
    els.headingValDisp.textContent = `${state.headingAngle}°`;
  });

  els.contourSlider.addEventListener('input', e => {
    state.contourPercentile = parseInt(e.target.value, 10);
    els.contourValDisp.textContent = `${state.contourPercentile}%`;
    if (state.elevationProfile && els.canvasDemProfile) {
      ElevationDem.drawCanvasProfile(els.canvasDemProfile, state.elevationProfile, state.contourPercentile);
    }
  });

  // Cabeceiras Chips
  document.querySelectorAll('#headlandChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#headlandChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.headlandPasses = parseInt(chip.dataset.passes, 10);
    });
  });

  // --- ESPAÇAMENTO / LARGURA DA PASSADA ---
  function updateSpacingUI(val, updateInput = true) {
    let num = parseFloat(val);
    if (isNaN(num) || num <= 0) num = 12.0;
    state.implementWidth = num;

    if (updateInput && els.lineSpacingInput) {
      els.lineSpacingInput.value = num;
    }

    if (els.spacingPresetsChips) {
      els.spacingPresetsChips.querySelectorAll('.chip').forEach(c => {
        const pVal = parseFloat(c.dataset.spacing);
        if (Math.abs(pVal - num) < 0.05) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    }

    if (els.activeMachineBadge && state.activeMachine) {
      const shortName = state.activeMachine.implement || state.activeMachine.name;
      els.activeMachineBadge.textContent = `${shortName} (${num.toFixed(1)}m)`;
    }
  }

  if (els.lineSpacingInput) {
    els.lineSpacingInput.addEventListener('input', e => {
      updateSpacingUI(e.target.value, false);
    });
    els.lineSpacingInput.addEventListener('change', e => {
      updateSpacingUI(e.target.value, true);
    });
  }

  if (els.spacingPresetsChips) {
    els.spacingPresetsChips.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.dataset.spacing;
        updateSpacingUI(val, true);
        showToast(`Espaçamento definido para ${val} m`);
      });
    });
  }

  // --- GERAR LINHAS DE PLANTIO ---
  async function generatePlantingLines() {
    if (!state.currentPolygon) return;
    plantingLinesLayer.clearLayers();
    headlandLayer.clearLayers();
    guideLineLayer.clearLayers();

    const poly = state.currentPolygon;
    const width = state.implementWidth || (state.activeMachine ? state.activeMachine.widthMeters : 12.0);
    let result = null;

    if (state.mode === 'straight-ab') {
      result = GuidanceEngine.generateStraightAB(poly, width, state.headingAngle, state.customABPoints);
    } else if (state.mode === 'contour') {
      // Se necessário, assegura grade DEM antes
      const bbox = turf.bbox(poly);
      if (!ElevationDem.cachedGrid) {
        showToast('Preparando elevação para curvas de nível...');
        try {
          await ElevationDem.ensureGrid(bbox);
        } catch(e) {
          console.warn('Usando modelo estimado para curvas:', e);
        }
      }
      result = GuidanceEngine.generateContourDEM(poly, width, state.contourPercentile, ElevationDem.cachedGrid);
    }

    if (result) {
      state.generatedLines = result.plantingSegments;
      state.guideLine = result.guideLineCoords;

      if (result.guideLineCoords && result.guideLineCoords.length >= 2) {
        L.polyline(result.guideLineCoords.map(c => [c[1], c[0]]), {
          color: '#f39c12', weight: 3.5, dashArray: '8, 6'
        }).addTo(guideLineLayer);
      }

      result.plantingSegments.forEach(seg => {
        L.polyline(seg.map(c => [c[1], c[0]]), {
          color: '#2ecc71', weight: 2.5, opacity: 0.9
        }).addTo(plantingLinesLayer);
      });
    }

    // Cabeceiras / Bordaduras
    if (state.headlandPasses > 0) {
      const hlines = GuidanceEngine.generateHeadlands(poly, width, state.headlandPasses);
      state.headlandLines = hlines;
      hlines.forEach(hcoords => {
        L.polyline(hcoords.map(c => [c[1], c[0]]), {
          color: '#3498db', weight: 2.5, dashArray: '4, 4'
        }).addTo(headlandLayer);
      });
    }

    renderSectionHUDBoxes();
    const hasLines = state.generatedLines.length > 0;
    els.btnExportPlantingKML.disabled = !hasLines;
    if (els.exportFormatSelect) els.exportFormatSelect.disabled = !hasLines;
    if (els.btnExportMasterAB) els.btnExportMasterAB.disabled = !state.guideLine || state.guideLine.length < 2;
    saveGisState();
    showToast(`Geradas ${state.generatedLines.length} passadas de plantio (${width.toFixed(1)}m)!`);
  }

  els.btnGenerateLines.addEventListener('click', generatePlantingLines);

  // --- EXPORTAR LINHAS (KML / GPX / GeoJSON) ---
  els.btnExportPlantingKML.addEventListener('click', () => {
    if (state.generatedLines.length === 0) return alert('Gere as linhas de plantio antes de exportar.');
    const fieldName = state.currentFieldMeta ? state.currentFieldMeta.name : 'Talhao_AgroLinhas';
    const fmt = (els.exportFormatSelect && els.exportFormatSelect.value) || 'kml';

    if (fmt === 'gpx') {
      // Exportar GPX
      let gpxTracks = state.generatedLines.map((seg, i) => {
        const pts = seg.map(c => `<trkpt lat="${c[1].toFixed(8)}" lon="${c[0].toFixed(8)}"></trkpt>`).join('\n        ');
        return `<trk><name>Linha ${i + 1}</name><trkseg>${pts}</trkseg></trk>`;
      }).join('\n  ');
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AgroLinhas Pro" xmlns="http://www.topografix.com/GPX/1/1">\n  ${gpxTracks}\n</gpx>`;
      downloadFile(gpx, `${fieldName}_linhas_plantio.gpx`, 'application/gpx+xml');
      showToast('GPX das Linhas de Plantio exportado!');
    } else if (fmt === 'geojson') {
      // Exportar GeoJSON
      const features = state.generatedLines.map((seg, i) => ({
        type: 'Feature',
        properties: { name: `Linha ${i + 1}` },
        geometry: { type: 'LineString', coordinates: seg }
      }));
      const gj = JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
      downloadFile(gj, `${fieldName}_linhas_plantio.geojson`, 'application/json');
      showToast('GeoJSON das Linhas de Plantio exportado!');
    } else {
      // KML (padrão)
      const kml = GuidanceEngine.exportToKML({
        plantingSegments: state.generatedLines,
        guideLineCoords: state.guideLine,
        headlandRings: state.headlandLines
      }, state.currentPolygon, fieldName);
      downloadFile(kml, `${fieldName}_linhas_plantio.kml`, 'application/vnd.google-earth.kml+xml');
      showToast('KML das Linhas de Plantio exportado com sucesso!');
    }
  });

  // --- EXPORTAR LINHA-GUIA MESTRE A-B (.XML) ---
  if (els.btnExportMasterAB) {
    els.btnExportMasterAB.addEventListener('click', () => {
      if (!state.guideLine || state.guideLine.length < 2) return alert('Gere as linhas de plantio primeiro (necessário A-B).');
      const fieldName = state.currentFieldMeta ? state.currentFieldMeta.name : 'Talhao_AgroLinhas';
      const ptA = state.guideLine[0];
      const ptB = state.guideLine[state.guideLine.length - 1];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ABLine>\n  <Name>${fieldName}</Name>\n  <A>\n    <Latitude>${ptA[1].toFixed(10)}</Latitude>\n    <Longitude>${ptA[0].toFixed(10)}</Longitude>\n  </A>\n  <B>\n    <Latitude>${ptB[1].toFixed(10)}</Latitude>\n    <Longitude>${ptB[0].toFixed(10)}</Longitude>\n  </B>\n  <Heading>${state.headingAngle}</Heading>\n</ABLine>`;
      downloadFile(xml, `${fieldName}_linha_guia_AB.xml`, 'application/xml');
      showToast('Linha-Guia Mestre A-B exportada como .xml!');
    });
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- FLOATING MAP TOOLS & LAYERS ---
  els.btnLayerPicker.addEventListener('click', () => {
    els.layerSelectorModal.classList.toggle('active');
  });

  document.querySelectorAll('.layer-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const k = opt.dataset.layer;
      Object.values(baseLayers).forEach(l => map.removeLayer(l));
      if (baseLayers[k]) baseLayers[k].addTo(map);
      document.querySelectorAll('.layer-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      els.layerSelectorModal.classList.remove('active');
    });
  });

  els.btnToggleCoverage.addEventListener('click', () => {
    state.showCoverageLayer = !state.showCoverageLayer;
    els.btnToggleCoverage.classList.toggle('active', state.showCoverageLayer);
    if (state.showCoverageLayer) {
      map.addLayer(coverageLayer);
      showToast('Mapa de Aplicação Visível');
    } else {
      map.removeLayer(coverageLayer);
      showToast('Mapa de Aplicação Ocultado');
    }
  });

  els.btnGpsLocate.addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocalização não disponível.');
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      map.setView([lat, lng], 17);
      if (!tractorMarker) tractorMarker = L.marker([lat, lng], { icon: tractorIcon }).addTo(tractorLayer);
      else tractorMarker.setLatLng([lat, lng]);
      showToast('Posição GPS centralizada!');
    }, err => showToast('Erro GPS: ' + err.message));
  });

  els.btnFitBounds.addEventListener('click', () => {
    if (drawnItems.getLayers().length > 0) map.fitBounds(drawnItems.getBounds(), { padding: [40, 40] });
    else showToast('Nenhum talhão carregado.');
  });

  // --- 🌍 GOOGLE EARTH STYLE NAVIGATION & ZOOM CONTROLLER ---
  const btnGeZoomIn = document.getElementById('btnGeZoomIn');
  const btnGeZoomOut = document.getElementById('btnGeZoomOut');
  const geZoomSlider = document.getElementById('geZoomSlider');
  const btnGeCompass = document.getElementById('btnGeCompass');
  const geCompassNeedle = document.getElementById('geCompassNeedle');
  const btnGeSearch = document.getElementById('btnGeSearch');
  const geSearchBar = document.getElementById('geSearchBar');
  const geSearchInput = document.getElementById('geSearchInput');
  const btnGeDoSearch = document.getElementById('btnGeDoSearch');
  const btnGeCloseSearch = document.getElementById('btnGeCloseSearch');
  const btnGeFit = document.getElementById('btnGeFit');

  if (btnGeZoomIn) {
    btnGeZoomIn.addEventListener('click', () => map.zoomIn());
  }

  if (btnGeZoomOut) {
    btnGeZoomOut.addEventListener('click', () => map.zoomOut());
  }

  if (geZoomSlider) {
    geZoomSlider.value = map.getZoom();
    map.on('zoomend', () => {
      geZoomSlider.value = map.getZoom();
    });
    geZoomSlider.addEventListener('input', e => {
      map.setZoom(parseInt(e.target.value, 10));
    });
  }

  if (btnGeCompass) {
    btnGeCompass.addEventListener('click', () => {
      if (geCompassNeedle) {
        geCompassNeedle.style.transform = 'rotate(-25deg)';
        setTimeout(() => geCompassNeedle.style.transform = 'rotate(15deg)', 150);
        setTimeout(() => geCompassNeedle.style.transform = 'rotate(0deg)', 300);
      }
      showToast('Orientação Norte alinhada');
    });
  }

  if (btnGeFit) {
    btnGeFit.addEventListener('click', () => {
      if (drawnItems.getLayers().length > 0) {
        map.fitBounds(drawnItems.getBounds(), { padding: [40, 40] });
      } else {
        map.setView([-12.805, -55.503], 14);
        showToast('Visão padrão redefinida.');
      }
    });
  }

  // Lupa de Busca (Search Flyout)
  let searchMarker = null;

  if (btnGeSearch && geSearchBar) {
    btnGeSearch.addEventListener('click', () => {
      const isVisible = geSearchBar.style.display === 'flex';
      geSearchBar.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible && geSearchInput) {
        geSearchInput.focus();
      }
    });
  }

  if (btnGeCloseSearch && geSearchBar) {
    btnGeCloseSearch.addEventListener('click', () => {
      geSearchBar.style.display = 'none';
    });
  }

  async function executeMapSearch() {
    if (!geSearchInput) return;
    const query = geSearchInput.value.trim();
    if (!query) return;

    // 1. Verifica se são coordenadas Lat, Lon (ex: -12.805, -55.503)
    const coordMatch = query.match(/^([-+]?\d{1,3}\.?\d*)[,\s]+([-+]?\d{1,3}\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        map.flyTo([lat, lng], 16, { duration: 1.5 });
        if (searchMarker) map.removeLayer(searchMarker);
        searchMarker = L.marker([lat, lng]).addTo(map).bindPopup(`📍 <b>Coordenadas:</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
        showToast(`Voando para: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        return;
      }
    }

    // 2. Busca por texto / município via Nominatim Geocoding API
    showToast(`Buscando localidade: "${query}"...`);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const place = data[0];
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        map.flyTo([lat, lng], 15, { duration: 1.5 });
        if (searchMarker) map.removeLayer(searchMarker);
        searchMarker = L.marker([lat, lng]).addTo(map).bindPopup(`📍 <b>${place.display_name}</b>`).openPopup();
        showToast(`Encontrado: ${place.display_name.split(',')[0]}`);
      } else {
        showToast(`Nenhum local encontrado para: "${query}"`);
      }
    } catch(err) {
      showToast('Erro ao pesquisar localidade: ' + err.message);
    }
  }

  if (btnGeDoSearch) {
    btnGeDoSearch.addEventListener('click', executeMapSearch);
  }

  if (geSearchInput) {
    geSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        executeMapSearch();
      }
    });
  }

  // --- GUIDANCE SUBPANES TABS ---
  document.querySelectorAll('.gis-tab-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gis-tab-btn[data-mode]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.guidance-subpane').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      const pane = document.getElementById('pane-' + btn.dataset.mode);
      if (pane) pane.style.display = 'flex';
      state.mode = btn.dataset.mode;
    });
  });

  // --- SECTION CONTROL & AGRIBUS HUD ---
  function renderSectionHUDBoxes() {
    if (!els.sectionBoxesContainer) return;
    els.sectionBoxesContainer.innerHTML = '';
    const num = state.activeMachine.numSections;
    for (let i = 1; i <= num; i++) {
      const box = document.createElement('div');
      box.className = 'sec-box active';
      box.id = 'hud_sec_' + i;
      box.textContent = 'S' + i;
      els.sectionBoxesContainer.appendChild(box);
    }
  }

  function updateHUDSectionStates(states) {
    states.forEach((isActive, idx) => {
      const el = document.getElementById('hud_sec_' + (idx + 1));
      if (el) el.className = 'sec-box ' + (isActive ? 'active' : 'shutoff');
    });
  }

  function updateLightbarLEDs(deviationMeters, heading, speedKmH, trackIdx) {
    els.hudHeading.textContent = `${Math.round(heading)}°`;
    els.hudSpeed.textContent = `${speedKmH.toFixed(1)} km/h`;
    els.hudTrackNum.textContent = `Passada: #${trackIdx + 1}`;

    const devCm = Math.round(deviationMeters * 100);
    const absDevCm = Math.abs(devCm);
    els.hudDevValue.textContent = `${(absDevCm / 100).toFixed(2)} m (${devCm < 0 ? 'E' : 'D'})`;
    els.hudDevDirection.textContent = absDevCm <= 12 ? 'Alinhado' : (devCm < 0 ? '◄◄ Corrigir Direita' : 'Corrigir Esquerda ►►');

    const leds = document.querySelectorAll('.hud-led:not(.center-marker)');
    leds.forEach(led => {
      led.className = 'hud-led';
      const idx = parseInt(led.dataset.idx, 10);
      if (Math.abs(devCm) <= 12 && (idx === -1 || idx === 1)) {
        led.classList.add('active-green');
      } else if (devCm > 12 && idx > 0) {
        if (idx <= 3 && devCm <= 40) led.classList.add('active-yellow');
        else if (idx > 3) led.classList.add('active-red');
      } else if (devCm < -12 && idx < 0) {
        if (idx >= -3 && devCm >= -40) led.classList.add('active-yellow');
        else if (idx < -3) led.classList.add('active-red');
      }
    });
  }

  // --- SIMULATION & CABIN NAVIGATION ---
  els.btnStartSim.addEventListener('click', () => {
    if (state.generatedLines.length === 0) return alert('Gere as linhas de plantio antes de simular.');
    startSimulation();
  });

  function startSimulation() {
    state.isNavigating = true;
    state.navMode = 'sim';
    els.agribusHud.classList.add('active');
    els.btnStartSim.style.display = 'none';
    els.btnStopNav.style.display = 'flex';

    let lineIdx = 0, stepIdx = 0;
    const lines = state.generatedLines;

    if (state.simTimer) clearInterval(state.simTimer);

    state.simTimer = setInterval(() => {
      if (lineIdx >= lines.length) {
        clearInterval(state.simTimer);
        showToast('Simulação concluída!');
        stopNavigation();
        return;
      }

      const curLine = lines[lineIdx];
      if (stepIdx >= curLine.length) {
        lineIdx++;
        stepIdx = 0;
        return;
      }

      const curPt = curLine[stepIdx];
      const nextPt = curLine[Math.min(stepIdx + 1, curLine.length - 1)];
      let bearing = turf.bearing(turf.point(curPt), turf.point(nextPt));
      if (isNaN(bearing)) bearing = state.headingAngle;

      const simDev = Math.sin(stepIdx * 0.4) * (GnssStation.status.fixQuality === 4 ? 0.04 : 0.22);

      if (!tractorMarker) tractorMarker = L.marker([curPt[1], curPt[0]], { icon: tractorIcon }).addTo(tractorLayer);
      else tractorMarker.setLatLng([curPt[1], curPt[0]]);

      const iconEl = document.getElementById('tractorIconMarker');
      if (iconEl) iconEl.style.transform = `rotate(${bearing}deg)`;

      updateLightbarLEDs(simDev, (bearing + 360) % 360, state.activeMachine.defaultSpeedKmH, lineIdx);

      // Section control processing
      const secRes = SectionEngine.processSections({
        position: curPt,
        heading: (bearing + 360) % 360,
        speedKmH: state.activeMachine.defaultSpeedKmH,
        implementWidth: state.activeMachine.widthMeters,
        numSections: state.activeMachine.numSections,
        autoControl: true,
        fieldPolygon: state.currentPolygon
      });

      updateHUDSectionStates(secRes.sectionStates);

      if (state.showCoverageLayer && secRes.newPolygons.length > 0) {
        secRes.newPolygons.forEach(pts => {
          L.polygon(pts.map(c => [c[1], c[0]]), {
            color: '#2ecc71', fillColor: '#2ecc71', fillOpacity: 0.35, weight: 0
          }).addTo(coverageLayer);
        });
      }

      stepIdx++;
    }, 400 / state.simSpeedMultiplier);

    showToast('Simulação de cabine iniciada!');
  }

  function stopNavigation() {
    state.isNavigating = false;
    state.navMode = 'none';
    if (state.simTimer) clearInterval(state.simTimer);
    els.btnStartSim.style.display = 'flex';
    els.btnStopNav.style.display = 'none';
    showToast('Navegação pausada.');
  }

  els.btnStopNav.addEventListener('click', stopNavigation);

  // --- TABLES RENDERING (FIELDS & FLEET) ---
  function renderFieldsTable() {
    if (!els.fieldsTableBody) return;
    const fields = FieldManager.getAll();
    els.fieldsTableBody.innerHTML = '';

    fields.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700;">${f.name}</td>
        <td>${f.farm}</td>
        <td><span class="chip active" style="padding:2px 8px; font-size:10px;">${f.crop}</span></td>
        <td style="font-weight:800; color:var(--accent);">${f.areaHa} ha</td>
        <td>${f.date}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-load-field" data-id="${f.id}" style="padding:4px 8px; font-size:11px;">
              <i class="fa-solid fa-map"></i> Carregar
            </button>
            <button class="btn btn-danger btn-del-field" data-id="${f.id}" style="padding:4px 8px; font-size:11px;">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      els.fieldsTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-load-field').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.target.closest('button').dataset.id;
        const field = fields.find(f => f.id === id);
        if (field) {
          setPolygon(field.polygon, field);
          switchView('gis');
        }
      });
    });

    document.querySelectorAll('.btn-del-field').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.target.closest('button').dataset.id;
        FieldManager.remove(id);
        renderFieldsTable();
        showToast('Talhão removido.');
      });
    });
  }

  // --- TABELA DE EQUIPAMENTOS & GESTÃO DA FROTA ---
  function renderFleetTable() {
    const machines = FleetManager.getAll();

    // Sincronizar seletor rápido no Card 3 da tela GIS
    if (els.quickMachineSelect) {
      els.quickMachineSelect.innerHTML = machines.map(m => `
        <option value="${m.id}" ${m.active ? 'selected' : ''}>
          ${m.brand ? m.brand + ' - ' : ''}${m.model || m.name} (${m.widthMeters}m)
        </option>
      `).join('');
    }

    if (!els.fleetTableBody) return;
    els.fleetTableBody.innerHTML = '';

    const filterCat = state.fleetFilterCategory || 'all';
    const query = (state.fleetSearchQuery || '').toLowerCase().trim();

    const filtered = machines.filter(m => {
      const matchCat = (filterCat === 'all') || (m.category === filterCat);
      const matchQuery = !query || 
        (m.name && m.name.toLowerCase().includes(query)) ||
        (m.brand && m.brand.toLowerCase().includes(query)) ||
        (m.model && m.model.toLowerCase().includes(query)) ||
        (m.category && m.category.toLowerCase().includes(query)) ||
        (m.notes && m.notes.toLowerCase().includes(query));
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">Nenhum equipamento encontrado com os filtros selecionados.</td>`;
      els.fleetTableBody.appendChild(tr);
      return;
    }

    filtered.forEach(m => {
      const tr = document.createElement('tr');
      if (m.active) tr.style.background = 'rgba(46,204,113,0.08)';

      const catBadgeColor = m.category.includes('Distribuidor') ? '#f39c12' : 
                           (m.category.includes('Pulverizador') ? '#3498db' : '#2ecc71');

      tr.innerHTML = `
        <td style="font-weight:700;">
          <div style="display:flex; align-items:center; gap:8px;">
            ${m.active ? '<span class="brand-badge" style="background:var(--accent); font-size:9.5px;">ATIVO</span>' : '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--text-muted); opacity:0.4;"></span>'}
            <span style="font-size:13px;">${m.name}</span>
          </div>
        </td>
        <td>
          <span style="font-size:10.5px; padding:2px 7px; border-radius:4px; background:rgba(255,255,255,0.06); color:${catBadgeColor}; font-weight:600; border:1px solid rgba(255,255,255,0.1);">
            ${m.category}
          </span>
        </td>
        <td><b>${m.brand || '-'}</b> ${m.model ? `<span style="color:var(--text-muted);">(${m.model})</span>` : ''}</td>
        <td style="font-weight:800; color:var(--gold); font-size:13px;">${m.widthMeters} m</td>
        <td>${m.capacityLiters ? m.capacityLiters.toLocaleString() + ' L' : '-'}${m.maxPayloadKg ? ' / ' + m.maxPayloadKg.toLocaleString() + ' kg' : ''}</td>
        <td>${m.requiredPowerHp ? m.requiredPowerHp + ' CV' : '-'}${m.ptoSpeedRpm ? `<div style="font-size:10px; color:var(--text-muted);">TDP ${m.ptoSpeedRpm} rpm</div>` : ''}</td>
        <td style="font-size:11.5px; color:var(--text-muted);">${m.couplingSystem || '-'}</td>
        <td style="text-align:right;">
          <div style="display:flex; justify-content:flex-end; gap:5px;">
            <button class="btn ${m.active ? 'btn-outline' : 'btn-primary'} btn-activate-machine" data-id="${m.id}" style="padding:4px 8px; font-size:11px;" title="Ativar para traçado">
              ${m.active ? '<i class="fa-solid fa-check"></i> Em Uso' : 'Usar'}
            </button>
            <button class="btn btn-outline btn-view-eq" data-id="${m.id}" style="padding:4px 7px; font-size:11px;" title="Ver Ficha Técnica Completa">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn btn-outline btn-edit-eq" data-id="${m.id}" style="padding:4px 7px; font-size:11px;" title="Editar">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-danger btn-del-eq" data-id="${m.id}" style="padding:4px 7px; font-size:11px;" title="Excluir">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      els.fleetTableBody.appendChild(tr);
    });

    // Event listeners dos botões da tabela
    els.fleetTableBody.querySelectorAll('.btn-activate-machine').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.target.closest('button').dataset.id;
        activateMachine(id);
      });
    });

    els.fleetTableBody.querySelectorAll('.btn-view-eq').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.target.closest('button').dataset.id;
        openEquipmentDetail(id);
      });
    });

    els.fleetTableBody.querySelectorAll('.btn-edit-eq').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.target.closest('button').dataset.id;
        openEditEquipmentModal(id);
      });
    });

    els.fleetTableBody.querySelectorAll('.btn-del-eq').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.target.closest('button').dataset.id;
        const eq = FleetManager.getById(id);
        if (confirm(`Deseja realmente excluir o equipamento "${eq ? eq.name : id}"?`)) {
          FleetManager.delete(id);
          state.activeMachine = FleetManager.getActive();
          updateSpacingUI(state.activeMachine.widthMeters, true);
          renderFleetTable();
          showToast('Equipamento excluído.');
        }
      });
    });
  }

  function activateMachine(id) {
    FleetManager.setActive(id);
    state.activeMachine = FleetManager.getActive();
    if (state.activeMachine) {
      updateSpacingUI(state.activeMachine.widthMeters, true);
    }
    renderFleetTable();
    renderSectionHUDBoxes();
    showToast(`Equipamento selecionado: ${state.activeMachine.name} (${state.activeMachine.widthMeters}m)!`);
  }

  // Seletor rápido de máquina no Card 3
  if (els.quickMachineSelect) {
    els.quickMachineSelect.addEventListener('change', e => {
      activateMachine(e.target.value);
    });
  }

  // Filtro de categoria no Banco de Equipamentos
  if (els.equipmentCategoryFilter) {
    els.equipmentCategoryFilter.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        els.equipmentCategoryFilter.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.fleetFilterCategory = chip.dataset.cat;
        renderFleetTable();
      });
    });
  }

  // Busca em tempo real de equipamentos
  if (els.equipmentSearchInput) {
    els.equipmentSearchInput.addEventListener('input', e => {
      state.fleetSearchQuery = e.target.value;
      renderFleetTable();
    });
  }

  // Modal de Detalhes / Ficha Técnica
  function openEquipmentDetail(id) {
    const eq = FleetManager.getById(id);
    if (!eq) return;
    state.selectedDetailMachineId = id;

    if (els.eqDetailTitle) {
      els.eqDetailTitle.innerHTML = `<i class="fa-solid fa-file-lines" style="color:var(--accent);"></i> ${eq.name}`;
    }

    if (els.eqDetailBody) {
      const dims = eq.dimensions || {};
      els.eqDetailBody.innerHTML = `
        <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; border:1px solid var(--border-color); display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
          <div><div style="font-size:10.5px; color:var(--text-muted); text-transform:uppercase;">Largura de Trabalho</div><div style="font-size:16px; font-weight:800; color:var(--gold);">${eq.widthMeters} m</div></div>
          <div><div style="font-size:10.5px; color:var(--text-muted); text-transform:uppercase;">Capacidade Volumétrica</div><div style="font-size:14px; font-weight:700;">${eq.capacityLiters ? eq.capacityLiters.toLocaleString() + ' L' : 'Não se aplica'}</div></div>
          <div><div style="font-size:10.5px; color:var(--text-muted); text-transform:uppercase;">Capacidade de Carga</div><div style="font-size:14px; font-weight:700;">${eq.maxPayloadKg ? eq.maxPayloadKg.toLocaleString() + ' kg' : 'Não se aplica'}</div></div>
          <div><div style="font-size:10.5px; color:var(--text-muted); text-transform:uppercase;">Potência Requerida</div><div style="font-size:14px; font-weight:700;">${eq.requiredPowerHp ? eq.requiredPowerHp + ' CV' : 'Não se aplica'}</div></div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="card" style="padding:10px;">
            <div class="card-title" style="font-size:11px; margin-bottom:6px;"><i class="fa-solid fa-gears"></i> Mecânica & TDP</div>
            <div style="display:flex; flex-direction:column; gap:4px; font-size:11.5px;">
              <div><b>Acoplamento:</b> ${eq.couplingSystem || '-'}</div>
              <div><b>Rotação TDP:</b> ${eq.ptoSpeedRpm ? eq.ptoSpeedRpm + ' rpm' : '-'}</div>
              <div><b>Rotação Discos:</b> ${eq.diskSpeedRpm ? eq.diskSpeedRpm + ' rpm' : '-'}</div>
              <div><b>Peso Vazio:</b> ${eq.emptyWeightKg ? eq.emptyWeightKg.toLocaleString() + ' kg' : '-'}</div>
            </div>
          </div>
          <div class="card" style="padding:10px;">
            <div class="card-title" style="font-size:11px; margin-bottom:6px;"><i class="fa-solid fa-ruler-combined"></i> Dimensões & Bitola</div>
            <div style="display:flex; flex-direction:column; gap:4px; font-size:11.5px;">
              <div><b>Comp. x Larg. x Alt.:</b> ${dims.lengthMm ? dims.lengthMm + ' x ' + dims.widthMm + ' x ' + dims.heightMm + ' mm' : '-'}</div>
              <div><b>Bitola das Rodas:</b> ${eq.wheelTrackMm ? eq.wheelTrackMm + ' mm' : '-'}</div>
              <div><b>Vão Livre sob Eixo:</b> ${eq.groundClearanceMm ? eq.groundClearanceMm + ' mm' : '-'}</div>
              <div><b>Data Cadastro:</b> ${eq.registeredDate || '-'}</div>
            </div>
          </div>
        </div>

        ${eq.notes ? `
          <div class="card" style="padding:10px; background:rgba(0,0,0,0.2);">
            <div class="card-title" style="font-size:11px; margin-bottom:4px;"><i class="fa-solid fa-seedling"></i> Observações & Aplicação</div>
            <div style="font-size:12px; line-height:1.4; color:var(--text-main);">${eq.notes}</div>
          </div>
        ` : ''}
      `;
    }

    if (els.eqDetailSourceLink) {
      if (eq.sourceUrl && eq.sourceUrl.startsWith('http')) {
        els.eqDetailSourceLink.href = eq.sourceUrl;
        els.eqDetailSourceLink.style.display = 'inline-flex';
      } else {
        els.eqDetailSourceLink.style.display = 'none';
      }
    }

    if (els.modalEquipmentDetails) {
      els.modalEquipmentDetails.classList.add('active');
    }
  }

  if (els.btnCloseEqDetailModal) {
    els.btnCloseEqDetailModal.addEventListener('click', () => {
      els.modalEquipmentDetails.classList.remove('active');
    });
  }

  if (els.btnSelectFromDetail) {
    els.btnSelectFromDetail.addEventListener('click', () => {
      if (state.selectedDetailMachineId) {
        activateMachine(state.selectedDetailMachineId);
        els.modalEquipmentDetails.classList.remove('active');
        switchView('gis');
      }
    });
  }

  // Modal de Cadastro / Edição
  function openEditEquipmentModal(id = null) {
    if (!els.modalEquipmentForm) return;

    if (id) {
      const eq = FleetManager.getById(id);
      if (!eq) return;
      els.equipmentFormTitle.innerHTML = `<i class="fa-solid fa-pen"></i> Editar Equipamento`;
      els.eqFormId.value = eq.id;
      els.eqFormCategory.value = eq.category || 'Outros';
      els.eqFormBrand.value = eq.brand || '';
      els.eqFormModel.value = eq.model || '';
      els.eqFormName.value = eq.name || '';
      els.eqFormWidth.value = eq.widthMeters || '';
      els.eqFormCapacity.value = eq.capacityLiters || '';
      els.eqFormPayload.value = eq.maxPayloadKg || '';
      els.eqFormPower.value = eq.requiredPowerHp || '';
      els.eqFormPto.value = eq.ptoSpeedRpm || '';
      els.eqFormDisks.value = eq.diskSpeedRpm || '';
      els.eqFormCoupling.value = eq.couplingSystem || 'Barra de tracao';
      els.eqFormWeight.value = eq.emptyWeightKg || '';
      els.eqFormHeight.value = (eq.dimensions && eq.dimensions.heightMm) || '';
      els.eqFormDimWidth.value = (eq.dimensions && eq.dimensions.widthMm) || '';
      els.eqFormLength.value = (eq.dimensions && eq.dimensions.lengthMm) || '';
      els.eqFormTrack.value = eq.wheelTrackMm || '';
      els.eqFormClearance.value = eq.groundClearanceMm || '';
      els.eqFormNotes.value = eq.notes || '';
      els.eqFormSource.value = eq.sourceUrl || '';
    } else {
      els.equipmentFormTitle.innerHTML = `<i class="fa-solid fa-tractor"></i> Cadastrar Equipamento Agrícola`;
      els.formEquipment.reset();
      els.eqFormId.value = '';
    }

    els.modalEquipmentForm.classList.add('active');
  }

  if (els.btnOpenAddEquipmentModal) {
    els.btnOpenAddEquipmentModal.addEventListener('click', () => openEditEquipmentModal(null));
  }

  if (els.btnCloseEquipmentFormModal) {
    els.btnCloseEquipmentFormModal.addEventListener('click', () => {
      els.modalEquipmentForm.classList.remove('active');
    });
  }

  if (els.btnCancelEquipmentForm) {
    els.btnCancelEquipmentForm.addEventListener('click', () => {
      els.modalEquipmentForm.classList.remove('active');
    });
  }

  if (els.formEquipment) {
    els.formEquipment.addEventListener('submit', e => {
      e.preventDefault();
      const id = els.eqFormId.value;
      const eqData = {
        category: els.eqFormCategory.value,
        brand: els.eqFormBrand.value.trim(),
        model: els.eqFormModel.value.trim(),
        name: els.eqFormName.value.trim() || `${els.eqFormModel.value.trim()} - ${els.eqFormBrand.value.trim()}`,
        implement: els.eqFormName.value.trim() || `${els.eqFormModel.value.trim()} - ${els.eqFormBrand.value.trim()}`,
        widthMeters: parseFloat(els.eqFormWidth.value) || 12.0,
        distributionWidthM: parseFloat(els.eqFormWidth.value) || 12.0,
        capacityLiters: parseFloat(els.eqFormCapacity.value) || null,
        maxPayloadKg: parseFloat(els.eqFormPayload.value) || null,
        requiredPowerHp: parseFloat(els.eqFormPower.value) || null,
        ptoSpeedRpm: parseFloat(els.eqFormPto.value) || null,
        diskSpeedRpm: parseFloat(els.eqFormDisks.value) || null,
        couplingSystem: els.eqFormCoupling.value,
        emptyWeightKg: parseFloat(els.eqFormWeight.value) || null,
        dimensions: {
          heightMm: parseFloat(els.eqFormHeight.value) || null,
          widthMm: parseFloat(els.eqFormDimWidth.value) || null,
          lengthMm: parseFloat(els.eqFormLength.value) || null
        },
        wheelTrackMm: parseFloat(els.eqFormTrack.value) || null,
        groundClearanceMm: parseFloat(els.eqFormClearance.value) || null,
        notes: els.eqFormNotes.value.trim(),
        sourceUrl: els.eqFormSource.value.trim()
      };

      if (id) {
        FleetManager.update(id, eqData);
        showToast('Equipamento atualizado com sucesso!');
      } else {
        const added = FleetManager.add(eqData);
        showToast(`Equipamento "${added.name}" cadastrado!`);
      }

      state.activeMachine = FleetManager.getActive();
      updateSpacingUI(state.activeMachine.widthMeters, true);
      renderFleetTable();
      els.modalEquipmentForm.classList.remove('active');
    });
  }

  // Importar Planilha XLSX / CSV
  if (els.btnImportXlsx && els.xlsxFileInput) {
    els.btnImportXlsx.addEventListener('click', () => {
      els.xlsxFileInput.click();
    });

    els.xlsxFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          if (typeof XLSX === 'undefined') {
            alert('Biblioteca XLSX carregando... tente novamente em instantes.');
            return;
          }
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet);

          const addedCount = FleetManager.importFromRawObjects(jsonRows);
          state.activeMachine = FleetManager.getActive();
          updateSpacingUI(state.activeMachine.widthMeters, true);
          renderFleetTable();
          showToast(`${addedCount} equipamento(s) importado(s) da planilha com sucesso!`);
        } catch(err) {
          console.error('Erro ao ler XLSX:', err);
          alert('Erro ao importar planilha: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    });
  }

  // Exportar Banco em JSON
  if (els.btnExportEquipmentJson) {
    els.btnExportEquipmentJson.addEventListener('click', () => {
      const all = FleetManager.getAll();
      const jsonStr = JSON.stringify(all, null, 2);
      downloadFile(jsonStr, 'banco_equipamentos_agricolas.json', 'application/json');
      showToast('Banco de equipamentos exportado com sucesso!');
    });
  }

  // Restaurar Padrão
  if (els.btnResetEquipmentDefaults) {
    els.btnResetEquipmentDefaults.addEventListener('click', () => {
      if (confirm('Deseja restaurar o banco de equipamentos para o catálogo padrão original?')) {
        FleetManager.resetDefaults();
        state.activeMachine = FleetManager.getActive();
        updateSpacingUI(state.activeMachine.widthMeters, true);
        renderFleetTable();
        showToast('Catálogo de equipamentos restaurado!');
      }
    });
  }

  // --- GNSS / RTK MODAL CONTROLS ---
  els.rtkPill.addEventListener('click', () => {
    els.gnssModal.classList.add('active');
  });

  els.btnCloseGnssModal.addEventListener('click', () => {
    els.gnssModal.classList.remove('active');
  });

  els.btnSimFix.addEventListener('click', () => {
    GnssStation.status.fixQuality = 4;
    GnssStation.status.fixType = 'RTK FIX';
    GnssStation.status.accuracyMeters = 0.018;
    GnssStation.status.satellites = 24;
    updateGnssUI();
    showToast('RTK FIX Centimétrico Ativado (±1.8cm)');
  });

  els.btnSimFloat.addEventListener('click', () => {
    GnssStation.status.fixQuality = 5;
    GnssStation.status.fixType = 'RTK FLOAT';
    GnssStation.status.accuracyMeters = 0.18;
    GnssStation.status.satellites = 18;
    updateGnssUI();
    showToast('RTK FLOAT Ativado (±18cm)');
  });

  els.btnDisconnectGnss.addEventListener('click', () => {
    GnssStation.status.fixQuality = 0;
    GnssStation.status.fixType = 'SEM SINAL';
    GnssStation.status.accuracyMeters = 99.9;
    GnssStation.status.satellites = 0;
    updateGnssUI();
    showToast('Antena GNSS Desconectada');
  });

  function updateGnssUI() {
    const s = GnssStation.status;
    els.rtkLabel.textContent = s.fixType;
    els.rtkSats.textContent = `(${s.satellites} sats)`;
    els.rtkDot.className = `rtk-indicator-dot ${s.fixQuality === 4 ? 'fix' : (s.fixQuality === 5 ? 'float' : 'none')}`;
    els.hudAccuracy.textContent = `±${(s.accuracyMeters * 100).toFixed(0)}cm`;
  }

  // --- CENTRAL DE AJUDA & MANUAL INTERATIVO ---
  const helpModal = document.getElementById('helpModal');
  const btnOpenHelpModal = document.getElementById('btnOpenHelpModal');
  const navItemHelp = document.getElementById('navItemHelp');
  const btnCloseHelpModal = document.getElementById('btnCloseHelpModal');
  const helpSearchFilter = document.getElementById('helpSearchFilter');
  const helpMainContent = document.getElementById('helpMainContent');

  function openHelpModal(targetId = null) {
    if (helpModal) {
      helpModal.classList.add('active');
      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }

  function closeHelpModal() {
    if (helpModal) helpModal.classList.remove('active');
  }

  if (btnOpenHelpModal) btnOpenHelpModal.addEventListener('click', () => openHelpModal());
  if (navItemHelp) navItemHelp.addEventListener('click', () => openHelpModal());
  if (btnCloseHelpModal) btnCloseHelpModal.addEventListener('click', closeHelpModal);

  // Navegação de capítulos no menu lateral do Help Modal
  document.querySelectorAll('.help-chapter-link').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.help-chapter-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const targetId = link.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Filtro de busca de tópicos no manual
  if (helpSearchFilter) {
    helpSearchFilter.addEventListener('input', e => {
      const term = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.help-doc-section').forEach(sec => {
        const text = sec.textContent.toLowerCase();
        sec.style.display = text.includes(term) ? 'block' : 'none';
      });
    });
  }

  // --- PERSISTÊNCIA AUTOMÁTICA DO WORKSPACE GIS ---
  const GIS_STORAGE_KEY = 'agrolinhas_active_gis_workspace_v2';

  function saveGisState() {
    try {
      if (!state.currentPolygon) {
        localStorage.removeItem(GIS_STORAGE_KEY);
        return;
      }
      const dataToSave = {
        currentPolygon: state.currentPolygon,
        originalPolygon: state.originalPolygon,
        currentFieldMeta: state.currentFieldMeta,
        generatedLines: state.generatedLines,
        headlandLines: state.headlandLines,
        guideLine: state.guideLine,
        customABPoints: state.customABPoints,
        headingAngle: state.headingAngle,
        mode: state.mode,
        contourPercentile: state.contourPercentile,
        headlandPasses: state.headlandPasses,
        implementWidth: state.implementWidth,
        timestamp: Date.now()
      };
      localStorage.setItem(GIS_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch(e) {
      console.warn('Erro ao salvar estado GIS no localStorage:', e);
    }
  }

  function restoreGisState() {
    try {
      const saved = localStorage.getItem(GIS_STORAGE_KEY);
      if (!saved) return false;
      const data = JSON.parse(saved);
      if (!data || !data.currentPolygon) return false;

      // Restaura parâmetros de traçado
      if (data.headingAngle !== undefined) {
        state.headingAngle = data.headingAngle;
        if (els.headingSlider) els.headingSlider.value = data.headingAngle;
        if (els.headingValDisp) els.headingValDisp.textContent = `${data.headingAngle}°`;
      }
      if (data.mode) {
        state.mode = data.mode;
        document.querySelectorAll('.gis-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.mode === data.mode);
        });
        document.querySelectorAll('.guidance-subpane').forEach(pane => {
          pane.style.display = pane.id === 'pane-' + data.mode ? 'flex' : 'none';
        });
      }
      if (data.implementWidth !== undefined) {
        updateSpacingUI(data.implementWidth, true);
      }
      if (data.contourPercentile !== undefined && els.contourSlider) {
        state.contourPercentile = data.contourPercentile;
        els.contourSlider.value = data.contourPercentile;
        if (els.contourValDisp) els.contourValDisp.textContent = `${data.contourPercentile}%`;
      }

      // Restaura polígono e linhas no mapa
      setPolygon(data.currentPolygon, data.currentFieldMeta);

      if (data.generatedLines && data.generatedLines.length > 0) {
        state.generatedLines = data.generatedLines;
        state.guideLine = data.guideLine;
        state.headlandLines = data.headlandLines || [];
        state.customABPoints = data.customABPoints || [];

        data.generatedLines.forEach(seg => {
          L.polyline(seg.map(c => [c[1], c[0]]), { color: '#2ecc71', weight: 2.5, opacity: 0.9 }).addTo(plantingLinesLayer);
        });
        if (data.guideLine && data.guideLine.length >= 2) {
          L.polyline(data.guideLine.map(c => [c[1], c[0]]), { color: '#f39c12', weight: 3.5, dashArray: '8, 6' }).addTo(guideLineLayer);
        }
        if (data.headlandLines) {
          data.headlandLines.forEach(hcoords => {
            L.polyline(hcoords.map(c => [c[1], c[0]]), { color: '#3498db', weight: 2.5, dashArray: '4, 4' }).addTo(headlandLayer);
          });
        }

        els.btnExportPlantingKML.disabled = false;
        if (els.exportFormatSelect) els.exportFormatSelect.disabled = false;
        if (els.btnExportMasterAB) els.btnExportMasterAB.disabled = !data.guideLine || data.guideLine.length < 2;
        renderSectionHUDBoxes();
        updateABStatusText();
      }

      return true;
    } catch(e) {
      console.warn('Erro ao restaurar estado GIS:', e);
      return false;
    }
  }

  // --- INICIALIZAÇÃO DO SISTEMA ---
  renderFleetTable();
  updateSpacingUI(state.implementWidth, true);
  renderSectionHUDBoxes();
  updateZoningHUD([]);

  // Restaura sessão anterior ativa no GIS se houver
  restoreGisState();

  // Registrar Service Worker PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.log('SW Error:', err));
  }

})();
