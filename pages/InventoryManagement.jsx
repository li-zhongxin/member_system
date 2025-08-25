import React, { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import productService from '../services/productService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/inventory-management.css';
import '../styles/global-enhancement.css';
import '../styles/search-box.css';

const InventoryManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [batchOperation, setBatchOperation] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('');
  const [filterKind, setFilterKind] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'increase', // increase or decrease
    quantity: '',
    reason: '' // 添加调整原因字段
  });
  const [filter, setFilter] = useState('all'); // all, in_stock, out_of_stock, on_shelf, off_shelf

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productService.getAllProducts();
      if (response.success) {
        setProducts(response.data.records || []);
      } else {
        setMessage({ type: 'error', text: response.error || '获取商品列表失败' });
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchProducts();
      return;
    }

    setLoading(true);
    try {
      const response = await productService.searchProducts(searchTerm);
      if (response.success) {
        setProducts(response.data.records || []);
      } else {
        setMessage({ type: 'error', text: response.error || '搜索失败' });
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setMessage({ type: 'error', text: '搜索异常，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustmentData({
      type: 'increase',
      quantity: '',
      reason: '' // 初始化调整原因字段
    });
    setShowAdjustModal(true);
  };

  const handleInventoryAdjustment = async () => {
    if (!adjustmentData.quantity || parseInt(adjustmentData.quantity) <= 0) {
      setMessage({ type: 'error', text: '请输入有效的调整数量' });
      return;
    }

    const currentQuantity = parseInt(selectedProduct.fields.remaining_quantity) || 0;
    const adjustQuantity = parseInt(adjustmentData.quantity);
    let newQuantity;
    let operation;

    if (adjustmentData.type === 'increase') {
      newQuantity = currentQuantity + adjustQuantity;
      operation = '增加';
    } else {
      newQuantity = Math.max(0, currentQuantity - adjustQuantity);
      operation = '减少';
    }

    try {
      // 1. 更新商品库存
      const response = await productService.updateInventory(
        selectedProduct.recordId,
        newQuantity
      );
      
      if (response.success) {
        // 2. 创建库存调整记录
        const inventoryRecord = {
          product_id: selectedProduct.fields.id || '',
          product_name: selectedProduct.fields.name || '',
          expected_quantity: currentQuantity,  // 盘点前/预期数量
          actual_quantity: newQuantity,        // 实际数量
          difference: adjustmentData.type === 'increase' ? adjustQuantity : -adjustQuantity,  // 差异数量
          operation: operation,                // 操作类型：增加/减少
          operation_quantity: adjustQuantity,  // 操作数量
          reason: adjustmentData.reason || '', // 原因字段
          inventory_reason: adjustmentData.reason || '', // 兼容新字段
          operator: 'admin',                  // 操作员
          note: ''                            // 备注
        };

        await ApiService.addInventoryRecord(inventoryRecord);
        
        setMessage({ 
          type: 'success', 
          text: `库存调整成功：${selectedProduct.fields.name} 库存从 ${currentQuantity} 调整为 ${newQuantity}` 
        });
        setShowAdjustModal(false);
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: response.error || '库存调整失败' });
      }
    } catch (error) {
      console.error('库存调整失败:', error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleStatusToggle = async (product) => {
    const newStatus = product.fields.status === '上架' ? '下架' : '上架';
    const action = newStatus === '上架' ? '上架' : '下架';
    
    if (!window.confirm(`确定要${action}商品"${product.fields.name}"吗？`)) {
      return;
    }

    try {
      const response = await productService.updateProductStatus(
        product.recordId,
        newStatus
      );
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `商品"${product.fields.name}"已成功${action}` 
        });
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: response.error || `${action}操作失败` });
      }
    } catch (error) {
      console.error(`${action}操作失败:`, error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const getFilteredProducts = () => {
    let filtered = products;
    
    // 按商品类型筛选
    if (filterKind !== 'all') {
      filtered = filtered.filter(p => p.fields.kind === filterKind);
    }
    
    // 按商品状态筛选
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.fields.status === filterStatus);
    }
    
    // 按库存状态筛选
    switch (filter) {
      case 'in_stock':
        filtered = filtered.filter(p => {
          const quantity = parseInt(p.fields.remaining_quantity) || 0;
          return p.fields.kind === '普通商品' && quantity > 0;
        });
        break;
      case 'out_of_stock':
        filtered = filtered.filter(p => {
          const quantity = parseInt(p.fields.remaining_quantity) || 0;
          return p.fields.kind === '普通商品' && quantity === 0;
        });
        break;
      default:
        // 不做额外筛选
        break;
    }
    
    return filtered;
  };

  const getStockStatus = (product) => {
    if (product.fields.kind === '服务项目') {
      return { status: 'service', text: '服务项目', class: 'bg-info' };
    }
    
    const quantity = parseInt(product.fields.remaining_quantity) || 0;
    if (quantity === 0) {
      return { status: 'out', text: '缺货', class: 'bg-danger' };
    } else if (quantity <= 10) {
      return { status: 'low', text: '库存不足', class: 'bg-warning' };
    } else {
      return { status: 'normal', text: '库存充足', class: 'bg-success' };
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.recordId));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectProduct = (recordId) => {
    if (selectedProducts.includes(recordId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== recordId));
    } else {
      setSelectedProducts([...selectedProducts, recordId]);
    }
  };

  const handleBatchOperation = async () => {
    if (selectedProducts.length === 0) {
      setMessage({ type: 'error', text: '请先选择要操作的商品' });
      return;
    }

    if (!batchOperation) {
      setMessage({ type: 'error', text: '请选择批量操作类型' });
      return;
    }

    const confirmMessage = `确定要对选中的 ${selectedProducts.length} 个商品执行${batchOperation}操作吗？`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      for (const recordId of selectedProducts) {
        const product = products.find(p => p.recordId === recordId);
        if (!product) continue;

        if (batchOperation === '上架' || batchOperation === '下架') {
          await productService.updateProductStatus(recordId, batchOperation);
        }
      }

      setMessage({ 
        type: 'success', 
        text: `批量${batchOperation}操作完成，共处理 ${selectedProducts.length} 个商品` 
      });
      setSelectedProducts([]);
      setSelectAll(false);
      setBatchOperation('');
      fetchProducts();
    } catch (error) {
      console.error('批量操作失败:', error);
      setMessage({ type: 'error', text: '批量操作失败，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const exportInventoryReport = () => {
    if (products.length === 0) {
      setMessage({ type: 'error', text: '没有数据可导出' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const csvContent = [
      ['商品名称', '商品ID', '种类', '剩余数量', '单位', '库存状态', '商品状态', '单价', '库存价值'].join(','),
      ...products.map(product => {
        const stockStatus = getStockStatus(product);
        const quantity = parseInt(product.fields.remaining_quantity) || 0;
        const price = parseFloat(product.fields.price) || 0;
        const value = quantity * price;
        
        return [
          product.fields.name || '',
          product.fields.id || '',
          product.fields.kind || '',
          product.fields.remaining_quantity || '0',
          product.fields.unit || '',
          stockStatus.text,
          product.fields.status || '',
          product.fields.price || '0',
          value.toFixed(2)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `库存盘点报告_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: '库存报告导出成功' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div className="inventory-management-container">
      <div className="page-header inventory-management">
        <h1 className="page-title">库存盘点</h1>
        <p className="page-subtitle">查看和管理商品库存信息</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} alert-dismissible`}>
          {message.text}
        </div>
      )}

      <div className="search-container">
        <div className="search-wrapper">
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="搜索商品名称、ID或类型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="search-button" onClick={handleSearch}>
            <i className="fas fa-search"></i>
            搜索
          </button>
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <i className="fas fa-times"></i>
              清空
            </button>
          )}
        </div>
        {filteredProducts.length > 0 && searchTerm && (
          <div className="search-stats">
            找到 {filteredProducts.length} 个商品
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="filter-section">
          <select 
            className="form-select me-2"
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
          >
            <option value="all">全部类型</option>
            <option value="普通商品">普通商品</option>
            <option value="服务项目">服务项目</option>
          </select>
          <select 
            className="form-select me-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="上架">已上架</option>
            <option value="下架">已下架</option>
          </select>
          <select 
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">库存状态</option>
            <option value="in_stock">有库存</option>
            <option value="out_of_stock">缺货</option>
          </select>
        </div>
        <div className="action-buttons">
          {selectedProducts.length > 0 && (
            <div className="batch-operations me-3">
              <select 
                className="form-select me-2" 
                value={batchOperation}
                onChange={(e) => setBatchOperation(e.target.value)}
                style={{width: 'auto', display: 'inline-block'}}
              >
                <option value="">选择批量操作</option>
                <option value="上架">批量上架</option>
                <option value="下架">批量下架</option>
              </select>
              <button 
                className="btn btn-warning me-2" 
                onClick={handleBatchOperation}
                disabled={!batchOperation}
              >
                <i className="fas fa-tasks me-2"></i>
                执行操作 ({selectedProducts.length})
              </button>
            </div>
          )}
          <button className="btn btn-info" onClick={exportInventoryReport}>
            <i className="fas fa-file-export me-2"></i>
            导出报告
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-icon bg-primary">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="stat-content">
            <h3>{products.length}</h3>
            <p>商品总数</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-success">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{products.filter(p => p.fields.status === '上架').length}</h3>
            <p>已上架</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-warning">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-content">
            <h3>{products.filter(p => {
              const quantity = parseInt(p.fields.remaining_quantity) || 0;
              return p.fields.kind === '普通商品' && quantity <= 10 && quantity > 0;
            }).length}</h3>
            <p>库存不足</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-danger">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{products.filter(p => {
              const quantity = parseInt(p.fields.remaining_quantity) || 0;
              return p.fields.kind === '普通商品' && quantity === 0;
            }).length}</h3>
            <p>缺货</p>
          </div>
        </div>
      </div>

      <div className="inventory-table-container">
        {loading ? (
          <LoadingSpinner text="正在加载库存数据..." size="large" />
        ) : (
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="form-check-input"
                  />
                </th>
                <th>商品信息</th>
                <th>种类</th>
                <th>库存数量</th>
                <th>库存状态</th>
                <th>商品状态</th>
                <th>单价</th>
                <th>库存价值</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const quantity = parseInt(product.fields.remaining_quantity) || 0;
                  const price = parseFloat(product.fields.price) || 0;
                  const value = quantity * price;
                  
                  return (
                    <tr key={product.recordId} className={selectedProducts.includes(product.recordId) ? 'table-active' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.recordId)}
                          onChange={() => handleSelectProduct(product.recordId)}
                          className="form-check-input"
                        />
                      </td>
                      <td>
                        <div className="product-info">
                          <strong>{product.fields.name}</strong>
                          <br />
                          <small className="text-muted">ID: {product.fields.id}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${product.fields.kind === '普通商品' ? 'bg-primary' : 'bg-success'}`}>
                          {product.fields.kind}
                        </span>
                      </td>
                      <td>
                        {product.fields.kind === '普通商品' ? (
                          <span className="quantity-display">
                            {quantity} {product.fields.unit}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${stockStatus.class}`}>
                          {stockStatus.text}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${product.fields.status === '上架' ? 'bg-success' : 'bg-secondary'}`}>
                          {product.fields.status}
                        </span>
                      </td>
                      <td>¥{price.toFixed(2)}</td>
                      <td>
                        {product.fields.kind === '普通商品' ? (
                          <span className="value-display">¥{value.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          {product.fields.kind === '普通商品' && (
                            <button 
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => openAdjustModal(product)}
                              title="调整库存"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                          )}
                          <button 
                            className={`btn btn-sm ${product.fields.status === '上架' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            onClick={() => handleStatusToggle(product)}
                            title={product.fields.status === '上架' ? '下架商品' : '上架商品'}
                          >
                            <i className={`fas ${product.fields.status === '上架' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-4">
                    <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                    <p className="text-muted">暂无符合条件的商品</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 库存调整模态框 */}
      {showAdjustModal && selectedProduct && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">库存调整 - {selectedProduct.fields.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAdjustModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="current-stock-info">
                  <div className="info-item">
                    <label>当前库存：</label>
                    <span className="current-quantity">
                      {selectedProduct.fields.remaining_quantity || 0} {selectedProduct.fields.unit}
                    </span>
                  </div>
                </div>
                
                <div className="adjustment-form">
                  <div className="mb-3">
                    <label className="form-label">调整类型 *</label>
                    <div className="btn-group w-100" role="group">
                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="adjustmentType" 
                        id="increase" 
                        value="increase"
                        checked={adjustmentData.type === 'increase'}
                        onChange={(e) => setAdjustmentData(prev => ({ ...prev, type: e.target.value }))}
                      />
                      <label className="btn btn-outline-success" htmlFor="increase">
                        <i className="fas fa-plus me-2"></i>增加库存
                      </label>
                      
                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="adjustmentType" 
                        id="decrease" 
                        value="decrease"
                        checked={adjustmentData.type === 'decrease'}
                        onChange={(e) => setAdjustmentData(prev => ({ ...prev, type: e.target.value }))}
                      />
                      <label className="btn btn-outline-danger" htmlFor="decrease">
                        <i className="fas fa-minus me-2"></i>减少库存
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">调整数量 *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={adjustmentData.quantity}
                      onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="请输入调整数量"
                      min="1"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">调整原因（选填）</label>
                    <input
                      type="text"
                      className="form-control"
                      value={adjustmentData.reason}
                      onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="请输入调整原因"
                    />
                  </div>
                  
                  
                  {adjustmentData.quantity && (
                    <div className="preview-result">
                      <div className="alert alert-info">
                        <strong>调整预览：</strong>
                        <br />
                        当前库存：{selectedProduct.fields.remaining_quantity || 0} {selectedProduct.fields.unit}
                        <br />
                        调整后库存：
                        {adjustmentData.type === 'increase' 
                          ? (parseInt(selectedProduct.fields.remaining_quantity) || 0) + parseInt(adjustmentData.quantity || 0)
                          : Math.max(0, (parseInt(selectedProduct.fields.remaining_quantity) || 0) - parseInt(adjustmentData.quantity || 0))
                        } {selectedProduct.fields.unit}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
                  取消
                </button>
                <button type="button" className="btn btn-primary" onClick={handleInventoryAdjustment}>
                  确认调整
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;