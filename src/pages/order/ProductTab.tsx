// 商品列表 tab：搜索（名称模糊）+ 分页表格 + 新增/编辑弹窗 + Popconfirm 删除
// 结构对齐其他 tab（Form + Table，不嵌套 Card——外层已有「订单管理」Card）
import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, message, Popconfirm, Space, Table, theme } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { deleteProduct, listProductsPage, type ProductRow } from '@/api/order'
import { usePagedList } from '@/hooks/usePagedList'
import { text } from '@/utils/format'
import ProductEditModal from './ProductEditModal'

interface QueryForm {
  product_name: string
}
interface Props {
  onMutated?: () => void // 增删改成功后通知父组件（驱动「创建订单」商品下拉刷新）
}

const ProductTab = ({ onMutated }: Props) => {
  const [form] = Form.useForm<QueryForm>()
  const { token: themeToken } = theme.useToken()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)

  const fetcher = useCallback((q: Parameters<typeof listProductsPage>[0]) => listProductsPage(q), [])
  const { list, count, loading, page, pageSize, search, reset, reload, onPaginationChange } =
    usePagedList<ProductRow, QueryForm>(fetcher)

  const getQuery = (): QueryForm => {
    const values = form.getFieldsValue()
    return { product_name: values.product_name?.trim() ?? '' }
  }

  // 首屏空条件查询
  useEffect(() => { search(getQuery) }, [])

  const handleDelete = async (row: ProductRow) => {
    try {
      await deleteProduct({ id: row.id })
      message.success('删除成功')
      onMutated?.()
      reload()
    } catch {
      // 失败文案已由拦截器统一 message.error（如「商品不存在」）
    }
  }

  const columns: ColumnsType<ProductRow> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '商品名称', dataIndex: 'product_name', ellipsis: true },
    { title: '价格', dataIndex: 'price', width: 110, align: 'right', render: (v: number) => `￥${v.toFixed(2)}` },
    { title: '库存', dataIndex: 'stock', width: 90, align: 'right' },
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
            title={`确定删除商品「${row.product_name}」？`}
            description="历史订单保留快照不受影响，删除后该商品不可下单"
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
        <Form.Item name="product_name">
          <Input placeholder="商品名称（模糊匹配）" allowClear style={{ width: 200 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
            <Button onClick={() => { form.resetFields(); reset({ product_name: '' }) }}>重置</Button>
          </Space>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
              新增商品
            </Button>
            <Button icon={<ReloadOutlined />} onClick={reload} title="刷新" />
          </Space>
        </Form.Item>
      </Form>

      <Table<ProductRow>
        rowKey="id"
        size="middle"
        bordered
        loading={loading}
        dataSource={list}
        columns={columns}
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

      <ProductEditModal
        open={modalOpen}
        record={editing}
        onClose={() => setModalOpen(false)}
        onDone={() => { setModalOpen(false); onMutated?.(); reload() }}
      />
    </>
  )
}

export default ProductTab
