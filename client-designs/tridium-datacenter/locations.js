/**
 * C3NTRO Telecom | Data Center Explorer
 * locations.js — Location data for the interactive map view
 * SVG viewBox: 0 0 1000 650
 */
window.C3 = window.C3 || {};
window.C3.Data = window.C3.Data || {};

window.C3.Data.locations = {
  totalHvacUnits: 294,  // 21 DCs x 14 units each

  // Certifications shown at bottom
  certifications: [
    'ICREA 5',
    'Disponibilidad 99.95%',
    'ISO 9001:2008',
    'ISO/IEC:20000',
    'ISO 27001',
    'TIER 4+'
  ],

  // Cities grouped by country
  // SVG viewBox: 0 0 1000 650
  // Projection: x = (lon + 125) / 55 * 1000, y = (50 - lat) / 38 * 650
  cities: [
    // === MEXICO ===
    {
      id: 'cdmx', city: 'Ciudad de M\u00E9xico', country: 'MX',
      x: 470, y: 523,
      dcs: [
        { id: 'kio-santa-fe', name: 'KIO Santa Fe I, II, III', hvacCount: 14 },
        { id: 'kio-interlomas', name: 'KIO Interlomas', hvacCount: 14 },
        { id: 'kio-tultitlan', name: 'KIO Tultitl\u00E1n', hvacCount: 14 }
      ]
    },
    {
      id: 'queretaro', city: 'Quer\u00E9taro', country: 'MX',
      x: 447, y: 503,
      dcs: [
        { id: 'kio-queretaro', name: 'KIO Quer\u00E9taro', hvacCount: 14 },
        { id: 'triara-queretaro', name: 'TRIARA Quer\u00E9taro', hvacCount: 14 },
        { id: 'equinix-queretaro', name: 'EQUINIX Quer\u00E9taro MX2', hvacCount: 14 }
      ]
    },
    {
      id: 'monterrey', city: 'Monterrey', country: 'MX',
      x: 449, y: 416,
      dcs: [
        { id: 'triara-monterrey', name: 'TRIARA Monterrey', hvacCount: 14 },
        { id: 'c3ntro-monterrey', name: 'C3NTRO Monterrey', hvacCount: 14 },
        { id: 'equinix-monterrey', name: 'EQUINIX Monterrey MO1', hvacCount: 14 }
      ]
    },
    {
      id: 'guadalajara', city: 'Guadalajara', country: 'MX',
      x: 393, y: 502,
      dcs: [
        { id: 'c3ntro-guadalajara', name: 'C3NTRO Guadalajara', hvacCount: 14 }
      ]
    },
    {
      id: 'puebla', city: 'Puebla', country: 'MX',
      x: 487, y: 530,
      dcs: [
        { id: 'c3ntro-puebla', name: 'C3NTRO Puebla', hvacCount: 14 }
      ]
    },
    {
      id: 'tijuana', city: 'Tijuana', country: 'MX',
      x: 145, y: 299,
      dcs: [
        { id: 'c3ntro-tijuana', name: 'C3NTRO Tijuana', hvacCount: 14 }
      ]
    },
    // === USA ===
    {
      id: 'mcallen', city: 'McAllen', country: 'US',
      x: 486, y: 407,
      dcs: [
        { id: 'mdc-mcallen', name: 'MDC McAllen', hvacCount: 14 }
      ]
    },
    {
      id: 'laredo', city: 'Laredo', country: 'US',
      x: 463, y: 385,
      dcs: [
        { id: 'mdc-laredo', name: 'MDC Laredo', hvacCount: 14 }
      ]
    },
    {
      id: 'dallas', city: 'Dallas', country: 'US',
      x: 513, y: 295,
      dcs: [
        { id: 'equinix-dallas', name: 'EQUINIX Dallas (Informart)', hvacCount: 14 },
        { id: 'flexential-dallas', name: 'FLEXENTIAL Dallas DA6', hvacCount: 14 }
      ]
    },
    {
      id: 'miami', city: 'Miami', country: 'US',
      x: 818, y: 415,
      dcs: [
        { id: 'equinix-miami', name: 'EQUINIX Miami (NAP of the Americas) MI1', hvacCount: 14 }
      ]
    },
    {
      id: 'chicago', city: 'Chicago', country: 'US',
      x: 679, y: 139,
      dcs: [
        { id: 'equinix-chicago', name: 'EQUINIX Chicago', hvacCount: 14 }
      ]
    },
    {
      id: 'los-angeles', city: 'Los Angeles', country: 'US',
      x: 123, y: 273,
      dcs: [
        { id: 'equinix-la', name: 'EQUINIX Los Angeles', hvacCount: 14 }
      ]
    },
    {
      id: 'ashburn', city: 'Ashburn', country: 'US',
      x: 864, y: 188,
      dcs: [
        { id: 'equinix-ashburn', name: 'EQUINIX Ashburn DC3', hvacCount: 14 }
      ]
    },
    {
      id: 'new-york', city: 'Nueva York', country: 'US',
      x: 927, y: 159,
      dcs: [
        { id: 'equinix-ny', name: 'EQUINIX New York NY5', hvacCount: 14 }
      ]
    }
  ],

  // Network connections between cities (by city id)
  connections: [
    // Mexico backbone
    ['cdmx', 'queretaro'],
    ['cdmx', 'puebla'],
    ['cdmx', 'guadalajara'],
    ['cdmx', 'monterrey'],
    ['queretaro', 'guadalajara'],
    ['monterrey', 'laredo'],
    ['monterrey', 'mcallen'],
    // US-Mexico cross-border
    ['tijuana', 'los-angeles'],
    ['laredo', 'dallas'],
    ['mcallen', 'dallas'],
    // US backbone
    ['dallas', 'chicago'],
    ['dallas', 'miami'],
    ['dallas', 'ashburn'],
    ['chicago', 'new-york'],
    ['chicago', 'ashburn'],
    ['ashburn', 'new-york'],
    ['ashburn', 'miami'],
    ['los-angeles', 'dallas']
  ]
};
