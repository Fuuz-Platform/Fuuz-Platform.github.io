/* build/data/edge-connectors.mjs — source data for site/connectors/edge/index.html.
 *
 * Unlike it-connectors.mjs, there's no existing structured source for this (the OT/edge support
 * KB article is prose tables, not data). This file IS the source of truth going forward — add a
 * row here and re-run `node build/generate.mjs`, nothing else changes. Cell strings may contain
 * inline HTML (already trusted, hand-authored content, not user input).
 */

export const IGNITION_FEATURES = [
  { name: 'Lives inside the gateway', tag: 'Advanced',
    desc: 'Rather than an external client polling Ignition\'s OPC&nbsp;UA server, the Fuuz module installs directly inside the Ignition Gateway itself — the same architecture pattern as any other Ignition Gateway module, running alongside Ignition\'s own OPC&nbsp;UA, Sparkplug and tag systems rather than in front of them.' },
  { name: 'Creates the subscription, not just the read', tag: null,
    desc: 'A generic OPC&nbsp;UA browse-and-subscribe client only ever sees tags. The Fuuz Ignition Module creates the Fuuz-side <code>DeviceSubscription</code> directly from inside the gateway, so tag discovery and subscription management happen where the tag data already lives, not from a second hop outside it.' },
  { name: 'Same platform, less to run', tag: null,
    desc: 'No separate OPC&nbsp;UA client process to deploy, monitor and restart alongside Ignition. One module, installed once, inside the gateway you already operate.' },
];

export const DRIVER_COLUMNS = ['Driver', 'Connects to', 'How it works'];
export const DRIVERS = [
  ['<strong>OPC UA Client</strong>', 'OPC UA servers on PLCs, SCADA, historians, gateways', 'Connects to any OPC UA server — the backbone of most industrial paths below.'],
  ['<strong>EtherNet/IP</strong>', 'Allen-Bradley / Rockwell PLCs', 'Reads and writes PLC tags directly via EtherNet/IP.'],
  ['<strong>PCCC</strong>', 'Legacy Allen-Bradley SLC/MicroLogix', 'Legacy DF1/PCCC protocol for older controllers.'],
  ['<strong>Modbus TCP</strong>', 'Any Modbus TCP device — PLCs, sensors, meters, drives', 'Direct connection to Modbus TCP endpoints.'],
  ['<strong>MQTT Client / Broker</strong>', 'MQTT brokers and endpoints', 'Subscribes to and publishes on MQTT brokers — standard IoT messaging.'],
  ['<strong>MQTT Sparkplug B</strong>', 'Sparkplug B compliant systems', 'The standardized MQTT payload format defined by the Eclipse Sparkplug spec.'],
  ['<strong>SAP RFC</strong>', 'SAP systems', 'Direct SAP Remote Function Call — invokes BAPIs without middleware. See <a href="../cloud/#named">IT &amp; Cloud</a> for the separate SAP Cloud (S/4HANA) connector.'],
  ['<strong>Microsoft SQL / MySQL / Oracle DB / IBM DB2</strong>', 'On-premise databases', 'Native protocol per engine (TDS, MySQL protocol, Oracle Net, DRDA); Oracle requires the Oracle Instant Client.'],
  ['<strong>HTTP Client / Server</strong>', 'REST/HTTP APIs; local webhook receivers', 'Calls external endpoints, or receives HTTP POST requests and relays them into a data flow.'],
  ['<strong>TCP Socket / Server</strong>', 'Custom protocol devices; inbound TCP', 'Raw TCP communication, or subscribes to a port for incoming data.'],
  ['<strong>Local File</strong>', 'The file system', 'Reads and writes CSV, XML, JSON and other flat files on the local machine.'],
  ['<strong>Native Printer / TCP Printer</strong>', 'System and network printers', 'OS print spooler, or a direct TCP port 9100 connection (Zebra, SATO, etc.).'],
];

export const PLATFORM_COLUMNS = ['Platform', 'Vendor', 'Fuuz path'];
export const PLATFORMS = [
  ['<strong>Ignition</strong>', 'Inductive Automation', 'Gateway OPC UA + MQTT + Sparkplug B + Modbus + HTTP + SQL, plus the Fuuz Ignition Module above — the best protocol match of any platform here.'],
  ['<strong>AVEVA System Platform</strong>', 'AVEVA', 'OPC UA, MQTT and Modbus via native drivers; Sparkplug B via the DataHub adapter.'],
  ['<strong>Siemens WinCC / WinCC OA</strong>', 'Siemens', 'OPC UA built in; MQTT via adapter; Modbus via driver.'],
  ['<strong>GE Proficy Historian</strong>', 'GE Digital', 'OPC UA server built in — the Fuuz OPC UA driver connects directly.'],
  ['<strong>OSIsoft PI (AVEVA PI)</strong>', 'AVEVA', 'PI Web API via the HTTP Client driver is the primary modern path.'],
  ['<strong>KEPServerEX</strong>', 'PTC', 'The Fuuz OPC UA driver connects to KEPServerEX\'s 160+ device drivers in one hop.'],
  ['<strong>HiveMQ</strong>', 'HiveMQ', 'Enterprise MQTT broker; Fuuz MQTT and Sparkplug B drivers connect directly.'],
  ['<strong>Cirrus Link</strong>', 'Cirrus Link', 'Authors of the Sparkplug B specification — native compatibility.'],
  ['<strong>Opto 22 groov EPIC/RIO</strong>', 'Opto 22', 'Full driver coverage — native Sparkplug B, OPC UA, MQTT, REST and Modbus.'],
];

