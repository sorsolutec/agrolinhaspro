# 🚜 AgroLinhas Navi - Sistema de Agricultura de Precisão & Linhas de Plantio

Aplicação web e PWA de alta performance, projetada para smartphones, tablets e computadores de bordo, para planejamento de talhões, cálculo automático de linhas de plantio, controle de seções (*Section Control*), telemetria GNSS/RTK centimétrica e navegação com barra de luzes (*Lightbar HUD*) estilo **AgriBus-NAVI**.

---

## 🌾 Recursos e Funcionalidades

### 1. 📡 Conexão GNSS / RTK & Telemetria NMEA
- Suporte a antenas GNSS externas de alta precisão via **Web Bluetooth** e **Serial USB** (Trimble, Emlid Reach, ArduSimple, Garmin).
- Decodificador de sentenças NMEA (`$GPGGA`, `$GNGGA`, `$GPRMC`, `$GNRMC`) com status de Fix (RTK FIX, RTK FLOAT, DGPS, GPS), número de satélites e precisão horizontal (HDOP).
- **Simulador RTK Integrado**: Permite testar a navegação centimétrica (±1.8cm) sem antena física conectada.

### 2. ⛰️ Topografia Real & Perfil Altimétrico (DEM)
- Consulta e modelagem digital de elevação (DEM) com cálculo de **Cota Mínima, Cota Máxima, Desnível Total (m)** e **Declividade Média (%)**.
- Mini gráfico interativo de perfil do relevo.
- Geração de **Curvas de Nível** e isolinhas topográficas equidistantes para plantio em contorno sem cruzamentos.

### 3. 🚜 Controle Automático de Seções (*Section Control*) & Mapa de Cobertura
- Configuração de **2 a 16 seções** na barra da plantadeira ou pulverizador.
- **Auto-Corte Inteligente**: Desliga seções individuais automaticamente ao entrar em cabeceiras ou sobre áreas já aplicadas/plantadas para evitar desperdício de sementes e insumos.
- **Barra Visual no HUD**: Status em tempo real de cada seção (Verde = Ligada, Cinza = Desligada).
- **Camada de Cobertura (*As-Applied*)**: Rastreamento da área aplicada com cálculo de Área Coberta (ha), % de Progresso, Sobreposição Evitada (ha) e Economia Estimada em Reais (R$).

### 4. 📄 Ordem de Serviço (OS) & Relatório Agronômico em PDF
- Emissão de documento técnico pronto para impressão (`Ctrl+P` ou Salvar como PDF) com:
  - Dados da fazenda, talhão, operador, trator e implemento.
  - **Calculadora de Insumos**: Estimativa automática de sacas de sementes (população/ha), adubo formulado de base (Big Bags) e consumo de diesel (L).
  - Tabela de métricas operacionais e campos para assinatura técnica (CREA e Operador).

### 5. 🧭 Navegação em Cabine & Barra de Luzes (*AgriBus Lightbar HUD*)
- Barra visual de LEDs com indicação de desvio lateral em centímetros (`E` / `D`).
- Rumo da máquina (bússola), velocidade instantânea (km/h) e número da passada ativa.
- Modos de navegação: **Simulação de Trator** (1x, 2x, 5x, 10x) e **GPS/RTK Real**.

### 6. 🗺️ Geometria, Padrões de Linhas & Exportação
- Padrões de plantio: **Reta A-B**, **Curvas de Nível** e **Cabeceiras / Bordaduras (1 a 4 voltas)**.
- Alinhamento automático pelo lado mais longo (*Melhor Ângulo*).
- Exportação nos formatos **KML** (Google Earth / Monitores), **GeoJSON** (QGIS) e **GPX** (Garmin / Trimble).
- Armazenamento offline de múltiplos talhões (`localStorage`) e suporte a PWA (Progressive Web App).

---

## 🚀 Como Executar

Basta abrir o arquivo `index.html` em qualquer navegador web moderno (Google Chrome, Safari, Edge, Firefox) ou rodar um servidor HTTP local simples:

```bash
# Com Python 3
python -m http.server 8080
```
Ou abra diretamente o arquivo `index.html` com duplo clique.