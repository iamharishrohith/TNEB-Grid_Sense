/*
 * ═══════════════════════════════════════════════════════════════════
 *  TN-GridSense: Smart Pole Monitoring Node
 *  Distributed Smart Pole Telemetry & Predictive Fault Management
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Hardware:
 *    - ESP32 Dev Board (main controller)
 *    - ADS1115 16-bit ADC (voltage + current sensing)
 *    - AC Voltage Divider Module (mains voltage)
 *    - ACS712 Current Sensor (line current)
 *    - INA219 DC Bus Monitor (battery/DC rail)
 *    - MAX6675 Thermocouple (transformer temperature)
 *    - LoRa SX1278 433MHz (long-range telemetry)
 *    - OLED 0.96" I2C Display (local readout)
 *    - 5V Relay Module (fault protection)
 *
 *  Author: TN-GridSense Team
 *  Version: 1.0.0
 *  License: MIT
 * ═══════════════════════════════════════════════════════════════════
 */

#include "config.h"

// ─── LIBRARY INCLUDES ──────────────────────────────────────
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <SPI.h>
#include <time.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

// Sensor libraries
#include <Adafruit_ADS1X15.h>      // ADS1115 ADC
#include <Adafruit_INA219.h>        // INA219 DC monitor
#include <max6675.h>                // MAX6675 thermocouple

// Communication
#include <LoRa.h>                   // LoRa SX1278

// Display
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OTA
#include <ArduinoOTA.h>

// ─── OBJECT INSTANCES ──────────────────────────────────────
Adafruit_ADS1115 ads;
Adafruit_INA219 ina219(INA219_ADDR);
MAX6675 thermocouple(THERMO_CLK, THERMO_CS, THERMO_DO);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

// ─── DATA STRUCTURES ───────────────────────────────────────

enum FaultStatus {
  STATUS_NORMAL,
  STATUS_VOLT_HIGH_WARN,
  STATUS_VOLT_HIGH_FAULT,
  STATUS_VOLT_LOW_WARN,
  STATUS_VOLT_LOW_FAULT,
  STATUS_OVERLOAD,
  STATUS_OVERLOAD_CRITICAL,
  STATUS_OVERHEAT,
  STATUS_OVERHEAT_CRITICAL,
  STATUS_MULTI_FAULT
};

struct SensorData {
  float acVoltage;        // AC mains voltage (V)
  float acCurrent;        // AC line current (A)
  float temperature;      // Transformer temperature (°C)
  float dcVoltage;        // DC bus voltage (V)
  float dcCurrent;        // DC bus current (mA)
  float dcPower;          // DC bus power (mW)
  float activePower;      // AC active power estimate (W)
  float healthScore;      // 0.0 – 100.0
  bool  relayState;       // true = ON (line connected)
  FaultStatus status;
  int   loraRSSI;         // Last LoRa signal strength
  int   wifiRSSI;         // WiFi signal strength
};

struct TelemetryPacket {
  char     poleId[20];
  char     feederId[20];
  char     districtId[20];
  char     timestamp[30];
  float    voltage;
  float    current;
  float    temperature;
  float    dcVoltage;
  float    dcCurrent;
  float    power;
  float    healthScore;
  bool     relayState;
  char     status[20];
  int      signalStrength;
  uint32_t uptime;
};

struct BufferedPacket {
  TelemetryPacket packet;
  bool            sent;
};

// ─── GLOBAL STATE ──────────────────────────────────────────
SensorData currentData;
TelemetryPacket lastPacket;

BufferedPacket localBuffer[LOCAL_BUFFER_SIZE];
int bufferHead = 0;
int bufferCount = 0;

float healthScore = 100.0;
int faultEventCount = 0;
bool wifiConnected = false;
bool loraInitialized = false;
bool relayTripped = false;

unsigned long lastSensorRead   = 0;
unsigned long lastTelemetrySend = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastNTPSync       = 0;
unsigned long lastBufferFlush   = 0;

