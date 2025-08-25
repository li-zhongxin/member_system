import React, { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import AuthModal from '../components/AuthModal';
import '../styles/global-enhancement.css';

function InventoryRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterOperation, setFilterOperation] = useState(''); // 操作类型筛选（增加/减少/无变化）
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState(null);

  // 获取所有库存盘点记录
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getAllInventoryRecords();
      if (response.success) {
        setRecords(response.data.records || []);
        setMessage({ type: 'success', text: `成功获取${response.data.records.length}条盘点记录` });
      } else {
        setMessage({ type: 'error', text: response.message || '获取盘点记录失败' });
      }
    } catch (error) {
      console.error('获取盘点记录失败:', error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 搜索盘点记录
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchRecords();
      return;
    }

    setLoading(true);
    try {
      // 使用API搜索功能直接搜索商品名称或ID
      const response = await ApiService.searchInventoryRecords(searchTerm);
      if (response.success) {
        const filteredRecords = response.data.records || [];

        
        setRecords(filteredRecords);
        setMessage({ type: 'success', text: `找到${filteredRecords.length}条匹配记录` });
      } else {
        setMessage({ type: 'error', text: response.message || '搜索失败' });
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setMessage({ type: 'error', text: '搜索异常，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 处理全选
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRecords(filteredRecords.map(record => record.recordId));
    } else {
      setSelectedRecords([]);
    }
  };

  // 处理单个选择
  const handleSelectRecord = (recordId, checked) => {
    if (checked) {
      setSelectedRecords([...selectedRecords, recordId]);
    } else {
      setSelectedRecords(selectedRecords.filter(id => id !== recordId));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRecords.length === 0) {
      setMessage({ type: 'warning', text: '请选择要删除的记录' });
      return;
    }

    setPendingDeleteAction({
      type: 'batch',
      recordIds: selectedRecords,
      count: selectedRecords.length
    });
    setShowAuthModal(true);
  };

  // 删除单个记录
  const handleDeleteRecord = async (recordId, productName) => {
    setPendingDeleteAction({
      type: 'single',
      recordId,
      productName
    });
    setShowAuthModal(true);
  };

  // 执行删除操作
  const executeDelete = async () => {
    if (!pendingDeleteAction) return;

    setLoading(true);
    try {
      if (pendingDeleteAction.type === 'single') {
        const response = await ApiService.deleteInventoryRecord(pendingDeleteAction.recordId);
        if (response.success) {
          setMessage({ type: 'success', text: '删除成功' });
          fetchRecords();
        } else {
          setMessage({ type: 'error', text: response.message || '删除失败' });
        }
      } else if (pendingDeleteAction.type === 'batch') {
        const response = await ApiService.deleteMultipleInventoryRecords(pendingDeleteAction.recordIds);
        if (response.success) {
          setMessage({ type: 'success', text: `成功删除${pendingDeleteAction.count}条记录` });
          setSelectedRecords([]);
          fetchRecords();
        } else {
          setMessage({ type: 'error', text: response.message || '批量删除失败' });
        }
      }
    } catch (error) {
      console.error('删除失败:', error);
      setMessage({ type: 'error', text: '删除异常，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 导出选中数据
  const exportSelectedData = () => {
    if (selectedRecords.length === 0) {
      setMessage({ type: 'warning', text: '请选择要导出的记录' });
      return;
    }

    const selectedData = records.filter(record => selectedRecords.includes(record.recordId));
    exportToCSV(selectedData, '选中盘点记录');
  };

  // 导出所有数据
  const exportAllData = () => {
    if (filteredRecords.length === 0) {
      setMessage({ type: 'warning', text: '没有数据可导出' });
      return;
    }

    exportToCSV(filteredRecords, '所有盘点记录');
  };

  // CSV导出功能
  const exportToCSV = (data, filename) => {
    const headers = ['商品ID', '商品名称', '盘点前数量', '实际数量', '操作类型', '操作数量', '盘点原因/备注', '盘点日期', '盘点时间'];
    const csvContent = [
      headers.join(','),
      ...data.map(record => {
        const fields = record.fields;
        return [
          fields.product_id || '',
          `"${fields.product_name || ''}"`,
          fields.before_quantity || fields.expected_quantity || 0,
          fields.actual_quantity || 0,
          `"${fields.operation || ''}"`,
          fields.operation_quantity || Math.abs(fields.difference || 0),
          `"${fields.inventory_reason || fields.reason || fields.note || ''}"`,
          fields.inventory_date || fields.record_date || '',
          fields.inventory_time || fields.record_time || ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: `成功导出${data.length}条记录` });
  };

  // 过滤记录
  const filteredRecords = records.filter(record => {
    const fields = record.fields;
    
    // 操作类型筛选
    if (filterOperation && fields.operation !== filterOperation) {
      return false;
    }
    
    // 日期范围筛选
    if (dateRange.start && fields.date < dateRange.start) {
      return false;
    }
    if (dateRange.end && fields.date > dateRange.end) {
      return false;
    }
    
    return true;
  });

  // 重置筛选
  const resetFilters = () => {
    setFilterOperation('');
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
    fetchRecords();
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="inventory-records-page">
      <div className="page-header">
        <h2>
          <i className="fas fa-clipboard-list me-2"></i>
          库存盘点记录
        </h2>
        <p className="text-muted">管理和查看所有库存盘点记录</p>
      </div>

      {/* 消息提示 */}
      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'danger' : message.type} alert-dismissible fade show`}>
          <i className={`fas fa-${
            message.type === 'success' ? 'check-circle' : 
            message.type === 'error' ? 'exclamation-circle' : 
            'exclamation-triangle'
          } me-2`}></i>
          {message.text}
        </div>
      )}

      {/* 搜索和筛选区域 */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            {/* 搜索框 */}
            <div className="col-md-4">
              <label className="form-label">搜索商品</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="输入商品ID或商品名称"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn btn-primary" onClick={handleSearch}>
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>

            {/* 操作类型筛选 */}
            <div className="col-md-2">
              <label className="form-label">操作类型</label>
              <select
                className="form-select"
                value={filterOperation}
                onChange={(e) => setFilterOperation(e.target.value)}
              >
                <option value="">全部</option>
                <option value="增加">增加</option>
                <option value="减少">减少</option>
                <option value="无变化">无变化</option>
              </select>
            </div>

            {/* 占位列 */}
            <div className="col-md-2">
              {/* 保持布局平衡 */}
            </div>

            {/* 日期范围 */}
            <div className="col-md-2">
              <label className="form-label">开始日期</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">结束日期</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-12">
              <button className="btn btn-secondary me-2" onClick={resetFilters}>
                <i className="fas fa-undo me-2"></i>
                重置筛选
              </button>
              <button className="btn btn-info me-2" onClick={fetchRecords}>
                <i className="fas fa-sync-alt me-2"></i>
                刷新数据
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮区域 */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="text-muted">
                共 {filteredRecords.length} 条记录
                {selectedRecords.length > 0 && (
                  <span className="ms-2 text-primary">
                    已选择 {selectedRecords.length} 条
                  </span>
                )}
              </span>
            </div>
            <div>
              <button 
                className="btn btn-success me-2" 
                onClick={exportSelectedData}
                disabled={selectedRecords.length === 0}
              >
                <i className="fas fa-download me-2"></i>
                导出选中
              </button>
              <button className="btn btn-info me-2" onClick={exportAllData}>
                <i className="fas fa-file-export me-2"></i>
                导出全部
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleBatchDelete}
                disabled={selectedRecords.length === 0}
              >
                <i className="fas fa-trash me-2"></i>
                批量删除
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 记录表格 */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">加载中...</span>
              </div>
              <p className="mt-2 text-muted">正在加载盘点记录...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th width="50">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>商品信息</th>
                    <th>调整前数量</th>
                    <th>操作</th>
                    <th>操作数量</th>
                    <th>原因</th>
                    <th>日期</th>
                    <th>时间</th>
                    <th width="120">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                        暂无盘点记录
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => {
                      const fields = record.fields;
                      const isSelected = selectedRecords.includes(record.recordId);
                      const difference = parseFloat(fields.actual_quantity || 0) - parseFloat(fields.expected_quantity || 0);
                      
                      return (
                        <tr key={record.recordId} className={isSelected ? 'table-active' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={(e) => handleSelectRecord(record.recordId, e.target.checked)}
                            />
                          </td>
                          <td>
                            <div>
                              <strong>{fields.product_name}</strong>
                              <br />
                              <small className="text-muted">ID: {fields.product_id || '未知'}</small>
                            </div>
                          </td>
                          <td>
                            {fields.expected_quantity || 0}
                          </td>
                          <td>
                            {fields.operation || '调整'}
                          </td>
                          <td>
                            {fields.operation_quantity || Math.abs(difference) || 0}
                          </td>
                          <td>
                            {fields.reason || '-'}
                          </td>
                          <td>
                            {fields.date || '-'}
                          </td>
                          <td>
                            {fields.time || '-'}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteRecord(record.recordId, fields.product_name)}
                              title="删除记录"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 身份验证模态框 */}
       <AuthModal
         isOpen={showAuthModal}
         onClose={() => {
           setShowAuthModal(false);
           setPendingDeleteAction(null);
         }}
         onConfirm={executeDelete}
         title="删除确认"
         message={pendingDeleteAction?.type === 'batch' 
           ? `确定要删除选中的${pendingDeleteAction.count}条盘点记录吗？此操作不可撤销。`
           : `确定要删除商品"${pendingDeleteAction?.productName}"的盘点记录吗？此操作不可撤销。`
         }
       />
    </div>
  );
}

export default InventoryRecords;