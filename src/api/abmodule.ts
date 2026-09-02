// AB 版模块配置接口（C 端 H5 gyz-h5-spacestation 模块显隐，见 PLAN-ab-module.md）
// 约定：module_key/item_key 创建后不可改（编辑请求不含该字段）；
// item_key 的值是 H5 代码 camelCase 常量原文（topBanner），属业务数据不受 snake_case 约束

import { get, post } from './request'
import type { PageReq, PageResp } from './types'
import { cleanQuery } from '@/utils/format'

export interface AbModuleRow {
  id: number
  module_key: string
  module_name: string
  sort_no: number
  item_count: number
  created_at: string
  updated_at: string
}

export interface AbModuleOption {
  id: number
  module_key: string
  module_name: string
}

export interface AbItemRow {
  id: number
  module_id: number
  module_key: string
  item_key: string
  item_name: string
  versions: string[] // 'mass' 大众版 / 'data' 数据版
  sort_no: number
  created_at: string
  updated_at: string
}

export interface AbModuleQuery {
  module_key?: string // 模糊，空串不过滤
  module_name?: string // 模糊，空串不过滤
}

export interface AbItemQuery {
  module_id?: number // 精确；0/不传 = 不过滤（值域从 1 起，0 无业务含义）
  item_key?: string // 模糊，空串不过滤
}

export interface AbModuleSaveReq {
  module_key: string
  module_name: string
  sort_no: number
}

export interface AbItemSaveReq {
  module_id: number
  item_key: string
  item_name: string
  versions: string[]
  sort_no: number
}

export const listAbModulesPage = (query: AbModuleQuery & PageReq) =>
  post<PageResp<AbModuleRow>>('/ab/modules/list', cleanQuery(query))

export const listAbModuleOptions = () => get<AbModuleOption[]>('/ab/modules/options')

export const addAbModule = (data: AbModuleSaveReq) => post<null>('/ab/modules/add', data)

export const editAbModule = (data: Omit<AbModuleSaveReq, 'module_key'> & { id: number }) =>
  post<null>('/ab/modules/edit', data)

export const deleteAbModule = (data: { id: number }) => post<null>('/ab/modules/delete', data)

export const listAbItemsPage = (query: AbItemQuery & PageReq) =>
  post<PageResp<AbItemRow>>('/ab/items/list', cleanQuery(query))

export const addAbItem = (data: AbItemSaveReq) => post<null>('/ab/items/add', data)

export const editAbItem = (data: Omit<AbItemSaveReq, 'item_key'> & { id: number }) => post<null>('/ab/items/edit', data)

export const deleteAbItem = (data: { id: number }) => post<null>('/ab/items/delete', data)
