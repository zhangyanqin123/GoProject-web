// 新增/编辑模块弹窗（合一）：module_key 编辑态置灰——创建后不可改（H5 代码按此引用），编辑请求不含该字段
import { useEffect } from 'react'
import { Form, Input, InputNumber, Modal, message } from 'antd'

import { addAbModule, editAbModule, type AbModuleRow } from '@/api/abmodule'

interface Props {
  open: boolean
  record: AbModuleRow | null // null=新增
  onClose: () => void
  onDone: () => void
}

interface FormValues {
  module_key: string
  module_name: string
  sort_no: number
}

const ModuleEditModal = ({ open, record, onClose, onDone }: Props) => {
  const [form] = Form.useForm<FormValues>()
  const isEdit = record !== null

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({
        module_key: record?.module_key ?? '',
        module_name: record?.module_name ?? '',
        sort_no: record?.sort_no ?? 0,
      })
    }
  }, [open, record, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      if (isEdit && record) {
        // module_key 不可改：编辑请求不含该字段（后端契约层同样杜绝）
        await editAbModule({ id: record.id, module_name: values.module_name, sort_no: values.sort_no })
        message.success('编辑成功')
      } else {
        await addAbModule(values)
        message.success('新增成功')
      }
      onDone()
    } catch {
      // 失败文案由拦截器统一 message.error（标识已存在/格式非法等），弹窗保留供修改
    }
  }

  return (
    <Modal title={isEdit ? '编辑模块' : '新增模块'} open={open} onOk={handleOk} onCancel={onClose} destroyOnHidden okText="保 存" cancelText="取 消">
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ sort_no: 0 }}>
        {isEdit ? (
          <Form.Item name="module_key" label="模块标识" tooltip="标识创建后不可修改（H5 代码按此引用），要换标识走删旧建新">
            <Input disabled />
          </Form.Item>
        ) : (
          <Form.Item
            name="module_key"
            label="模块标识"
            rules={[{ required: true, max: 50, pattern: /^[a-z][a-z0-9_]{0,49}$/, message: '小写字母开头，仅含小写字母/数字/下划线，≤50 字符' }]}
            tooltip="H5 页面域标识（聚合接口返回 map 第一级 key，如 spacestation），创建后不可修改"
          >
            <Input placeholder="如 spacestation" maxLength={50} />
          </Form.Item>
        )}
        <Form.Item name="module_name" label="模块名称" rules={[{ required: true, max: 100, message: '请输入模块名称（≤100 字符）' }]}>
          <Input placeholder="如 空间站" maxLength={100} />
        </Form.Item>
        <Form.Item name="sort_no" label="排序号" tooltip="管理台列表按排序号升序展示">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="请输入排序号" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ModuleEditModal