// ─── SETUP ─────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("═══════════════════════════════════════════════");
  Serial.println("  TN-GridSense Smart Pole Node v1.0.0");
  Serial.println("  Pole ID: " POLE_ID);
  Serial.println("  Feeder:  " FEEDER_ID);
  Serial.println("  District:" DISTRICT_ID);
  Serial.println("═══════════════════════════════════════════════");

  // Initialize SPIFFS for local buffering
  if (!SPIFFS.begin(true)) {
    Serial.println("[SPIFFS] Mount failed!");
  } else {
    Serial.println("[SPIFFS] Mounted.");
  }

  // Relay pin — default ON (line connected)
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(true);

  // I2C init
  Wire.begin(I2C_SDA, I2C_SCL);

  // Initialize all subsystems
  initADS1115();
  initINA219();
  initOLED();
  initLoRa();
  initWiFi();
  initNTP();
  initOTA();

  Serial.println("[SYSTEM] All subsystems initialized.");
  Serial.println("═══════════════════════════════════════════════");
}

// ─── MAIN LOOP ─────────────────────────────────────────────

void loop() {
  unsigned long now = millis();

  // Handle OTA
  ArduinoOTA.handle();

  // Read sensors at defined interval
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readAllSensors();
    evaluateFaults();
    computeHealthScore();
    lastSensorRead = now;
  }

  // Send telemetry at defined interval
  if (now - lastTelemetrySend >= TELEMETRY_INTERVAL) {
    assembleTelemetryPacket();
    sendTelemetry();
    lastTelemetrySend = now;
  }

  // Update display
  if (now - lastDisplayUpdate >= DISPLAY_REFRESH) {
    updateDisplay();
    lastDisplayUpdate = now;
  }

  // NTP re-sync
  if (now - lastNTPSync >= NTP_SYNC_INTERVAL) {
    syncNTP();
    lastNTPSync = now;
  }

  // Flush buffered data
  if (now - lastBufferFlush >= BUFFER_FLUSH_INTERVAL) {
    flushBuffer();
    lastBufferFlush = now;
  }

  // Maintain WiFi
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    reconnectWiFi();
  }
}

// ═══════════════════════════════════════════════════════════
//  INITIALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════

void initADS1115() {
  Serial.print("[ADS1115] Initializing... ");
  if (!ads.begin(ADS1115_ADDR)) {
    Serial.println("FAILED! Check wiring.");
    return;
  }
  ads.setGain(GAIN_ONE);  // ±4.096V range
  Serial.println("OK (Gain: ±4.096V)");
}

void initINA219() {
  Serial.print("[INA219]  Initializing... ");
  if (!ina219.begin()) {
    Serial.println("FAILED! Check I2C.");
    return;
  }
  ina219.setCalibration_32V_2A();
  Serial.println("OK (32V, 2A range)");
}

void initOLED() {
  Serial.print("[OLED]    Initializing... ");
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("FAILED!");
    return;
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("TN-GridSense v1.0");
  display.println("Pole: " POLE_ID);
  display.println("Initializing...");
  display.display();
  Serial.println("OK");
}

void initLoRa() {
  Serial.print("[LoRa]    Initializing... ");
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_IRQ);

  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("FAILED! Check wiring/antenna.");
    loraInitialized = false;
    return;
  }

  LoRa.setSpreadingFactor(LORA_SPREAD_FACTOR);
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.setTxPower(LORA_TX_POWER);
  loraInitialized = true;
  Serial.println("OK (433MHz, SF7)");
}

void initWiFi() {
  Serial.print("[WiFi]    Connecting to ");
  Serial.print(WIFI_SSID);
  Serial.print("... ");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println(" Connected!");
    Serial.print("           IP: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println(" FAILED (will retry)");
  }
}

void initNTP() {
  Serial.print("[NTP]     Syncing time... ");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);

  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 5000)) {
    Serial.println("OK");
    char buf[30];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
    Serial.print("           Time: ");
    Serial.println(buf);
  } else {
    Serial.println("FAILED (will retry)");
  }
}

void initOTA() {
  ArduinoOTA.setHostname(OTA_HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);

  ArduinoOTA.onStart([]() {
    Serial.println("[OTA] Update starting...");
    setRelay(true);  // Ensure relay is ON during update
  });

  ArduinoOTA.onEnd([]() {
    Serial.println("[OTA] Update complete. Rebooting.");
  });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] Progress: %u%%\r", (progress / (total / 100)));
  });

  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });

  ArduinoOTA.begin();
  Serial.println("[OTA]     Ready.");
}