export const PLC_COLUMNS = ['Manufacturer', 'Platform', 'Fuuz path'];
export const PLC_MFRS = [
  ['<strong>Allen-Bradley / Rockwell</strong>', 'ControlLogix, CompactLogix', 'Native EtherNet/IP driver reads/writes CIP tags directly — the best PLC support Fuuz has.'],
  ['<strong>Siemens</strong>', 'S7-1200, S7-1500', 'OPC UA built into the S7-1500; the proprietary S7 protocol needs an OPC UA bridge on older models.'],
  ['<strong>Schneider Electric</strong>', 'Modicon M340, M580', 'Modbus, OPC UA and EtherNet/IP — Schneider invented Modbus, so this is a natural fit.'],
  ['<strong>Mitsubishi</strong>', 'MELSEC iQ-R, iQ-F', 'An OPC UA module is available; native MC Protocol needs an OPC UA bridge.'],
  ['<strong>Omron</strong>', 'NX/NJ Series', 'OPC UA built in — the Fuuz driver connects directly.'],
  ['<strong>Beckhoff</strong>', 'TwinCAT', 'OPC UA via TF6100; the proprietary ADS protocol needs an OPC UA bridge.'],
  ['<strong>Phoenix Contact</strong>', 'PLCnext', 'Excellent coverage — every Fuuz industrial driver connects (OPC UA, EtherNet/IP, Modbus, MQTT).'],
];

export const ROBOTS_COLUMNS = ['Platform', 'Vendor', 'Fuuz path'];
export const ROBOTS_BRIDGES = [
  ['<strong>FANUC</strong>', 'Robotics', 'EtherNet/IP (R648) and OPC UA (R553) are paid FANUC options.'],
  ['<strong>ABB Robotics</strong>', 'Robotics', 'Best coverage of any robot vendor — EtherNet/IP, OPC UA (RobotWare 7), MQTT via IoT Gateway, HTTP.'],
  ['<strong>KUKA</strong>', 'Robotics', 'The KUKA.OPC UA option is required; native KRL needs an OPC UA bridge.'],
  ['<strong>Universal Robots</strong>', 'Robotics', 'Modbus TCP built in; the URCaps ecosystem adds OPC UA/MQTT.'],
  ['<strong>HMS Anybus</strong>', 'Gateway/bridge', 'Bridges roughly 20 industrial networks, including PROFINET, DeviceNet and CC-Link, into OPC UA/MQTT/EtherNet/IP/Modbus.'],
  ['<strong>Softing dataFEED</strong>', 'Gateway/bridge', 'OPC UA specialist that also translates to MQTT.'],
  ['<strong>Moxa / Advantech</strong>', 'Gateway/bridge', 'Protocol conversion and serial-to-Ethernet, landing on OPC UA, Modbus, MQTT and EtherNet/IP.'],
];

export const BRIDGE_COLUMNS = ['Protocol', 'Common in', 'Recommended bridge'];
export const UNSUPPORTED = [
  ['<strong>PROFINET</strong>', 'Siemens, European manufacturing', 'HMS Anybus, Hilscher, or a Siemens OPC UA server &rarr; Fuuz OPC UA driver.'],
  ['<strong>PROFIBUS</strong>', 'Legacy Siemens, process industry', 'PROFIBUS-to-Modbus gateway &rarr; Fuuz Modbus driver.'],
  ['<strong>DeviceNet</strong>', 'Legacy Rockwell', 'DeviceNet-to-EtherNet/IP gateway &rarr; Fuuz EtherNet/IP driver.'],
  ['<strong>CC-Link</strong>', 'Mitsubishi, Asian manufacturing', 'CC-Link-to-OPC UA gateway &rarr; Fuuz OPC UA driver.'],
  ['<strong>Siemens S7 native</strong>', 'Siemens PLCs', 'Enable OPC UA on the S7-1500 &rarr; Fuuz OPC UA driver.'],
  ['<strong>FANUC FOCAS</strong>', 'FANUC CNC machines', 'KEPServerEX FOCAS driver &rarr; Fuuz OPC UA driver.'],
  ['<strong>BACnet</strong>', 'Building automation', 'BACnet-to-Modbus or BACnet-to-OPC UA gateway.'],
  ['<strong>HART</strong>', 'Process transmitters', 'HART-to-Modbus gateway or HART multiplexer &rarr; Fuuz Modbus driver.'],
  ['<strong>Kafka</strong>', 'Stream processing', 'Kafka REST Proxy &rarr; Fuuz HTTP driver.'],
  ['<strong>DNP3</strong>', 'Utilities, electric SCADA', 'DNP3-to-Modbus gateway &rarr; Fuuz Modbus driver.'],
  ['<strong>IEC 61850</strong>', 'Power utility substations', 'IEC 61850-to-OPC UA gateway &rarr; Fuuz OPC UA driver.'],
];
