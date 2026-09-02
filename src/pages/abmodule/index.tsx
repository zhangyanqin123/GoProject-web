// AB 版模块配置：Tabs 两页（模块管理 / 配置项管理）
// 两 tab 独立查询（配置项 tab 挂载时拉父模块下拉与自身列表），无跨 tab 联动；
// 弹窗打开时重拉模块下拉，模块 tab 的新增模块无需切 tab 即可选到
import { useState } from 'react'
import { Card, Tabs } from 'antd'

import ModuleTab from './ModuleTab'
import ItemTab from './ItemTab'

const ABModulePage = () => {
  const [activeTab, setActiveTab] = useState('modules')

  const items = [
    { key: 'modules', label: '模块管理', children: <ModuleTab /> },
    { key: 'items', label: '配置项管理', children: <ItemTab /> },
  ]

  return (
    // 页面标题由全局 tab 栏承载，Card 不带 head（对齐 order 页）
    <Card variant="borderless" style={{ borderRadius: 0 }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={items} />
    </Card>
  )
}

export default ABModulePage
