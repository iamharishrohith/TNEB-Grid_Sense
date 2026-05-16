/*
 * TN-GridSense Smart Pole Node — Configuration
 * =============================================
 * All tunable parameters for the smart pole monitoring system.
 * Modify these values per deployment site.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ─── POLE IDENTITY ─────────────────────────────────────────
#define POLE_ID          "POLE-001"
#define FEEDER_ID        "FDR-CHN-01"
#define DISTRICT_ID      "CHENNAI"

// ─── WIFI CONFIGURATION ────────────────────────────────────
#define WIFI_SSID        "TNEB-GridSense"
#define WIFI_PASSWORD    "gridsense2026"

// ─── BACKEND SERVER ────────────────────────────────────────
#define BACKEND_URL      "http://192.168.1.100:3000"
#define API_ENDPOINT     "/api/telemetry"
#define AUTH_TOKEN        "pole-auth-token-001"

// ─── NTP TIME SYNC ─────────────────────────────────────────
#define NTP_SERVER       "pool.ntp.org"
#define GMT_OFFSET_SEC   19800   // IST = UTC+5:30 = 19800 seconds
#define DAYLIGHT_OFFSET  0

// ─── PIN ASSIGNMENTS ───────────────────────────────────────

// I2C Bus (shared: ADS1115, INA219, OLED)
#define I2C_SDA          21
#define I2C_SCL          22

// SPI Bus — LoRa SX1278
#define LORA_SCK         18
#define LORA_MISO        19
#define LORA_MOSI        23
#define LORA_CS          4      // User hardware: CS on GPIO4
#define LORA_RST         14
#define LORA_IRQ         26     // User hardware: IRQ on GPIO26

// SPI Bus — MAX6675 Thermocouple (bit-banged, separate pins)
#define THERMO_CLK       25     // User hardware: SCK on GPIO25
#define THERMO_CS        33     // User hardware: CS on GPIO33
#define THERMO_DO        32     // User hardware: SO/DO on GPIO32

// Relay Control
#define RELAY_PIN        27
#define RELAY_ACTIVE_LOW true    // Set to false if relay is active HIGH

// ─── I2C ADDRESSES ─────────────────────────────────────────
#define ADS1115_ADDR     0x48    // Default ADDR pin to GND
#define INA219_ADDR      0x40    // Default
#define OLED_ADDR        0x3C    // Standard 0.96" OLED

// ─── ADS1115 CHANNELS ──────────────────────────────────────
#define ADS_VOLTAGE_CH   0       // A0 — Voltage divider module
#define ADS_CURRENT_CH   1       // A1 — ACS712 current sensor

// ─── SENSOR CALIBRATION ────────────────────────────────────

// Voltage sensor (AC voltage divider module)
#define VOLTAGE_SCALE        113.14   // Calibration factor: ADC reading → actual AC voltage
#define VOLTAGE_OFFSET       0.0      // Zero-point offset
#define VOLTAGE_SAMPLES      200      // Samples per RMS cycle

// ACS712 Current sensor
#define ACS712_SENSITIVITY   0.066    // V/A for 30A module (0.185 for 5A, 0.100 for 20A)
#define ACS712_ZERO_POINT    2.5      // Quiescent output voltage (VCC/2)
#define CURRENT_SAMPLES      200      // Samples per RMS cycle

// INA219 DC bus
#define INA219_SHUNT_R       0.1      // Shunt resistor value in ohms

// ─── FAULT THRESHOLDS ──────────────────────────────────────

// Voltage thresholds (Indian standard: 230V ± 10%)
#define VOLTAGE_NOMINAL      230.0
#define VOLTAGE_HIGH_WARN    248.0    // +8%
#define VOLTAGE_HIGH_FAULT   253.0    // +10%
#define VOLTAGE_LOW_WARN     212.0    // -8%
#define VOLTAGE_LOW_FAULT    207.0    // -10%

// Current thresholds
#define CURRENT_OVERLOAD     25.0     // Amps — overload warning
#define CURRENT_CRITICAL     28.0     // Amps — critical, trip relay

// Temperature thresholds (°C)
#define TEMP_WARN            65.0     // Warning
#define TEMP_OVERHEAT        80.0     // Overheat — trip relay
#define TEMP_CRITICAL        95.0     // Critical — immediate shutdown

// ─── TIMING ────────────────────────────────────────────────
#define TELEMETRY_INTERVAL   5000     // ms — data send interval
#define SENSOR_READ_INTERVAL 1000     // ms — sensor polling interval
#define DISPLAY_REFRESH      2000     // ms — OLED refresh interval
#define NTP_SYNC_INTERVAL    3600000  // ms — NTP re-sync every hour
#define BUFFER_FLUSH_INTERVAL 30000   // ms — flush local buffer

// ─── DATA BUFFERING ────────────────────────────────────────
#define LOCAL_BUFFER_SIZE    100      // Max buffered telemetry packets
#define BUFFER_FILE          "/buffer.json"

// ─── LORA CONFIGURATION ────────────────────────────────────
#define LORA_FREQUENCY       433E6    // 433 MHz (India ISM band)
#define LORA_BANDWIDTH       125E3    // 125 kHz
#define LORA_SPREAD_FACTOR   7        // SF7 for range/speed balance
#define LORA_TX_POWER        17       // dBm

// ─── HEALTH SCORING ────────────────────────────────────────
#define HEALTH_WEIGHT_TEMP       0.35
#define HEALTH_WEIGHT_VOLTAGE    0.25
#define HEALTH_WEIGHT_CURRENT    0.20
#define HEALTH_WEIGHT_EVENTS     0.20
#define HEALTH_DECAY_FACTOR      0.98  // Score decays per fault event

// ─── OTA ────────────────────────────────────────────────────
#define OTA_HOSTNAME         "GridSense-POLE-001"
#define OTA_PASSWORD         "ota-secure-2026"

#endif // CONFIG_H