// ═══════════════════════════════════════════════════════════
//  SENSOR READING FUNCTIONS
// ═══════════════════════════════════════════════════════════

void readAllSensors() {
  readACVoltage();
  readACCurrent();
  readTemperature();
  readDCBus();

  // Calculate AC active power (approximate: V × I × PF)
  currentData.activePower = currentData.acVoltage * currentData.acCurrent * 0.85;

  // WiFi signal
  currentData.wifiRSSI = WiFi.RSSI();
}

void readACVoltage() {
  // Read RMS voltage from ADS1115 channel 0 (voltage divider module)
  float sumSquares = 0;

  for (int i = 0; i < VOLTAGE_SAMPLES; i++) {
    int16_t raw = ads.readADC_SingleEnded(ADS_VOLTAGE_CH);
    float voltage = ads.computeVolts(raw);
    float centered = voltage - (3.3 / 2.0);  // Remove DC offset
    sumSquares += centered * centered;
    delayMicroseconds(200);
  }

  float rmsADC = sqrt(sumSquares / VOLTAGE_SAMPLES);
  currentData.acVoltage = rmsADC * VOLTAGE_SCALE + VOLTAGE_OFFSET;

  // Sanity bounds
  if (currentData.acVoltage < 0) currentData.acVoltage = 0;
  if (currentData.acVoltage > 500) currentData.acVoltage = 500;
}

void readACCurrent() {
  // Read RMS current from ADS1115 channel 1 (ACS712)
  float sumSquares = 0;

  for (int i = 0; i < CURRENT_SAMPLES; i++) {
    int16_t raw = ads.readADC_SingleEnded(ADS_CURRENT_CH);
    float voltage = ads.computeVolts(raw);
    float current = (voltage - ACS712_ZERO_POINT) / ACS712_SENSITIVITY;
    sumSquares += current * current;
    delayMicroseconds(200);
  }

  currentData.acCurrent = sqrt(sumSquares / CURRENT_SAMPLES);

  // Sanity bounds
  if (currentData.acCurrent < 0.05) currentData.acCurrent = 0;  // Noise floor
  if (currentData.acCurrent > 50) currentData.acCurrent = 50;
}

void readTemperature() {
  // MAX6675 thermocouple — reads in °C
  float temp = thermocouple.readCelsius();

  // MAX6675 returns NAN or very high value on probe disconnect
  if (isnan(temp) || temp > 500) {
    Serial.println("[THERMO] Probe error — using last value");
    return;
  }

  currentData.temperature = temp;
}

void readDCBus() {
  // INA219 — DC bus voltage, current, and power
  currentData.dcVoltage = ina219.getBusVoltage_V();
  currentData.dcCurrent = ina219.getCurrent_mA();
  currentData.dcPower   = ina219.getPower_mW();
}

// ═══════════════════════════════════════════════════════════
//  FAULT DETECTION & PROTECTION
// ═══════════════════════════════════════════════════════════

void evaluateFaults() {
  int faultCount = 0;
  FaultStatus primary = STATUS_NORMAL;

  // ── Voltage faults ──
  if (currentData.acVoltage >= VOLTAGE_HIGH_FAULT) {
    primary = STATUS_VOLT_HIGH_FAULT;
    faultCount++;
    logEvent("OVERVOLTAGE FAULT", currentData.acVoltage);
  } else if (currentData.acVoltage >= VOLTAGE_HIGH_WARN) {
    primary = STATUS_VOLT_HIGH_WARN;
    logEvent("Overvoltage Warning", currentData.acVoltage);
  } else if (currentData.acVoltage <= VOLTAGE_LOW_FAULT && currentData.acVoltage > 0) {
    primary = STATUS_VOLT_LOW_FAULT;
    faultCount++;
    logEvent("UNDERVOLTAGE FAULT", currentData.acVoltage);
  } else if (currentData.acVoltage <= VOLTAGE_LOW_WARN && currentData.acVoltage > 0) {
    primary = STATUS_VOLT_LOW_WARN;
    logEvent("Undervoltage Warning", currentData.acVoltage);
  }

  // ── Current faults ──
  if (currentData.acCurrent >= CURRENT_CRITICAL) {
    primary = STATUS_OVERLOAD_CRITICAL;
    faultCount++;
    logEvent("CRITICAL OVERLOAD", currentData.acCurrent);
    tripRelay("Critical overcurrent");
  } else if (currentData.acCurrent >= CURRENT_OVERLOAD) {
    primary = STATUS_OVERLOAD;
    faultCount++;
    logEvent("Overload Warning", currentData.acCurrent);
  }

  // ── Temperature faults ──
  if (currentData.temperature >= TEMP_CRITICAL) {
    primary = STATUS_OVERHEAT_CRITICAL;
    faultCount++;
    logEvent("CRITICAL OVERHEAT", currentData.temperature);
    tripRelay("Critical transformer overheat");
  } else if (currentData.temperature >= TEMP_OVERHEAT) {
    primary = STATUS_OVERHEAT;
    faultCount++;
    logEvent("Overheat Warning", currentData.temperature);
  } else if (currentData.temperature >= TEMP_WARN) {
    logEvent("Temperature Warning", currentData.temperature);
  }

  // ── Multi-fault ──
  if (faultCount > 1) {
    primary = STATUS_MULTI_FAULT;
  }

  currentData.status = primary;
  faultEventCount += faultCount;

  // Auto-recover relay if conditions return to normal
  if (relayTripped && primary == STATUS_NORMAL) {
    resetRelay();
  }
}

