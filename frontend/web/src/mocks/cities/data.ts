import type { CityListData } from '@/types/api'

// Synthetic preview records only. / 仅供演示的合成记录，不含真实用户或运营数据。
export const sampleCities: CityListData = {
  items: [
    {
      id: 'demo-city-local',
      nameZh: '示例线下城市',
      nameEn: 'Sample Local City',
      fulfillment: 'local',
    },
    {
      id: 'demo-city-post',
      nameZh: '示例快递城市',
      nameEn: 'Sample Postal City',
      fulfillment: 'post',
    },
  ],
  total: 2,
}

export const emptyCities: CityListData = { items: [], total: 0 }
