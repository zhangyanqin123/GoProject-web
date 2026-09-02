// 配置项管理 tab：父模块下拉筛选 + 标识模糊 + 分页表格 + 新增/编辑弹窗 + Popconfirm 删除
// versions 列彩色 Tag 渲染（大众版/数据版并列，信息无损）
import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, message, Popconfirm, Select, Space, Table, Tag, theme } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { deleteAbItem, listAbItemsPage, listAbModuleOptions, type AbItemRow, type AbModuleOption } from '@/api/abmodule'
import { AB_VERSIONS } from '@/constants/abmodule'
import { usePagedList } from '@/hooks/usePagedList'
import { text } from '@/utils/format'
import ItemEditModal from './ItemEditModal'

interface QueryForm {
  module_id?: number
  item_key: string
}

const ItemTab = () => {
  const [form] = Form.useForm<QueryForm>()
  const { token: themeToken } = theme.useToken()
  const [options, setOptions] = useState<AbModuleOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AbItemRow | null>(null)

  const fetcher = useCallback((q: Parameters<typeof listAbItemsPage>[0]) => listAbItemsPage(q), [])
  const { list, count, loading, page, pageSize, search, reset, reload, onPaginationChange } =
    usePagedList<AbItemRow, QueryForm>(fetcher)

  const getQuery = (): QueryForm => {
    const values = form.getFieldsValue()
    return { module_id: values.module_id ?? undefined, item_key: values.item_key?.trim() ?? '' }
  }

  // 首屏空条件查询 + 拉父模块下拉
  useEffect(() => {
    search(getQuery)
    setOptionsLoading(true)
    listAbModuleOptions()
      .then(setOptions)
      .catch(() => undefined)
      .finally(() => setOptionsLoading(false))
  }, [])

  const handleDelete = async (row: AbItemRow) => {
    try {
      await deleteAbItem({ id: row.id })
      message.success('删除成功')
      reload()
    } catch {
      // 失败文案已由拦截器统一 message.error（配置项不存在等）
    }
  }

  const renderVersions = (v: string[]) =>
    v.map((x) => {
      const dict = AB_VERSIONS.find((d) => d.value === x)
      return <Tag key={x} color={dict?.color ?? 'default'}>{dict?.label ?? x}</Tag>
    })

  const columns: ColumnsType<AbItemRow> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '所属模块', dataIndex: 'module_key', width: 140 },
    { title: '配置项标识', dataIndex: 'item_key', width: 140 },
    { title: '配置项名称', dataIndex: 'item_name', ellipsis: true },
    { title: '可见版本', dataIndex: 'versions', width: 170, render: renderVersions },
    { title: '排序号', dataIndex: 'sort_no', width: 80, align: 'right' },
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
            title={`确定删除配置项「${row.item_name}」？`}
            description="删除后该模块 UI 在 H5 全版本隐藏"
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
        <Form.Item name="module_id">
          <Select
            placeholder="所属模块（全部）"
            allowClear
            style={{ width: 190 }}
            loading={optionsLoading}
            options={options.map((o) => ({ value: o.id, label: `${o.module_name}（${o.module_key}）` }))}
          />
        </Form.Item>
        <Form.Item name="item_key">
          <Input placeholder="配置项标识（模糊匹配）" allowClear style={{ width: 190 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
            <Button onClick={() => { form.resetFields(); reset({ item_key: '' }) }}>重置</Button>
          </Space>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
              新增配置项
            </Button>
            <Button icon={<ReloadOutlined />} onClick={reload} title="刷新" />
          </Space>
        </Form.Item>
      </Form>

      <Table<AbItemRow>
        rowKey="id"
        size="middle"
        bordered
        loading={loading}
        dataSource={list}
        columns={columns}
        scroll={{ x: 1250 }}
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

      <ItemEditModal
        open={modalOpen}
        record={editing}
        onClose={() => setModalOpen(false)}
        onDone={() => { setModalOpen(false); reload() }}
      />
    </>
  )
}

export default ItemTab