void tripRelay(const char* reason) {
  if (!relayTripped) {
    setRelay(false);  // Disconnect line
    relayTripped = true;
    Serial.print("[RELAY] TRIPPED — ");
    Serial.println(reason);
  }
}

void resetRelay() {
  setRelay(true);   // Reconnect line
  relayTripped = false;
  Serial.println("[RELAY] Reset — conditions normal.");
}

void setRelay(bool on) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PIN, on ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  }
  currentData.relayState = on;
}

// ═══════════════════════════════════════════════════════════
//  HEALTH SCORING
// ═══════════════════════════════════════════════════════════

void computeHealthScore() {
  // Temperature component (0–100)
  float tempScore = 100.0;
  if (currentData.temperature >= TEMP_CRITICAL)  tempScore = 0;
  else if (currentData.temperature >= TEMP_OVERHEAT) tempScore = 20;
  else if (currentData.temperature >= TEMP_WARN)  tempScore = 60;
  else tempScore = 100.0 - (currentData.temperature / TEMP_WARN * 40.0);
  if (tempScore < 0) tempScore = 0;

  // Voltage stability component (0–100)
  float voltDev = abs(currentData.acVoltage - VOLTAGE_NOMINAL) / VOLTAGE_NOMINAL * 100.0;
  float voltScore = max(0.0f, 100.0f - voltDev * 5.0f);

  // Current component (0–100)
  float currentRatio = currentData.acCurrent / CURRENT_OVERLOAD * 100.0;
  float currentScore = max(0.0f, 100.0f - currentRatio);

  // Event penalty
  float eventScore = max(0.0f, 100.0f - faultEventCount * 5.0f);

  // Weighted health score
  float newScore = tempScore    * HEALTH_WEIGHT_TEMP
                 + voltScore    * HEALTH_WEIGHT_VOLTAGE
                 + currentScore * HEALTH_WEIGHT_CURRENT
                 + eventScore   * HEALTH_WEIGHT_EVENTS;

  // Smooth transition (exponential moving average)
  healthScore = healthScore * 0.7 + newScore * 0.3;
  healthScore = constrain(healthScore, 0.0, 100.0);

  currentData.healthScore = healthScore;
}

// ═══════════════════════════════════════════════════════════
//  TELEMETRY ASSEMBLY & TRANSMISSION
// ═══════════════════════════════════════════════════════════

const char* statusToString(FaultStatus s) {
  switch (s) {
    case STATUS_NORMAL:            return "NORMAL";
    case STATUS_VOLT_HIGH_WARN:    return "VOLT_HIGH_WARN";
    case STATUS_VOLT_HIGH_FAULT:   return "OVERVOLTAGE";
    case STATUS_VOLT_LOW_WARN:     return "VOLT_LOW_WARN";
    case STATUS_VOLT_LOW_FAULT:    return "UNDERVOLTAGE";
    case STATUS_OVERLOAD:          return "OVERLOAD";
    case STATUS_OVERLOAD_CRITICAL: return "OVERLOAD_CRIT";
    case STATUS_OVERHEAT:          return "OVERHEAT";
    case STATUS_OVERHEAT_CRITICAL: return "OVERHEAT_CRIT";
    case STATUS_MULTI_FAULT:       return "MULTI_FAULT";
    default:                       return "UNKNOWN";
  }
}

