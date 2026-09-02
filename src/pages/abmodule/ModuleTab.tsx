// 模块管理 tab：搜索（标识/名称模糊）+ 分页表格 + 新增/编辑弹窗 + Popconfirm 删除
// 结构对齐 ProductTab（Form + Table，不嵌套 Card——外层已有「AB 模块配置」Card）
import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, message, Popconfirm, Space, Table, theme } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { deleteAbModule, listAbModulesPage, type AbModuleRow } from '@/api/abmodule'
import { usePagedList } from '@/hooks/usePagedList'
import { text } from '@/utils/format'
import ModuleEditModal from './ModuleEditModal'

interface QueryForm {
  module_key: string
  module_name: string
}

const ModuleTab = () => {
  const [form] = Form.useForm<QueryForm>()
  const { token: themeToken } = theme.useToken()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AbModuleRow | null>(null)

  const fetcher = useCallback((q: Parameters<typeof listAbModulesPage>[0]) => listAbModulesPage(q), [])
  const { list, count, loading, page, pageSize, search, reset, reload, onPaginationChange } =
    usePagedList<AbModuleRow, QueryForm>(fetcher)

  const getQuery = (): QueryForm => {
    const values = form.getFieldsValue()
    return { module_key: values.module_key?.trim() ?? '', module_name: values.module_name?.trim() ?? '' }
  }

  // 首屏空条件查询
  useEffect(() => { search(getQuery) }, [])

  const handleDelete = async (row: AbModuleRow) => {
    try {
      await deleteAbModule({ id: row.id })
      message.success('删除成功')
      reload()
    } catch {
      // 失败文案已由拦截器统一 message.error（模块下存在配置项时后端 400 拦截并弹文案）
    }
  }

  const columns: ColumnsType<AbModuleRow> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '模块标识', dataIndex: 'module_key', width: 160 },
    { title: '模块名称', dataIndex: 'module_name', ellipsis: true },
    { title: '排序号', dataIndex: 'sort_no', width: 80, align: 'right' },
    { title: '配置项数', dataIndex: 'item_count', width: 90, align: 'right' },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: text },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, render: text },
    {
      title: '操作',
      key: 'action',
      width: 110,
      render: (_, row) => (
        <Space>
          <a onClick={() => { setEditing(row); setModalOpen(true) }}>编辑</a>
          <Popconfirm
            title={`确定删除模块「${row.module_name}」？`}
            description="模块下存在配置项时无法删除（不级联删，需先删除全部配置项）"
            onConfirm={() => handleDelete(row)}
          >
            <a style={{ color: themeToken.colorError }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Form form={form} layout="inline" style={{ marginBottom: 16 }} onFinish={() => search(getQuery)}>
        <Form.Item name="module_key">
          <Input placeholder="模块标识（模糊匹配）" allowClear style={{ width: 190 }} />
        </Form.Item>
        <Form.Item name="module_name">
          <Input placeholder="模块名称（模糊匹配）" allowClear style={{ width: 180 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
            <Button onClick={() => { form.resetFields(); reset({ module_key: '', module_name: '' }) }}>重置</Button>
          </Space>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
              新增模块
            </Button>
            <Button icon={<ReloadOutlined />} onClick={reload} title="刷新" />
          </Space>
        </Form.Item>
      </Form>

      <Table<AbModuleRow>
        rowKey="id"
        size="middle"
        bordered
        loading={loading}
        dataSource={list}
        columns={columns}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total: count,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          pageSizeOptions: [5, 10, 20, 50, 100],
          onChange: onPaginationChange,
        }}
      />

      <ModuleEditModal
        open={modalOpen}
        record={editing}
        onClose={() => setModalOpen(false)}
        onDone={() => { setModalOpen(false); reload() }}
      />
    </>
  )
}

export default ModuleTab
