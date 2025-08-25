import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, message, Modal, Checkbox } from 'antd';
import { SearchOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import ApiService from '../services/apiService';
import AuthModal from '../components/AuthModal';

const { Search } = Input;
const { confirm } = Modal;

function ConsumptionRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState(null);

  // 获取所有消费记录
  const fetchAllRecords = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getAllConsumptionRecords();
      if (response.success) {
        setRecords(response.data.records || []);
        setIsSearching(false);
        setSearchPhone('');
      } else {
        message.error(response.message || '获取消费记录失败');
      }
    } catch (error) {
      message.error('获取消费记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索消费记录
  const handleSearch = async (phone) => {
    if (!phone.trim()) {
      fetchAllRecords();
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.searchConsumptionRecords(phone.trim());
      if (response.success) {
        setRecords(response.data.records || []);
        setIsSearching(true);
        setSearchPhone(phone.trim());
        message.success(`找到 ${response.data.records.length} 条记录`);
      } else {
        message.error(response.message || '搜索失败');
      }
    } catch (error) {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除单条记录
  const handleDelete = (recordId, memberName, actionRecord) => {
    setPendingDeleteAction({
      type: 'single',
      recordId,
      memberName,
      actionRecord
    });
    setShowAuthModal(true);
  };

  // 执行删除操作
  const executeDelete = async () => {
    if (!pendingDeleteAction) return;

    try {
      if (pendingDeleteAction.type === 'single') {
        const response = await ApiService.deleteConsumptionRecord(pendingDeleteAction.recordId);
        if (response.success) {
          message.success('删除成功');
          // 重新加载数据
          if (isSearching && searchPhone) {
            handleSearch(searchPhone);
          } else {
            fetchAllRecords();
          }
        } else {
          message.error(response.message || '删除失败');
        }
      } else if (pendingDeleteAction.type === 'batch') {
        const response = await ApiService.deleteMultipleConsumptionRecords(pendingDeleteAction.recordIds);
        if (response.success) {
          message.success(response.message || '批量删除成功');
          setSelectedRowKeys([]);
          // 重新加载数据
          if (isSearching && searchPhone) {
            handleSearch(searchPhone);
          } else {
            fetchAllRecords();
          }
        } else {
          message.error(response.message || '批量删除失败');
        }
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除记录
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的记录');
      return;
    }

    setPendingDeleteAction({
      type: 'batch',
      recordIds: selectedRowKeys,
      count: selectedRowKeys.length
    });
    setShowAuthModal(true);
  };

  // 清空搜索，显示所有记录
  const handleClearSearch = () => {
    setSearchPhone('');
    fetchAllRecords();
  };

  // 表格列定义
  const columns = [
    {
      title: '会员姓名',
      dataIndex: ['fields', 'member_name'],
      key: 'memberName',
      width: 120,
    },
    {
      title: '会员手机号',
      dataIndex: ['fields', 'phonenumber'],
      key: 'memberPhone',
      width: 140,
    },
    {
      title: '消费日期',
      dataIndex: ['fields', 'date'],
      key: 'consumptionDate',
      width: 120,
      render: (text) => {
        if (!text) return '-';
        const date = new Date(text);
        return isNaN(date.getTime()) ? text : date.toLocaleDateString('zh-CN');
      },
      sorter: (a, b) => new Date(a.fields['date']) - new Date(b.fields['date']),
    },
    {
      title: '消费时间',
      dataIndex: ['fields', 'time'],
      key: 'consumptionTime',
      width: 100,
      render: (text) => {
        if (!text) return '-';
        // 如果是完整的时间格式，只显示时分秒
        if (text.includes(':')) {
          return text.split(' ')[0] || text;
        }
        return text;
      },
    },
    {
      title: '行动记录',
      dataIndex: ['fields', 'record'],
      key: 'actionRecord',
      width: 200,
      render: (text, record) => {
        if (!text) return '-';
        
        // 检查是否包含商品信息
        const productInfo = record.fields.product_details;
        if (productInfo) {
          return (
            <div>
              <div>{text}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                商品：{productInfo}
              </div>
            </div>
          );
        }
        
        return text;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(
            record.recordId,
            record.fields['会员姓名'],
            record.fields['行动记录']
          )}
        >
          删除
        </Button>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    getCheckboxProps: (record) => ({
      name: record.recordId,
    }),
  };

  useEffect(() => {
    fetchAllRecords();
  }, []);

  return (
    <div className="consumption-records">
      <Card title="消费记录管理" className="mb-4">
        <div className="mb-4">
          <Space size="middle">
            <Search
              placeholder="输入会员手机号搜索"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              style={{ width: 300 }}
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onSearch={handleSearch}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={handleClearSearch}
              disabled={loading}
            >
              显示全部
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              disabled={selectedRowKeys.length === 0}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Space>
        </div>

        {isSearching && (
          <div className="mb-3">
            <span className="text-blue-600">
              搜索结果：手机号 "{searchPhone}" 的消费记录 ({records.length} 条)
            </span>
          </div>
        )}

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={records}
          rowKey="recordId"
          loading={loading}
          pagination={{
            total: records.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>
      
      {/* 身份验证模态框 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingDeleteAction(null);
        }}
        onConfirm={executeDelete}
        title="删除确认"
        message={pendingDeleteAction?.type === 'single' 
          ? `确定要删除 ${pendingDeleteAction?.memberName} 的记录「${pendingDeleteAction?.actionRecord}」吗？此操作需要管理员权限。`
          : `确定要删除选中的 ${pendingDeleteAction?.count} 条记录吗？此操作需要管理员权限。`
        }
      />
    </div>
  );
}

export default ConsumptionRecords;