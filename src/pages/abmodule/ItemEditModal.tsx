// 新增/编辑配置项弹窗（合一）：item_key 编辑态置灰（创建后不可改）；module_id 可改 = 挪模块；
// versions 勾选（mass/data 至少一项）；弹窗打开时重拉模块下拉保证新增模块可选
import { useEffect, useState } from 'react'
import { Checkbox, Form, Input, InputNumber, Modal, Select, message } from 'antd'

import { addAbItem, editAbItem, listAbModuleOptions, type AbItemRow, type AbModuleOption } from '@/api/abmodule'
import { toOptions } from '@/constants/dicts'
import { AB_VERSIONS } from '@/constants/abmodule'

interface Props {
  open: boolean
  record: AbItemRow | null // null=新增
  onClose: () => void
  onDone: () => void
}

interface FormValues {
  module_id: number
  item_key: string
  item_name: string
  versions: string[]
  sort_no: number
}

const ItemEditModal = ({ open, record, onClose, onDone }: Props) => {
  const [form] = Form.useForm<FormValues>()
  const [options, setOptions] = useState<AbModuleOption[]>([])
  const [loading, setLoading] = useState(false)
  const isEdit = record !== null

  // 打开弹窗时重拉模块下拉（模块 tab 可能刚新增过模块）
  useEffect(() => {
    if (!open) return
    setLoading(true)
    listAbModuleOptions()
      .then(setOptions)
      .catch(() => undefined)
      .finally(() => setLoading(false))
    form.resetFields()
    form.setFieldsValue({
      module_id: record?.module_id,
      item_key: record?.item_key ?? '',
      item_name: record?.item_name ?? '',
      versions: record?.versions ?? [],
      sort_no: record?.sort_no ?? 0,
    })
  }, [open, record, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      if (isEdit && record) {
        // item_key 不可改：编辑请求不含该字段；module_id 可改 = 挪模块
        await editAbItem({ id: record.id, module_id: values.module_id, item_name: values.item_name, versions: values.versions, sort_no: values.sort_no })
        message.success('编辑成功')
      } else {
        await addAbItem(values)
        message.success('新增成功')
      }
      onDone()
    } catch {
      // 失败文案由拦截器统一 message.error（标识已存在/版本值域非法等），弹窗保留供修改
    }
  }

  return (
    <Modal title={isEdit ? '编辑配置项' : '新增配置项'} open={open} onOk={handleOk} onCancel={onClose} destroyOnHidden okText="保 存" cancelText="取 消">
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} initialValues={{ sort_no: 0 }}>
        <Form.Item name="module_id" label="所属模块" rules={[{ required: true, message: '请选择所属模块' }]}>
          <Select
            placeholder="请选择所属模块"
            loading={loading}
            options={options.map((o) => ({ value: o.id, label: `${o.module_name}（${o.module_key}）` }))}
          />
        </Form.Item>
        {isEdit ? (
          <Form.Item name="item_key" label="配置项标识" tooltip="标识创建后不可修改（H5 代码按此引用），要换标识走删旧建新">
            <Input disabled />
          </Form.Item>
        ) : (
          <Form.Item
            name="item_key"
            label="配置项标识"
            rules={[{ required: true, max: 50, pattern: /^[A-Za-z][A-Za-z0-9]{0,49}$/, message: '英文字母开头，仅含英文字母/数字（camelCase），≤50 字符' }]}
            tooltip="H5 代码 camelCase 常量原文（如 topBanner），创建后不可修改"
          >
            <Input placeholder="如 topBanner" maxLength={50} />
          </Form.Item>
        )}
        <Form.Item name="item_name" label="配置项名称" rules={[{ required: true, max: 100, message: '请输入配置项名称（≤100 字符）' }]}>
          <Input placeholder="如 顶部图" maxLength={100} />
        </Form.Item>
        <Form.Item name="versions" label="可见版本" rules={[{ required: true, message: '请至少选择一个可见版本' }]} tooltip="该配置项对哪些版本可见（mass 大众版 / data 数据版）">
          <Checkbox.Group options={toOptions(AB_VERSIONS)} />
        </Form.Item>
        <Form.Item name="sort_no" label="排序号" tooltip="管理台列表按排序号升序展示">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="请输入排序号" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ItemEditModal