void assembleTelemetryPacket() {
  strncpy(lastPacket.poleId,     POLE_ID,     sizeof(lastPacket.poleId));
  strncpy(lastPacket.feederId,   FEEDER_ID,   sizeof(lastPacket.feederId));
  strncpy(lastPacket.districtId, DISTRICT_ID, sizeof(lastPacket.districtId));

  // Timestamp
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    strftime(lastPacket.timestamp, sizeof(lastPacket.timestamp),
             "%Y-%m-%dT%H:%M:%S+05:30", &timeinfo);
  } else {
    snprintf(lastPacket.timestamp, sizeof(lastPacket.timestamp), "NO_TIME");
  }

  lastPacket.voltage       = currentData.acVoltage;
  lastPacket.current       = currentData.acCurrent;
  lastPacket.temperature   = currentData.temperature;
  lastPacket.dcVoltage     = currentData.dcVoltage;
  lastPacket.dcCurrent     = currentData.dcCurrent;
  lastPacket.power         = currentData.activePower;
  lastPacket.healthScore   = currentData.healthScore;
  lastPacket.relayState    = currentData.relayState;
  lastPacket.signalStrength = currentData.wifiRSSI;
  lastPacket.uptime        = millis() / 1000;

  strncpy(lastPacket.status, statusToString(currentData.status),
          sizeof(lastPacket.status));
}

String packetToJSON(TelemetryPacket& pkt) {
  StaticJsonDocument<512> doc;

  doc["poleId"]       = pkt.poleId;
  doc["feederId"]     = pkt.feederId;
  doc["districtId"]   = pkt.districtId;
  doc["timestamp"]    = pkt.timestamp;
  doc["voltage"]      = round2(pkt.voltage);
  doc["current"]      = round2(pkt.current);
  doc["temperature"]  = round2(pkt.temperature);
  doc["dcVoltage"]    = round2(pkt.dcVoltage);
  doc["dcCurrent"]    = round2(pkt.dcCurrent);
  doc["power"]        = round2(pkt.power);
  doc["healthScore"]  = round2(pkt.healthScore);
  doc["relayState"]   = pkt.relayState;
  doc["status"]       = pkt.status;
  doc["signal"]       = pkt.signalStrength;
  doc["uptime"]       = pkt.uptime;

  String json;
  serializeJson(doc, json);
  return json;
}

void sendTelemetry() {
  String json = packetToJSON(lastPacket);

  // ─── WiFi HTTP POST ───
  bool httpSent = false;
  if (wifiConnected && WiFi.status() == WL_CONNECTED) {
    httpSent = sendHTTP(json);
  }

  // ─── LoRa broadcast ───
  if (loraInitialized) {
    sendLoRa(json);
  }

  // ─── Buffer if HTTP failed ───
  if (!httpSent) {
    bufferPacket(lastPacket);
  }

  // Serial debug
  Serial.print("[TX] ");
  Serial.println(json);
}

bool sendHTTP(String& json) {
  HTTPClient http;
  String url = String(BACKEND_URL) + API_ENDPOINT;

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " AUTH_TOKEN);
  http.setTimeout(5000);

  int code = http.POST(json);

  if (code == 200 || code == 201) {
    Serial.println("[HTTP] Sent OK");
    http.end();
    return true;
  } else {
    Serial.printf("[HTTP] Failed (code: %d)\n", code);
    http.end();
    return false;
  }
}

void sendLoRa(String& json) {
  // LoRa packets have ~255 byte limit — send compact version
  StaticJsonDocument<256> doc;
  doc["p"]  = lastPacket.poleId;
  doc["v"]  = round2(lastPacket.voltage);
  doc["c"]  = round2(lastPacket.current);
  doc["t"]  = round2(lastPacket.temperature);
  doc["h"]  = round2(lastPacket.healthScore);
  doc["s"]  = lastPacket.status;
  doc["r"]  = lastPacket.relayState ? 1 : 0;

  String compact;
  serializeJson(doc, compact);

  LoRa.beginPacket();
  LoRa.print(compact);
  LoRa.endPacket();

  currentData.loraRSSI = LoRa.packetRssi();
  Serial.println("[LoRa] Broadcast OK");
}

