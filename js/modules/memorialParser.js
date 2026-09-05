/**
 * memorialParser.js
 * Extrai coordenadas UTM e Metadados de Memoriais Descritivos brasileiros (INCRA/CAR/SIGEF/Topografia)
 * e converte para Lat/Lon (WGS84) para renderização no Leaflet e uso imediato no AgroLinhas Pro.
 */

export const MemorialParser = {

    /**
     * Converte número formatado (ex: "8.543.511,77" ou "8543511.77" ou "299.850,79") em float
     */
    parseBrNumber(str) {
        if (!str) return NaN;
        const cleaned = str.trim().replace(/\s+/g, '');
        // Se contém ponto e vírgula (ex: 8.543.511,77)
        if (cleaned.includes('.') && cleaned.includes(',')) {
            return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
        }
        // Se contém apenas vírgula como decimal (ex: 8543511,77)
        if (cleaned.includes(',')) {
            return parseFloat(cleaned.replace(',', '.'));
        }
        // Se contém ponto como milhar mas sem vírgula (ex: 8.543.511)
        if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
            return parseFloat(cleaned.replace(/\./g, ''));
        }
        // Caso padrão ponto decimal (ex: 8543511.77)
        return parseFloat(cleaned);
    },

    /**
     * Conversão UTM para Lat/Lon WGS84 (Hemisfério Sul)
     */
    utmToLatLon(E, N, zona) {
        const k0 = 0.9996;
        const a  = 6378137.0;
        const f  = 1 / 298.257223563;
        const b  = a * (1 - f);
        const e2 = 1 - (b / a) ** 2;
        const ep2 = e2 / (1 - e2);

        // Meridiano central do fuso UTM (fuso 21 = -57°, fuso 22 = -51°, etc.)
        const mc = -183 + zona * 6;

        const x = E - 500000;
        const y = N - 10000000; // Hemisfério Sul

        const M = y / k0;
        const mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
        const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

        const phi1 = mu
            + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
            + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
            + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
            + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);

        const sp1 = Math.sin(phi1);
        const cp1 = Math.cos(phi1);
        const N1  = a / Math.sqrt(1 - e2 * sp1 ** 2);
        const T1  = Math.tan(phi1) ** 2;
        const C1  = ep2 * cp1 ** 2;
        const R1  = a * (1 - e2) / Math.pow(1 - e2 * sp1 ** 2, 1.5);
        const D   = x / (N1 * k0);

        const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
            D ** 2 / 2
            - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4 / 24
            + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6 / 720
        );

        const lon0 = mc * Math.PI / 180;
        const lon  = lon0 + (
            D
            - (1 + 2 * T1 + C1) * D ** 3 / 6
            + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5 / 120
        ) / cp1;

        return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI };
    },

    /**
     * Valida se as coordenadas são compatíveis com UTM no Brasil
     */
    validarUTM(E, N, zona) {
        return (
            !isNaN(E) && !isNaN(N) &&
            E >= 100000 && E <= 900000 &&
            N >= 6000000 && N <= 10500000 &&
            zona >= 18 && zona <= 25
        );
    },

    /**
     * Detecta o fuso UTM ou infere a partir do Estado/Texto
     */
    detectarFuso(text) {
        // Padrões diretos: "Fuso 21", "Zona 22S", "UTM 21S", "SIRGAS 2000 Fuso 21"
        const patterns = [
            /(?:fuso|zona|utm|zone)\s*[:\-]?\s*(\d{1,2})\s*[Ss]/i,
            /(?:fuso|zona|utm|zone)\s*[:\-]?\s*(\d{1,2})/i,
            /sirgas\s*2000\s*(?:zona\s*)?(\d{1,2})\s*[Ss]/i,
            /(\d{1,2})\s*(?:sul|s\b)/i
        ];
        for (const p of patterns) {
            const m = text.match(p);
            if (m) {
                const z = parseInt(m[1], 10);
                if (z >= 18 && z <= 25) return z;
            }
        }

        // Inferência por UF comum no Brasil
        if (/\b(?:MT|Mato Grosso|RO|Rond[oô]nia|AM|Amazonas)\b/i.test(text)) return 21;
        if (/\b(?:MS|Mato Grosso do Sul|PR|Paran[aá]|SC|Santa Catarina|RS|Rio Grande do Sul|SP|S[aã]o Paulo)\b/i.test(text)) return 22;
        if (/\b(?:GO|Goi[aá]s|DF|Bras[ií]lia|TO|Tocantins|MG|Minas Gerais|RJ|Rio de Janeiro)\b/i.test(text)) return 23;
        if (/\b(?:BA|Bahia|ES|Esp[ií]rito Santo|SE|Sergipe|AL|Alagoas|PE|Pernambuco)\b/i.test(text)) return 24;

        return 21; // Padrão Centro-Oeste / MT
    },

    /**
     * Extrai metadados do memorial (Imóvel, Proprietário, Município, Área declarada)
     */
    extractMetadata(text) {
        const dados = {
            nome: '',
            imovel: '',
            proprietario: '',
            municipio: '',
            areaDeclarada: ''
        };

        const imovelM = text.match(/Im[oó]vel\s*:\s*([^\n\r,;]+)/i);
        if (imovelM) dados.imovel = imovelM[1].trim();

        const propM = text.match(/(?:Interessado|Propriet[aá]rio|Requerente)\s*:\s*([^\n\r,;]+)/i);
        if (propM) dados.proprietario = propM[1].trim();

        const munM = text.match(/Munic[ií]pio(?:[\s/]+UF)?\s*:\s*([^\n\r,;]+)/i);
        if (munM) dados.municipio = munM[1].trim();

        const areaM = text.match(/[AÁ]rea\s*:\s*([\d\.,]+\s*(?:ha|hectares|m²))/i);
        if (areaM) dados.areaDeclarada = areaM[1].trim();

        dados.nome = dados.imovel || dados.proprietario || 'Talhão Memorial';
        return dados;
    },

    /**
     * Extração robusta de coordenadas UTM via expressões regulares
     */
    extractWithRegex(text) {
        const vertices = [];
        const seen = new Set();
        const zona = this.detectarFuso(text);
        const dados = this.extractMetadata(text);
        dados.zona = zona;

        // ---------------------------------------------------------------------
        // PADRÃO 1 (INCRA/CAR): "N 8.543.511,77m e E 299.850,79m" ou "N: 8543511.77 E: 299850.79"
        // ---------------------------------------------------------------------
        const patN_E = /N\s*[:=\-]?\s*([\d\.,]+)\s*m?\s*(?:e|E|;|,|\/)?\s*E\s*[:=\-]?\s*([\d\.,]+)\s*m?/gi;
        let m;
        while ((m = patN_E.exec(text)) !== null) {
            const N = this.parseBrNumber(m[1]);
            const E = this.parseBrNumber(m[2]);
            if (this.validarUTM(E, N, zona)) {
                const key = `${Math.round(E*10)},${Math.round(N*10)}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    vertices.push({ E, N, nome: `Vértice ${vertices.length + 1}` });
                }
            }
        }

        // ---------------------------------------------------------------------
        // PADRÃO 2 (E antes de N): "E 299.850,79m e N 8.543.511,77m"
        // ---------------------------------------------------------------------
        if (vertices.length < 3) {
            const patE_N = /E\s*[:=\-]?\s*([\d\.,]+)\s*m?\s*(?:e|E|;|,|\/)?\s*N\s*[:=\-]?\s*([\d\.,]+)\s*m?/gi;
            while ((m = patE_N.exec(text)) !== null) {
                const E = this.parseBrNumber(m[1]);
                const N = this.parseBrNumber(m[2]);
                if (this.validarUTM(E, N, zona)) {
                    const key = `${Math.round(E*10)},${Math.round(N*10)}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        vertices.push({ E, N, nome: `Vértice ${vertices.length + 1}` });
                    }
                }
            }
        }

        // ---------------------------------------------------------------------
        // PADRÃO 3 (Tabela de Vértices): "EFDA-M-0207  299850.79  8543511.77" ou "P1 299.850,79 8.543.511,77"
        // ---------------------------------------------------------------------
        if (vertices.length < 3) {
            const patTable = /(?:[A-Z0-9_\-]+\s+)?([\d\.,]{6,12})\s+([\d\.,]{7,14})/g;
            while ((m = patTable.exec(text)) !== null) {
                let val1 = this.parseBrNumber(m[1]);
                let val2 = this.parseBrNumber(m[2]);
                
                let E = val1;
                let N = val2;

                // Inverte caso venha N primeiro
                if (val1 > 5000000 && val2 < 1000000) {
                    N = val1;
                    E = val2;
                }

                if (this.validarUTM(E, N, zona)) {
                    const key = `${Math.round(E*10)},${Math.round(N*10)}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        vertices.push({ E, N, nome: `Vértice ${vertices.length + 1}` });
                    }
                }
            }
        }

        return { dados, zona, vertices };
    },

    /**
     * Remove pontos duplicados consecutivos
     */
    limparPontosRepetidos(vertices) {
        if (vertices.length < 2) return vertices;
        const limpos = [vertices[0]];
        for (let i = 1; i < vertices.length; i++) {
            const prev = limpos[limpos.length - 1];
            const curr = vertices[i];
            const dist = Math.hypot(prev.E - curr.E, prev.N - curr.N);
            if (dist > 0.05) {
                limpos.push(curr);
            }
        }
        return limpos;
    },

    /**
     * Extrai texto completo de arquivo PDF usando pdf.js no navegador
     */
    async extractPdfText(file) {
        if (!window.pdfjsLib) {
            throw new Error('A biblioteca pdf.js não foi carregada. Verifique sua conexão com a internet.');
        }
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(it => it.str).join(' ');
            fullText += pageText + '\n';
        }
        return fullText;
    },

    /**
     * Função principal de processamento de arquivo (PDF ou TXT)
     */
    async processarArquivo(file) {
        let text = '';
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'pdf') {
            text = await this.extractPdfText(file);
        } else if (ext === 'txt' || ext === 'csv') {
            text = await file.text();
        } else {
            throw new Error(`Formato .${ext} não suportado. Por favor, envie um arquivo PDF ou TXT.`);
        }

        if (!text || text.trim().length < 15) {
            throw new Error('O arquivo está vazio ou é um PDF digitalizado como imagem sem camada de texto OCR.');
        }

        const { dados, zona, vertices } = this.extractWithRegex(text);

        if (vertices.length < 3) {
            throw new Error(
                `Não foram encontrados vértices suficientes no memorial (encontrados: ${vertices.length}, mínimo necessário: 3).\n\n` +
                `Certifique-se de que o memorial contém coordenadas no formato UTM (ex: N 8.543.511,77m e E 299.850,79m).`
            );
        }

        const verticesLimpos = this.limparPontosRepetidos(vertices);
        const coordsLatLon = verticesLimpos.map(v => this.utmToLatLon(v.E, v.N, zona));

        return {
            dados,
            zona,
            totalVertices: verticesLimpos.length,
            verticesUTM: verticesLimpos,
            coordsLatLon
        };
    }
};
