// Indonesian Administrative Region API & Caching Service
// Data source: emsifa/api-wilayah-indonesia (Kemendagri / BPS standard)

export interface ProvinceItem {
  id: string;
  name: string;
}

export interface RegencyItem {
  id: string;
  province_id: string;
  name: string;
}

export interface DistrictItem {
  id: string;
  regency_id: string;
  name: string;
}

// In-memory cache to avoid redundant API requests
const memoryCache: {
  provinces: ProvinceItem[] | null;
  regencies: Record<string, RegencyItem[]>;
  districts: Record<string, DistrictItem[]>;
} = {
  provinces: null,
  regencies: {},
  districts: {}
};

// Fallback provinces in case network is disconnected
const FALLBACK_PROVINCES: ProvinceItem[] = [
  { id: '31', name: 'DKI JAKARTA' },
  { id: '32', name: 'JAWA BARAT' },
  { id: '33', name: 'JAWA TENGAH' },
  { id: '34', name: 'DI YOGYAKARTA' },
  { id: '35', name: 'JAWA TIMUR' },
  { id: '36', name: 'BANTEN' },
  { id: '51', name: 'BALI' },
  { id: '11', name: 'ACEH' },
  { id: '12', name: 'SUMATERA UTARA' },
  { id: '13', name: 'SUMATERA BARAT' },
  { id: '16', name: 'SUMATERA SELATAN' },
  { id: '64', name: 'KALIMANTAN TIMUR' },
  { id: '73', name: 'SULAWESI SELATAN' }
];

export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const fetchProvinces = async (): Promise<ProvinceItem[]> => {
  if (memoryCache.provinces && memoryCache.provinces.length > 0) {
    return memoryCache.provinces;
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem('sasi_wilayah_provinces');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache.provinces = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
    if (res.ok) {
      const data: ProvinceItem[] = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      memoryCache.provinces = data;
      try {
        localStorage.setItem('sasi_wilayah_provinces', JSON.stringify(data));
      } catch (e) {}
      return data;
    }
  } catch (err) {
    console.warn('Gagal memuat provinsi dari API, menggunakan fallback:', err);
  }

  return FALLBACK_PROVINCES;
};

export const fetchRegencies = async (provinceId: string): Promise<RegencyItem[]> => {
  if (!provinceId) return [];
  if (memoryCache.regencies[provinceId]) {
    return memoryCache.regencies[provinceId];
  }

  try {
    const cached = localStorage.getItem(`sasi_wilayah_regencies_${provinceId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache.regencies[provinceId] = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`);
    if (res.ok) {
      const data: RegencyItem[] = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      memoryCache.regencies[provinceId] = data;
      try {
        localStorage.setItem(`sasi_wilayah_regencies_${provinceId}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    }
  } catch (err) {
    console.warn('Gagal memuat regencies dari API:', err);
  }

  // Fallback if West Java
  if (provinceId === '32') {
    return [
      { id: '3211', province_id: '32', name: 'KABUPATEN SUMEDANG' },
      { id: '3204', province_id: '32', name: 'KABUPATEN BANDUNG' },
      { id: '3273', province_id: '32', name: 'KOTA BANDUNG' }
    ];
  }

  return [];
};

export const fetchDistricts = async (regencyId: string): Promise<DistrictItem[]> => {
  if (!regencyId) return [];
  if (memoryCache.districts[regencyId]) {
    return memoryCache.districts[regencyId];
  }

  try {
    const cached = localStorage.getItem(`sasi_wilayah_districts_${regencyId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache.districts[regencyId] = parsed;
        return parsed;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`);
    if (res.ok) {
      const data: DistrictItem[] = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      memoryCache.districts[regencyId] = data;
      try {
        localStorage.setItem(`sasi_wilayah_districts_${regencyId}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    }
  } catch (err) {
    console.warn('Gagal memuat districts dari API:', err);
  }

  // Fallback if Sumedang
  if (regencyId === '3211') {
    return [
      { id: '3211032', regency_id: '3211', name: 'PAMULIHAN' },
      { id: '3211030', regency_id: '3211', name: 'TANJUNGSARI' },
      { id: '3211020', regency_id: '3211', name: 'JATINANGOR' }
    ];
  }

  return [];
};

export const formatFullAddress = (districtName: string, regencyName: string, provName: string): string => {
  const cleanDistrict = districtName ? districtName.replace(/^kec(amatan)?\.?\s*/i, '').trim() : '';
  const d = toTitleCase(cleanDistrict);
  const r = toTitleCase(regencyName ? regencyName.trim() : '');
  const p = toTitleCase(provName ? provName.trim() : '');

  if (d && r && p) {
    return `Kec. ${d}, ${r}, ${p}`;
  }
  if (d && r) {
    return `Kec. ${d}, ${r}`;
  }
  if (d && p) {
    return `Kec. ${d}, ${p}`;
  }
  if (d) {
    return `Kec. ${d}`;
  }
  if (r && p) {
    return `${r}, ${p}`;
  }
  if (r) {
    return r;
  }
  if (p) {
    return p;
  }
  return '';
};
