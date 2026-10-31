import type { DeliveryConfig } from '@/types/api'

// Synthetic preview records only. / 仅供演示的合成记录，不含真实用户或运营数据。
export const sampleDelivery: DeliveryConfig = {
  localFeeMinor: 600,
  postFeeMinor: 800,
  freePostThresholdMinor: 5000,
  currency: null,
  areas: [
    {
      id: 'demo-area-001',
      cityId: 'demo-city-local',
      cityNameZh: '示例线下城市',
      name: '示例中心区',
      enabled: true,
    },
    {
      id: 'demo-area-002',
      cityId: 'demo-city-local',
      cityNameZh: '示例线下城市',
      name: '示例外围区',
      enabled: false,
    },
  ],
  timeSlots: [
    {
      id: 'demo-slot-001',
      name: '示例上午',
      startTime: '08:00',
      endTime: '12:00',
      enabled: true,
    },
    {
      id: 'demo-slot-002',
      name: '示例下午',
      startTime: '12:00',
      endTime: '17:00',
      enabled: false,
    },
  ],
}
