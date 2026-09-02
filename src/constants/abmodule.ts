// AB 版值域字典（versions 列：mass 大众版 / data 数据版；值域与定序见后端 service normalizeVersions）
import type { DictItem } from './dicts'

export const AB_VERSIONS: DictItem<string>[] = [
  { value: 'mass', label: '大众版', color: 'blue' },
  { value: 'data', label: '数据版', color: 'orange' },
]
