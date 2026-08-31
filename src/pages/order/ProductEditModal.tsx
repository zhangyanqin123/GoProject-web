// 新增/编辑商品弹窗（合一）：名称/价格/库存三字段全覆盖提交
import { useEffect } from 'react'
import { Form, Input, InputNumber, Modal, message } from 'antd'

import { addProduct, editProduct, type ProductRow } from '@/api/order'

interface Props {
  open: boolean
  record: ProductRow | null // null=新增
  onClose: () => void
  onDone: () => void
}

interface FormValues {
  product_name: string
  price: number
  stock: number
}

const ProductEditModal = ({ open, record, onClose, onDone }: Props) => {
  const [form] = Form.useForm<FormValues>()
  const isEdit = record !== null

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({
        product_name: record?.product_name ?? '',
        price: record?.price,
        stock: record?.stock ?? 0,
      })
    }
  }, [open, record, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      if (isEdit && record) {
        await editProduct({ id: record.id, ...values })
        message.success('编辑成功')
      } else {
        await addProduct(values)
        message.success('新增成功')
      }
      onDone()
    } catch {
      // 失败文案由拦截器统一 message.error（商品不存在等），弹窗保留供修改
    }
  }

  return (
    <Modal
      title={isEdit ? '编辑商品' : '新增商品'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      okText="保 存"
      cancelText="取 消"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ stock: 0 }}>
        <Form.Item
          name="product_name"
          label="商品名称"
          rules={[{ required: true, max: 100, message: '请输入商品名称（≤100 字符）' }]}
        >
          <Input placeholder="请输入商品名称" maxLength={100} />
        </Form.Item>
        <Form.Item
          name="price"
          label="价格（元）"
          rules={[{ required: true, message: '请输入价格' }]}
        >
          <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="请输入单价" />
        </Form.Item>
        <Form.Item
          name="stock"
          label="库存"
          rules={[{ required: true, message: '请输入库存' }]}
          tooltip="0 表示售罄；编辑库存与消费者异步扣减可能互相覆盖，保存后以列表为准"
        >
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="请输入库存数量" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ProductEditModal
