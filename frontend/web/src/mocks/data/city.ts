/**
 * 城市的模拟数据：模拟接口启动时数据库中已有的城市。
 *
 * 数据使用生成的类型声明，契约改动后，类型检查会指出这里需要同步修改的地方。
 * 这里的数据只读，模拟接口启动时复制一份再修改（见 src/mocks/handlers/city.ts）。
 *
 * 其他模块照着写时要改的地方：
 * - 类型换成本模块的 schema，从 src/api/<模块>.ts 引入。
 * - 数据要覆盖页面上的各种状态（如每一种订单状态各有几条），便于开发和验证。
 * - id 用雪花 ID 格式的字符串。被其他模块引用的 id（如配送大区的 cityId）要与这里一致。
 */
import type { City } from '@/api/city'

/**
 * 三个城市：悉尼、墨尔本走线下配送，堪培拉走快递，见 PRD 第 11 节和原型。
 * 悉尼、堪培拉的 id 与契约中的示例一致。
 */
export const cityRecords: readonly City[] = [
  {
    id: '1854239876543209472',
    nameZh: '悉尼',
    nameEn: 'Sydney',
    fulfillment: 'local',
    state: 'NSW',
    timezone: 'Australia/Sydney',
    sort: 1,
  },
  {
    id: '1854239876543209475',
    nameZh: '墨尔本',
    nameEn: 'Melbourne',
    fulfillment: 'local',
    state: 'VIC',
    timezone: 'Australia/Melbourne',
    sort: 2,
  },
  {
    id: '1854239876543209473',
    nameZh: '堪培拉',
    nameEn: 'Canberra',
    fulfillment: 'post',
    state: 'ACT',
    timezone: 'Australia/Sydney',
    sort: 3,
  },
]
