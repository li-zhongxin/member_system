import React, { useState, useEffect } from 'react';
import productService from '../services/productService';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthModal from '../components/AuthModal';
import ApiService from '../services/apiService';
import '../styles/product-management.css';
import '../styles/search-box.css';
import '../styles/global-enhancement.css';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKind, setFilterKind] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryData, setInventoryData] = useState({
    product_id: '',
    product_name: '',
    actual_quantity: '',
    expected_quantity: '',
    difference: 0,
    reason: '',
    operator: '',
    note: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    kind: '普通商品',
    remaining_quantity: '',
    unit: '',
    specifications: '',
    price: '',
    status: '上架',
    note: ''
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState(null);

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '商品名称不能为空' });
      return false;
    }
    if (!formData.specifications.trim()) {
      setMessage({ type: 'error', text: '商品规格不能为空' });
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setMessage({ type: 'error', text: '请输入有效的商品单价' });
      return false;
    }
    if (formData.kind === '普通商品') {
      if (!formData.remaining_quantity || parseInt(formData.remaining_quantity) < 0) {
        setMessage({ type: 'error', text: '普通商品必须填写有效的剩余数量' });
        return false;
      }
      if (!formData.unit.trim()) {
        setMessage({ type: 'error', text: '普通商品必须填写单位' });
        return false;
      }
    }
    return true;
  };

  const handleAddProduct = async () => {
    if (!validateForm()) return;

    try {
      const response = await productService.createProduct(formData);
      if (response.success) {
        setMessage({ type: 'success', text: '商品添加成功' });
        setShowAddModal(false);
        resetForm();
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: response.error || '添加商品失败' });
      }
    } catch (error) {
      console.error('添加商品失败:', error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleEditProduct = async () => {
    if (!validateForm()) return;

    try {
      const response = await productService.updateProduct(selectedProduct.recordId, formData);
      if (response.success) {
        setMessage({ type: 'success', text: '商品更新成功' });
        setShowEditModal(false);
        resetForm();
        fetchProducts();
      } else {
        setMessage({ type: 'error', text: response.error || '更新商品失败' });
      }
    } catch (error) {
      console.error('更新商品失败:', error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleDeleteProduct = async (product) => {
    setPendingDeleteAction({
      type: 'single',
      recordId: product.recordId,
      productName: product.fields.name
    });
    setShowAuthModal(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.fields.name || '',
      kind: product.fields.kind || '普通商品',
      remaining_quantity: product.fields.remaining_quantity || '',
      unit: product.fields.unit || '',
      specifications: product.fields.specifications || '',
      price: product.fields.price || '',
      status: product.fields.status || '上架',
      note: product.fields.note || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      kind: '普通商品',
      remaining_quantity: '',
      unit: '',
      specifications: '',
      price: '',
      status: '上架',
      note: ''
    });
    setSelectedProduct(null);
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      const filteredProductIds = products
        .filter(product => {
          const matchesKind = filterKind === 'all' || product.fields.kind === filterKind;
          const matchesStatus = filterStatus === 'all' || product.fields.status === filterStatus;
          return matchesKind && matchesStatus;
        })
        .map(product => product.recordId);
      setSelectedProducts(filteredProductIds);
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (recordId) => {
    setSelectedProducts(prev => {
      if (prev.includes(recordId)) {
        const newSelected = prev.filter(id => id !== recordId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, recordId];
        const filteredProductIds = products
          .filter(product => {
            const matchesKind = filterKind === 'all' || product.fields.kind === filterKind;
            const matchesStatus = filterStatus === 'all' || product.fields.status === filterStatus;
            return matchesKind && matchesStatus;
          })
          .map(product => product.recordId);
        setSelectAll(newSelected.length === filteredProductIds.length);
        return newSelected;
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedProducts.length === 0) {
      setMessage({ type: 'error', text: '请先选择要删除的商品' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setPendingDeleteAction({
      type: 'batch',
      recordIds: selectedProducts,
      count: selectedProducts.length
    });
    setShowAuthModal(true);
  };

  // 执行删除操作
  const executeDelete = async () => {
    if (!pendingDeleteAction) return;

    try {
      if (pendingDeleteAction.type === 'single') {
        const response = await productService.deleteProduct(pendingDeleteAction.recordId);
        if (response.success) {
          setMessage({ type: 'success', text: '商品删除成功' });
          fetchProducts();
        } else {
          setMessage({ type: 'error', text: response.error || '删除商品失败' });
        }
      } else if (pendingDeleteAction.type === 'batch') {
        const deletePromises = pendingDeleteAction.recordIds.map(recordId => 
          productService.deleteProduct(recordId)
        );
        const results = await Promise.all(deletePromises);
        
        const successCount = results.filter(result => result.success).length;
        const failCount = results.length - successCount;
        
        if (failCount === 0) {
          setMessage({ type: 'success', text: `成功删除 ${successCount} 个商品` });
        } else {
          setMessage({ type: 'error', text: `删除完成：成功 ${successCount} 个，失败 ${failCount} 个` });
        }
        
        setSelectedProducts([]);
        setSelectAll(false);
        fetchProducts();
      }
    } catch (error) {
      console.error('删除失败:', error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const exportSelectedData = () => {
    if (selectedProducts.length === 0) {
      setMessage({ type: 'error', text: '请先选择要导出的商品' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const selectedProductsData = products.filter(product => 
      selectedProducts.includes(product.recordId)
    );

    const csvContent = [
      ['商品名称', '商品ID', '种类', '剩余数量', '单位', '规格', '单价', '状态', '备注'].join(','),
      ...selectedProductsData.map(product => [
        product.fields.name || '',
        product.fields.id || '',
        product.fields.kind || '',
        product.fields.remaining_quantity || '',
        product.fields.unit || '',
        product.fields.specifications || '',
        product.fields.price || '',
        product.fields.status || '',
        product.fields.note || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `选中商品数据_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: `成功导出 ${selectedProducts.length} 个商品数据` });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const exportData = () => {
    if (products.length === 0) {
      setMessage({ type: 'error', text: '没有数据可导出' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const csvContent = [
      ['商品名称', '商品ID', '种类', '剩余数量', '单位', '规格', '单价', '状态', '备注'].join(','),
      ...products.map(product => [
        product.fields.name || '',
        product.fields.id || '',
        product.fields.kind || '',
        product.fields.remaining_quantity || '',
        product.fields.unit || '',
        product.fields.specifications || '',
        product.fields.price || '',
        product.fields.status || '',
        product.fields.note || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `商品数据_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: '数据导出成功' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // 库存盘点相关函数
  const openInventoryModal = (product) => {
    setInventoryData({
      product_id: product.fields.id || '',
      product_name: product.fields.name || '',
      actual_quantity: '',
      expected_quantity: product.fields.remaining_quantity || 0,
      difference: 0,
      reason: '',
      operator: '',
      note: ''
    });
    setShowInventoryModal(true);
  };

  const handleInventoryInputChange = (field, value) => {
    setInventoryData(prev => {
      const newData = { ...prev, [field]: value };
      
      // 自动计算差异
      if (field === 'actual_quantity' || field === 'expected_quantity') {
        const actual = parseFloat(newData.actual_quantity) || 0;
        const expected = parseFloat(newData.expected_quantity) || 0;
        newData.difference = actual - expected;
      }
      
      return newData;
    });
  };

  const validateInventoryForm = () => {
    if (!inventoryData.product_id.trim()) {
      setMessage({ type: 'error', text: '商品ID不能为空' });
      return false;
    }
    if (!inventoryData.product_name.trim()) {
      setMessage({ type: 'error', text: '商品名称不能为空' });
      return false;
    }
    if (inventoryData.actual_quantity === '' || isNaN(parseFloat(inventoryData.actual_quantity))) {
      setMessage({ type: 'error', text: '请输入有效的实际数量' });
      return false;
    }
    if (!inventoryData.operator.trim()) {
      setMessage({ type: 'error', text: '操作员不能为空' });
      return false;
    }
    return true;
  };

  const handleInventorySubmit = async () => {
    if (!validateInventoryForm()) return;

    try {
      // 确定操作类型和操作数量
      const difference = inventoryData.difference;
      let operation, operation_quantity;
      
      if (difference > 0) {
        operation = 'increase';
        operation_quantity = Math.abs(difference);
      } else if (difference < 0) {
        operation = 'decrease';
        operation_quantity = Math.abs(difference);
      } else {
        operation = 'no_change';
        operation_quantity = 0;
      }

      const inventoryRecord = {
        product_name: inventoryData.product_name,
        product_id: inventoryData.product_id,
        before_quantity: parseFloat(inventoryData.expected_quantity),
        actual_quantity: parseFloat(inventoryData.actual_quantity),
        operation: operation,
        operation_quantity: operation_quantity,
        inventory_reason: inventoryData.reason || inventoryData.note || '',
        inventory_date: new Date().toISOString().split('T')[0],
        inventory_time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        operator: inventoryData.operator
      };

      const response = await ApiService.addInventoryRecord(inventoryRecord);
      if (response.success) {
        setMessage({ type: 'success', text: '库存盘点记录添加成功' });
        setShowInventoryModal(false);
        resetInventoryForm();
        
        // 如果有差异，更新商品库存
        if (inventoryData.difference !== 0) {
          const updatedProduct = {
            remaining_quantity: parseFloat(inventoryData.actual_quantity)
          };
          
          const product = products.find(p => p.fields.id === inventoryData.product_id);
          if (product) {
            await productService.updateProduct(product.recordId, updatedProduct);
            fetchProducts(); // 重新获取商品列表
          }
        }
      } else {
        setMessage({ type: 'error', text: response.error || '添加盘点记录失败' });
      }
    } catch (error) {
      console.error('添加盘点记录失败:', error);
      setMessage({ type: 'error', text: '网络异常，请稍后重试' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const resetInventoryForm = () => {
    setInventoryData({
      product_id: '',
      product_name: '',
      actual_quantity: '',
      expected_quantity: '',
      difference: 0,
      reason: '',
      operator: '',
      note: ''
    });
  };

  return (
    <div className="product-management-container">
      <div className="page-header product-management">
        <h1 className="page-title">商品信息</h1>
        <p className="page-subtitle">管理商品信息，支持新增、编辑、删除和搜索</p>
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
              placeholder="搜索商品名称、ID或规格..."
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
        {products.length > 0 && searchTerm && (
          <div className="search-stats">
            找到 {products.length} 个商品
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="filter-section">
          <select
            className="form-select"
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
          >
            <option value="all">所有种类</option>
            <option value="普通商品">普通商品</option>
            <option value="服务项目">服务项目</option>
          </select>
        </div>
        <div className="filter-section">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">所有状态</option>
            <option value="上架">上架</option>
            <option value="下架">下架</option>
          </select>
        </div>
        <div className="action-buttons">
          <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
            <i className="fas fa-plus me-2"></i>
            新增商品
          </button>
          <button className="btn btn-info" onClick={exportData}>
            <i className="fas fa-download me-2"></i>
            导出全部
          </button>
          <button className="btn btn-primary" onClick={() => setShowInventoryModal(true)}>
            <i className="fas fa-clipboard-list me-2"></i>
            库存盘点
          </button>
          {selectedProducts.length > 0 && (
            <>
              <button className="btn btn-warning" onClick={exportSelectedData}>
                <i className="fas fa-download me-2"></i>
                导出选中 ({selectedProducts.length})
              </button>
              <button className="btn btn-danger" onClick={handleBatchDelete}>
                <i className="fas fa-trash me-2"></i>
                批量删除 ({selectedProducts.length})
              </button>
            </>
          )}
        </div>
      </div>

      <div className="products-table-container">
        {loading ? (
          <LoadingSpinner text="正在加载商品数据..." size="large" />
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
                <th>商品名称</th>
                <th>商品ID</th>
                <th>种类</th>
                <th>剩余数量</th>
                <th>单位</th>
                <th>规格</th>
                <th>单价</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products
                  .filter(product => {
                    const matchesKind = filterKind === 'all' || product.fields.kind === filterKind;
                    const matchesStatus = filterStatus === 'all' || product.fields.status === filterStatus;
                    return matchesKind && matchesStatus;
                  })
                  .map((product) => (
                  <tr key={product.recordId} className={selectedProducts.includes(product.recordId) ? 'table-active' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.recordId)}
                        onChange={() => handleSelectProduct(product.recordId)}
                        className="form-check-input"
                      />
                    </td>
                    <td>{product.fields.name}</td>
                    <td><code>{product.fields.id}</code></td>
                    <td>
                      <span className={`badge ${product.fields.kind === '普通商品' ? 'bg-primary' : 'bg-success'}`}>
                        {product.fields.kind}
                      </span>
                    </td>
                    <td>{product.fields.remaining_quantity || '-'}</td>
                    <td>{product.fields.unit || '-'}</td>
                    <td>{product.fields.specifications}</td>
                    <td>¥{product.fields.price}</td>
                    <td>
                      <span className={`badge ${product.fields.status === '上架' ? 'bg-success' : 'bg-secondary'}`}>
                        {product.fields.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => openEditModal(product)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      {product.fields.kind === '普通商品' && (
                        <button 
                          className="btn btn-sm btn-outline-info me-2"
                          onClick={() => openInventoryModal(product)}
                          title="库存盘点"
                        >
                          <i className="fas fa-clipboard-list"></i>
                        </button>
                      )}
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteProduct(product)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center py-4">
                    <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <p className="text-muted">暂无商品数据</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 新增商品模态框 */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">新增商品</h5>
                <button type="button" className="btn-close" onClick={() => { setShowAddModal(false); resetForm(); }}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">商品名称 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="请输入商品名称"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">种类 *</label>
                      <select
                        className="form-select"
                        value={formData.kind}
                        onChange={(e) => handleInputChange('kind', e.target.value)}
                      >
                        <option value="普通商品">普通商品</option>
                        <option value="服务项目">服务项目</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        剩余数量 {formData.kind === '普通商品' ? '*' : ''}
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.remaining_quantity}
                        onChange={(e) => handleInputChange('remaining_quantity', e.target.value)}
                        placeholder="请输入剩余数量"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        单位 {formData.kind === '普通商品' ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.unit}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        placeholder="如：个、件、盒等"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">规格 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.specifications}
                        onChange={(e) => handleInputChange('specifications', e.target.value)}
                        placeholder="请输入商品规格"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">单价 *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="请输入单价"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">状态 *</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                      >
                        <option value="上架">上架</option>
                        <option value="下架">下架</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">备注</label>
                      <textarea
                        className="form-control"
                        value={formData.note}
                        onChange={(e) => handleInputChange('note', e.target.value)}
                        placeholder="请输入备注信息"
                        rows="3"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>
                  取消
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddProduct}>
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑商品模态框 */}
      {showEditModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">编辑商品</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); resetForm(); }}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">商品名称 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="请输入商品名称"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">商品ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedProduct?.fields.id || ''}
                        disabled
                        placeholder="系统自动生成"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">种类 *</label>
                      <select
                        className="form-select"
                        value={formData.kind}
                        onChange={(e) => handleInputChange('kind', e.target.value)}
                      >
                        <option value="普通商品">普通商品</option>
                        <option value="服务项目">服务项目</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        剩余数量 {formData.kind === '普通商品' ? '*' : ''}
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.remaining_quantity}
                        onChange={(e) => handleInputChange('remaining_quantity', e.target.value)}
                        placeholder="请输入剩余数量"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        单位 {formData.kind === '普通商品' ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.unit}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        placeholder="如：个、件、盒等"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">规格 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.specifications}
                        onChange={(e) => handleInputChange('specifications', e.target.value)}
                        placeholder="请输入商品规格"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">单价 *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="请输入单价"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">状态 *</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                      >
                        <option value="上架">上架</option>
                        <option value="下架">下架</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">备注</label>
                      <textarea
                        className="form-control"
                        value={formData.note}
                        onChange={(e) => handleInputChange('note', e.target.value)}
                        placeholder="请输入备注信息"
                        rows="3"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); resetForm(); }}>
                  取消
                </button>
                <button type="button" className="btn btn-primary" onClick={handleEditProduct}>
                  确认更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 库存盘点模态框 */}
      {showInventoryModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-clipboard-list me-2"></i>
                  库存盘点
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowInventoryModal(false); resetInventoryForm(); }}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">商品ID *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={inventoryData.product_id}
                        onChange={(e) => handleInventoryInputChange('product_id', e.target.value)}
                        placeholder="请输入或选择商品ID"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">商品名称 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={inventoryData.product_name}
                        onChange={(e) => handleInventoryInputChange('product_name', e.target.value)}
                        placeholder="请输入商品名称"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">预期数量</label>
                      <input
                        type="number"
                        className="form-control"
                        value={inventoryData.expected_quantity}
                        onChange={(e) => handleInventoryInputChange('expected_quantity', e.target.value)}
                        placeholder="系统库存数量"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">实际数量 *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={inventoryData.actual_quantity}
                        onChange={(e) => handleInventoryInputChange('actual_quantity', e.target.value)}
                        placeholder="请输入实际盘点数量"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">差异数量</label>
                      <input
                        type="number"
                        className="form-control"
                        value={inventoryData.difference}
                        readOnly
                        style={{
                          backgroundColor: inventoryData.difference > 0 ? '#d4edda' : 
                                         inventoryData.difference < 0 ? '#f8d7da' : '#f8f9fa',
                          color: inventoryData.difference > 0 ? '#155724' : 
                                inventoryData.difference < 0 ? '#721c24' : '#495057'
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">操作员 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={inventoryData.operator}
                        onChange={(e) => handleInventoryInputChange('operator', e.target.value)}
                        placeholder="请输入操作员姓名"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">差异原因</label>
                      <select
                        className="form-select"
                        value={inventoryData.reason}
                        onChange={(e) => handleInventoryInputChange('reason', e.target.value)}
                      >
                        <option value="">请选择差异原因</option>
                        <option value="正常损耗">正常损耗</option>
                        <option value="盘点错误">盘点错误</option>
                        <option value="系统错误">系统错误</option>
                        <option value="商品丢失">商品丢失</option>
                        <option value="商品损坏">商品损坏</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">备注</label>
                      <textarea
                        className="form-control"
                        value={inventoryData.note}
                        onChange={(e) => handleInventoryInputChange('note', e.target.value)}
                        placeholder="请输入备注信息"
                        rows="3"
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                {/* 盘点结果预览 */}
                {inventoryData.actual_quantity && (
                  <div className="alert alert-info mt-3">
                    <h6><i className="fas fa-info-circle me-2"></i>盘点结果预览</h6>
                    <div className="row">
                      <div className="col-md-4">
                        <strong>预期数量：</strong>{inventoryData.expected_quantity}
                      </div>
                      <div className="col-md-4">
                        <strong>实际数量：</strong>{inventoryData.actual_quantity}
                      </div>
                      <div className="col-md-4">
                        <strong>差异：</strong>
                        <span className={inventoryData.difference > 0 ? 'text-success' : 
                                       inventoryData.difference < 0 ? 'text-danger' : 'text-muted'}>
                          {inventoryData.difference > 0 ? '+' : ''}{inventoryData.difference}
                        </span>
                      </div>
                    </div>
                    {inventoryData.difference !== 0 && (
                      <div className="mt-2">
                        <small className="text-warning">
                          <i className="fas fa-exclamation-triangle me-1"></i>
                          提交后将自动更新商品库存数量
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowInventoryModal(false); resetInventoryForm(); }}>
                  取消
                </button>
                <button type="button" className="btn btn-primary" onClick={handleInventorySubmit}>
                  <i className="fas fa-save me-2"></i>
                  提交盘点
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
          ? `确定要删除商品「${pendingDeleteAction?.productName}」吗？此操作不可恢复，需要管理员权限。`
          : `确定要删除选中的 ${pendingDeleteAction?.count} 个商品吗？此操作不可恢复，需要管理员权限。`
        }
      />
    </div>
  );
};

export default ProductManagement;