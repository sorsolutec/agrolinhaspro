# AGROLINHAS PRO — MANUAL OPERACIONAL DO USUÁRIO
**Software de Agricultura de Precisão, Traçado de Linhas de Plantio & Piloto Automático Agrícola**
*Versão 2.5.0 Enterprise — Atualizado em Agosto/2026*

---

## SUMÁRIO
1. [Visão Geral & Inicialização](#1-visão-geral--inicialização)
2. [Controles de Mapa (Estilo Google Earth)](#2-controles-de-mapa-estilo-google-earth)
3. [Delimitação do Talhão (Desenho & KML)](#3-delimitação-do-talhão-desenho--kml)
4. [Delimitação de Áreas Abertas vs Fechadas (APP / Mata Interna)](#4-delimitação-de-áreas-abertas-vs-fechadas-app--mata-interna)
5. [Planejamento de Linhas de Plantio (Reta A-B & Azimute)](#5-planejamento-de-linhas-de-plantio-reta-a-b--azimute)
6. [Topografia Real & Curvas de Nível (Copernicus DEM & RTK CSV)](#6-topografia-real--curvas-de-nível-copernicus-dem--rtk-csv)
7. [Piloto Virtual, Cabine & Lightbar HUD](#7-piloto-virtual-cabine--lightbar-hud)
8. [Controle Automático de Seções da Barra](#8-controle-automático-de-seções-da-barra)
9. [Exportação KML & Compatibilidade com Monitores](#9-exportação-kml--compatibilidade-com-monitores)
10. [Conexão GNSS / RTK Centimétrico](#10-conexão-gnss--rtk-centimétrico)

---

## 1. VISÃO GERAL & INICIALIZAÇÃO

O **AgroLinhas Pro** foi desenvolvido para planejar e executar operações de plantio com precisão centimétrica. Pode ser operado no computador do escritório técnico ou diretamente no tablet/notebook embarcado na cabine do trator.

- **Servidor Local:** Inicie o sistema através do arquivo `start.bat` ou executando `powershell -File .\server.ps1`.
- **Acesso:** Abra o navegador em `http://localhost:8080`.
- **Modo Offline:** O sistema utiliza Service Worker PWA para operar 100% desconectado da internet em áreas remotas.

---

## 2. CONTROLES DE MAPA (ESTILO GOOGLE EARTH)

No canto superior e direito da tela encontram-se os controles rápidos de navegação:

- **🔍 Lupa de Pesquisa (Flyout):** Clique na lupa para abrir a caixa de busca:
  - **Coordenadas:** Digite a latitude e longitude (ex: `-12.805, -55.503`) para voar diretamente até a fazenda.
  - **Município/Localidade:** Digite o nome da cidade (ex: `Sorriso, MT`, `Sinop`) para centralizar a região.
- **🧭 Bússola:** Aponta para o Norte e permite reorientar o mapa ao clicar.
- **➕ / ➖ Zoom:** Botões de aproximação e afastamento, além de um **slider vertical** de nível contínuo.
- **⛶ Enquadrar Talhão:** Enquadra o polígono do talhão ativo na tela.
- **🛰️ Camadas de Satélite:** Alterna entre Satélite HD (Esri), OpenStreetMap, Modo Noturno e Topografia.

---

## 3. DELIMITAÇÃO DO TALHÃO (DESENHO & KML)

Antes de traçar as passadas, defina o limite perimetral da área:

### Opção A: Desenho Manual no Mapa
1. No painel lateral (**Card 1. Área do Talhão**), clique em **Desenhar**.
2. Clique nos vértices sobre a imagem de satélite contornando a borda externa.
3. Dê um duplo clique no último ponto para fechar o polígono.

### Opção B: Importação de Arquivo KML / GeoJSON
1. Clique em **Importar KML**.
2. Selecione o arquivo `.kml` ou `.geojson` do talhão.
3. A área líquida em hectares (`ha`) será calculada instantaneamente.

---

## 4. DELIMITAÇÃO DE ÁREAS ABERTAS VS FECHADAS (APP / MATA INTERNA)

Para evitar plantio em áreas de preservação permanente (APP), capões de mata ou áreas rochosas:

1. **✂️ Cortar Linha:** Desenhe uma reta que atravesse o talhão de ponta a ponta para fatiar em glebas separadas.
2. **🌲 Recortar APP Interna:** Clique no botão dourado **Recortar APP Interna** e desenhe o contorno da mata ou represa que fica dentro do talhão. A área interna será recortada automaticamente.
3. **👆 Clique Direto no Mapa (*Click-to-Toggle*):** Clique em qualquer parte fatiada para alternar instantaneamente entre:
   - **🌱 Aberta (Lavoura - Verde)**
   - **🌲 Fechada (APP/Reserva - Vermelho Tracejado)**
4. **✅ Confirmar:** Clique em **Usar Apenas Áreas Abertas** (ou *Aplicar no Plantio* na barra flutuante). O sistema reconfigura a área de trabalho para conter apenas solo cultivável!
5. **📁 Exportar KML:** Clique em **Baixar KML Área Aberta** para salvar o polígono higienizado.

---

## 5. PLANEJAMENTO DE LINHAS DE PLANTIO (RETA A-B & AZIMUTE)

1. No **Card 3. Padrão de Linhas**:
   - **Espaçamento / Largura da Passada:** Digite a largura útil desejada (em metros) ou selecione um dos atalhos rápidos (`6m`, `9m`, `12m`, `15m`, `24m`, `36m`). O badge no topo sincroniza automaticamente com o maquinário ativo.
   - **Marcar A & B:** Clique no mapa para posicionar o ponto **A** (início) e o ponto **B** (fim).
   - **Melhor Ângulo:** O sistema calcula a maior extensão contínua para minimizar manobras nas bordas.
   - **Azimute Manual:** Regule o controle deslizante de 0° a 180° para definir o rumo exato.
2. **Cabeceiras (Bordaduras):** Escolha entre 0, 1, 2 ou 3 voltas de cabeceira para manobra das máquinas.
3. Clique em **GERAR LINHAS DE PLANTIO**. Todas as passadas serão geradas em verde na largura e espaçamento exatos configurados.

---

## 6. TOPOGRAFIA REAL & CURVAS DE NÍVEL (COPERNICUS DEM & RTK CSV)

1. Selecione a aba **Curvas DEM**.
2. **Fonte Altimétrica:**
   - **Copernicus DEM (Online):** Elevação global via satélite com 1 clique em *Atualizar Altimetria Real*.
   - **Levantamento RTK (CSV/TXT):** Importe coordenadas `Lat, Lon, Z` ou `UTM SIRGAS 2000 20S a 24S (E, N, Z)` com suporte a Proj4.js.
3. Ajuste o **Percentil de Cota (Isolinha Base)** para definir a curva guia mestra e clique em **GERAR LINHAS DE PLANTIO**.

---

## 7. PILOTO VIRTUAL, CABINE & LIGHTBAR HUD

Acesse o menu **2. Piloto Cabine HUD**:

- **Barra de LEDs (Lightbar):**
  - **Verde Central:** Trator perfeitamente alinhado (desvio $\le$ 12 cm).
  - **Amarelo Intermediário:** Atenção (desvio entre 12 cm e 40 cm). Corrigir volante suavemente.
  - **Vermelho Extremo:** Desvio excessivo (> 40 cm). Esterçar imediatamente para a direção indicada pelas setas (`◄◄` ou `►►`).
- **Velocímetro & Rumo:** Exibe velocidade real em km/h e azimute da passada.

---

## 8. CONTROLE AUTOMÁTICO DE SEÇÕES DA BARRA

O motor `SectionEngine` monitora cada seção da barra de plantio:
- Ao entrar em área já semeada ou fora do limite do talhão $\rightarrow$ **Desliga a seção (S1, S2, ...) instantaneamente**.
- Ao retornar para solo não trabalhado $\rightarrow$ **Religa a seção no mesmo milissegundo**.
- Previne o desperdício de insumos, sementes e fertilizantes por sobreposição.

---

## 9. EXPORTAÇÃO KML & COMPATIBILIDADE COM MONITORES

Todas as geometrias e linhas geradas podem ser exportadas em formatos padrão de mercado:
- **KML Linhas de Plantio:** Compatível com *John Deere GS3 / Gen4, Trimble GFX / TMX, Climate FieldView, Topcon, Agres e Google Earth*.
- **KML Áreas Abertas (Lavoura Líquida):** Perímetro limpo com exclusão de APPs e matas para delimitação de bordadura.

---

## 10. CONEXÃO GNSS / RTK CENTIMÉTRICO

Clique no selo **RTK FIX** no topo da tela:
- Suporta conexão Bluetooth ou Serial NMEA (`$GNGGA`, `$GNRMC`).
- Modos de Simulação: **RTK FIX (±1.8cm)**, **RTK FLOAT (±18cm)** ou receptor GNSS autônomo.

---

## 11. BANCO DE EQUIPAMENTOS & IMPORTAÇÃO DE PLANILHAS (XLSX/CSV)

Acesse o menu **4. Banco de Equipamentos**:
- **Catálogo Técnico Completo:** Gerencie distribuidores de calcário/fertilizante (ex: *Jan Lancer Magnu 10000 - 36m*), semeadoras/plantadeiras (ex: *John Deere ExactEmerge, Fendt Momentum, Jumil*) e pulverizadores (ex: *Jacto Uniport*).
- **Importação XLSX:** Clique em **Importar XLSX** e selecione a planilha `banco_equipamentos_agricolas.xlsx` para importar novos implementos em lote automaticamente.
- **Ficha Técnica Detalhada:** Clique no ícone de olho para consultar dimensões, capacidade de carga (kg e L), potência requerida (CV), rotação TDP/discos (rpm), bitola e link oficial do catálogo do fabricante.
- **Ativação Instantânea:** Ao ativar um equipamento, sua largura útil é carregada imediatamente na Estação GIS para geração de passadas e no controle de seções.