// ═══════════════════════════════════════════════════════════
//  LOCAL DATA BUFFERING
// ═══════════════════════════════════════════════════════════

void bufferPacket(TelemetryPacket& pkt) {
  if (bufferCount < LOCAL_BUFFER_SIZE) {
    localBuffer[bufferHead].packet = pkt;
    localBuffer[bufferHead].sent = false;
    bufferHead = (bufferHead + 1) % LOCAL_BUFFER_SIZE;
    bufferCount++;
    Serial.printf("[BUFFER] Stored (%d/%d)\n", bufferCount, LOCAL_BUFFER_SIZE);
  } else {
    Serial.println("[BUFFER] FULL — dropping oldest");
    localBuffer[bufferHead].packet = pkt;
    localBuffer[bufferHead].sent = false;
    bufferHead = (bufferHead + 1) % LOCAL_BUFFER_SIZE;
  }
}

void flushBuffer() {
  if (bufferCount == 0 || !wifiConnected) return;

  Serial.printf("[BUFFER] Flushing %d packets...\n", bufferCount);
  int flushed = 0;

  for (int i = 0; i < LOCAL_BUFFER_SIZE && flushed < bufferCount; i++) {
    if (!localBuffer[i].sent) {
      String json = packetToJSON(localBuffer[i].packet);
      if (sendHTTP(json)) {
        localBuffer[i].sent = true;
        flushed++;
      } else {
        break;  // Network issue, stop flushing
      }
      delay(100);  // Rate limit
    }
  }

  // Compact buffer
  if (flushed > 0) {
    bufferCount -= flushed;
    Serial.printf("[BUFFER] Flushed %d, remaining: %d\n", flushed, bufferCount);
  }
}

// ═══════════════════════════════════════════════════════════
//  OLED DISPLAY
// ═══════════════════════════════════════════════════════════

void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Header
  display.setCursor(0, 0);
  display.print("GridSense ");
  display.println(POLE_ID);

  // Divider
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);

  // Voltage
  display.setCursor(0, 14);
  display.print("V: ");
  display.print(currentData.acVoltage, 1);
  display.print("V");

  // Current
  display.setCursor(70, 14);
  display.print("I: ");
  display.print(currentData.acCurrent, 1);
  display.print("A");

  // Temperature
  display.setCursor(0, 26);
  display.print("T: ");
  display.print(currentData.temperature, 1);
  display.print("\xF8""C");

  // Power
  display.setCursor(70, 26);
  display.print("P: ");
  display.print(currentData.activePower, 0);
  display.print("W");

  // Health
  display.setCursor(0, 38);
  display.print("Health: ");
  display.print(currentData.healthScore, 0);
  display.print("%");

  // Status
  display.setCursor(0, 50);
  display.print("Status: ");
  if (currentData.status == STATUS_NORMAL) {
    display.print("NORMAL");
  } else {
    display.print(statusToString(currentData.status));
  }

  // Relay indicator
  display.setCursor(100, 50);
  display.print(currentData.relayState ? "RLY:ON" : "RLY:OFF");

  // WiFi indicator
  display.setCursor(100, 38);
  display.print(wifiConnected ? "WiFi" : "----");

  display.display();
}

// ═══════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

float round2(float val) {
  return (int)(val * 100 + 0.5) / 100.0;
}

void logEvent(const char* event, float value) {
  Serial.printf("[EVENT] %s — Value: %.2f\n", event, value);
}

void syncNTP() {
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 3000)) {
    Serial.println("[NTP] Re-synced OK");
  }
}

void reconnectWiFi() {
  static unsigned long lastAttempt = 0;
  if (millis() - lastAttempt > 10000) {
    Serial.println("[WiFi] Reconnecting...");
    WiFi.reconnect();
    lastAttempt = millis();

    delay(3000);
    if (WiFi.status() == WL_CONNECTED) {
      wifiConnected = true;
      Serial.println("[WiFi] Reconnected!");
    }
  }
}
