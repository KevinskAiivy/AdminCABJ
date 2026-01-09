
import React from 'react';
import { Team, Competition } from './types';

export const SOCIO_CATEGORIES = ['ACTIVO', 'ADHERENTE', 'INTERNACIONAL', 'CADETE', 'MENOR', 'VITALICIO', 'BEBÉ', 'ACTIVO EXTERIOR'] as const;
export const SOCIO_STATUS = ['AL DÍA', 'EN DEUDA', 'DE BAJA'] as const;

export const TIMEZONES = [
  'UTC-12:00 (Baker Island)',
  'UTC-11:00 (American Samoa)',
  'UTC-10:00 (Honolulu)',
  'UTC-09:00 (Anchorage)',
  'UTC-08:00 (Los Angeles)',
  'UTC-07:00 (Denver)',
  'UTC-06:00 (Ciudad de México)',
  'UTC-05:00 (Nueva York)',
  'UTC-04:00 (Santiago)',
  'UTC-03:30 (St. John\'s)',
  'UTC-03:00 (Buenos Aires)',
  'UTC-02:00 (South Georgia)',
  'UTC-01:00 (Azores)',
  'UTC+00:00 (Londres)',
  'UTC+01:00 (Madrid/París)',
  'UTC+02:00 (Tel Aviv/El Cairo)',
  'UTC+03:00 (Moscú/Doha)',
  'UTC+03:30 (Teherán)',
  'UTC+04:00 (Dubái)',
  'UTC+04:30 (Kabul)',
  'UTC+05:00 (Karachi)',
  'UTC+05:30 (Mumbai)',
  'UTC+05:45 (Katmandú)',
  'UTC+06:00 (Dhaka)',
  'UTC+06:30 (Rangún)',
  'UTC+07:00 (Bangkok)',
  'UTC+08:00 (Pekín/Singapur)',
  'UTC+08:45 (Eucla)',
  'UTC+09:00 (Tokio/Seúl)',
  'UTC+09:30 (Adelaida)',
  'UTC+10:00 (Sídney)',
  'UTC+10:30 (Lord Howe Island)',
  'UTC+11:00 (Magadán)',
  'UTC+12:00 (Auckland)',
  'UTC+12:45 (Chatham Islands)',
  'UTC+13:00 (Apia)',
  'UTC+14:00 (Kiritimati)'
] as const;

export const COUNTRIES = [
  "Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda", "Arabia Saudí", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán",
  "Bahamas", "Bahrein", "Bangladesh", "Barbados", "Belarús", "Bélgica", "Belice", "Benín", "Bhután", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Chile", "China", "Chipre", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Cuba",
  "Dinamarca", "Dominica", "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Etiopía",
  "Filipinas", "Finlandia", "Fiyi", "Francia",
  "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guinea", "Guinea-Bisáu", "Guinea Ecuatorial", "Guyana",
  "Haití", "Honduras", "Hungría",
  "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall", "Islas Salomón", "Israel", "Italia",
  "Jamaica", "Japón", "Jordania",
  "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kuwait",
  "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania", "Luxemburgo",
  "Macedonia del Norte", "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta", "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco", "Mongolia", "Montenegro", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda",
  "Omán",
  "Países Bajos", "Pakistán", "Palaos", "Palestina", "Panamá", "Papúa Nueva Guinea", "Paraguay", "Perú", "Polonia", "Portugal",
  "Reino Unido", "República Centroafricana", "República Checa", "República del Congo", "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumania", "Rusia",
  "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas", "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona", "Singapur", "Siria", "Somalia", "Sri Lanka", "Sudáfrica", "Sudán", "Sudán del Sur", "Suecia", "Suiza", "Surinam",
  "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental", "Togo", "Tonga", "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu",
  "Ucrania", "Uganda", "Uruguay", "Uzbekistán",
  "Vanuatu", "Vaticano", "Venezuela", "Vietnam",
  "Yemen", "Yibuti",
  "Zambia", "Zimbabue"
];

export const COUNTRY_OPTIONS = [
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
    { code: 'ES', name: 'España', flag: '🇪🇸' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
    { code: 'MX', name: 'México', flag: '🇲🇽' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹' },
    { code: 'FR', name: 'Francia', flag: '🇫🇷' },
];

export const WORLD_CITIES = [
    { city: 'Madrid', country: 'España', tz: 'UTC+01:00 (Madrid/París)' },
    { city: 'Barcelona', country: 'España', tz: 'UTC+01:00 (Madrid/París)' },
    { city: 'Miami', country: 'Estados Unidos', tz: 'UTC-05:00 (Nueva York)' },
    { city: 'Buenos Aires', country: 'Argentina', tz: 'UTC-03:00 (Buenos Aires)' }
];

export const BocaLogoSVG = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z" />
    <path fill="#FCB131" d="M15 40 H85 V60 H15 Z" />
    <text x="50" y="32" fontSize="10" fill="#FCB131" textAnchor="middle" fontWeight="bold" fontFamily="Arial">C A B J</text>
    <text x="50" y="75" fontSize="10" fill="#FCB131" textAnchor="middle" fontWeight="bold" fontFamily="Arial">1905</text>
  </svg>
);
