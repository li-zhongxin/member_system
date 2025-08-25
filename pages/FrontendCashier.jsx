import React, { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import productService from '../services/productService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/frontend-cashier.css';

function FrontendCashier() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 商品相关状态
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('全部');

  // 加载商品列表
  useEffect(() => {
    loadProducts();
  }, []);

  // 商品搜索过滤
  useEffect(() => {
    // 确保products是数组
    if (!Array.isArray(products)) {
      setFilteredProducts([]);
      return;
    }
    
    let filtered = products;
    
    // 按分类过滤
    if (activeCategory !== '全部') {
      filtered = filtered.filter(product => 
        product.fields.kind === activeCategory
      );
    }
    
    // 按搜索词过滤
    if (productSearchTerm.trim()) {
      filtered = filtered.filter(product => 
        product.fields.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.fields.kind?.toLowerCase().includes(productSearchTerm.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  }, [products, activeCategory, productSearchTerm]);
  
  // 从商品列表中提取所有可用的分类
  const getAvailableCategories = () => {
    if (!Array.isArray(products) || products.length === 0) {
      return ['全部', '服务', '普通'];
    }
    
    // 提取所有不重复的分类
    const uniqueCategories = new Set();
    products.forEach(product => {
      if (product.fields.kind) {
        uniqueCategories.add(product.fields.kind);
      }
    });
    
    // 转换为数组并添加"全部"选项
    return ['全部', ...Array.from(uniqueCategories)];
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await productService.getAllProducts();
      if (response.success && response.data && Array.isArray(response.data.records)) {
        setProducts(response.data.records);
        setFilteredProducts(response.data.records);
      } else {
        console.error('商品数据格式错误:', response);
        setProducts([]);
        setFilteredProducts([]);
        showMessage('加载商品失败', 'error');
      }
    } catch (error) {
      console.error('加载商品时出错:', error);
      setProducts([]);
      setFilteredProducts([]);
      showMessage('加载商品时出错', 'error');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showMessage('请输入搜索内容', 'error');
      return;
    }

    setIsSearching(true);
    try {
      const response = await ApiService.getAllMembers();
      if (response.success && Array.isArray(response.data.records)) {
        // 在前端过滤搜索结果
        const filtered = response.data.records.filter(member => 
          member.fields.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.fields.phonenumber?.includes(searchTerm)
        );
        setSearchResults(filtered);
        if (filtered.length === 0) {
          showMessage('未找到相关会员', 'error');
        }
      } else {
        showMessage('搜索失败', 'error');
      }
    } catch (error) {
      console.error('搜索时出错:', error);
      showMessage('搜索时出错', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setSearchResults([]);
    setSearchTerm('');
  };

  const addProduct = (product) => {
    const existingProduct = selectedProducts.find(p => p.recordId === product.recordId);
    if (existingProduct) {
      setSelectedProducts(selectedProducts.map(p => 
        p.recordId === product.recordId 
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.recordId !== productId));
  };

  const updateProductQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(selectedProducts.map(p => 
      p.recordId === productId 
        ? { ...p, quantity }
        : p
    ));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, product) => {
      const price = parseFloat(product.fields.member_price || product.fields.price || 0);
      return total + (price * product.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (!selectedMember) {
      showMessage('请先选择会员', 'error');
      return;
    }

    if (selectedProducts.length === 0) {
      showMessage('请先选择商品', 'error');
      return;
    }

    const total = calculateTotal();
    const currentBalance = parseFloat(selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0);

    if (currentBalance < total) {
      showMessage('会员余额不足，请先充值', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // 扣除余额
      const newBalance = currentBalance - total;
      const updateResponse = await ApiService.updateMember(selectedMember.recordId, {
        'Remaining sum': newBalance
      });

      if (updateResponse.success) {
        // 获取当前日期和时间
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // 格式：YYYY-MM-DD
        const time = now.toTimeString().split(' ')[0]; // 格式：HH:MM:SS
        
        // 构建商品详情字符串
        const product_details = selectedProducts.map(p => `${p.fields.name} x${p.quantity}`).join(', ');
        
        // 记录消费
        const consumeResponse = await ApiService.createConsumptionRecord({
          member_name: selectedMember.fields.member_name,
          phonenumber: selectedMember.fields.phonenumber,
          date: date,
          time: time,
          record: `消费${total.toFixed(2)}元`,
          amount: total,
          balance_before: currentBalance,
          balance_after: newBalance,
          product_details: product_details
        });

        if (consumeResponse.success) {
          showMessage(`结账成功！消费金额：${total.toFixed(2)}元，余额：${newBalance.toFixed(2)}元`, 'success');
          // 更新选中会员的余额
          setSelectedMember({
            ...selectedMember,
            fields: {
              ...selectedMember.fields,
              'Remaining sum': newBalance
            }
          });
          // 清空购物车
          setSelectedProducts([]);
        } else {
          showMessage('记录消费失败', 'error');
        }
      } else {
        showMessage('更新余额失败', 'error');
      }
    } catch (error) {
      console.error('结账时出错:', error);
      showMessage('结账时出错', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const clearCart = () => {
    setSelectedProducts([]);
  };

  const clearMember = () => {
    setSelectedMember(null);
    setSearchResults([]);
    setSearchTerm('');
  };

  const categories = getAvailableCategories();

  return (
    <div className="frontend-cashier">
      <div className="cashier-header">
        <h1>会员管理系统</h1>
      </div>
      
      {/* 外部搜索框 */}
      <div className="outer-search-container">
        <div className="member-search-outer">
          <input
            type="text"
            placeholder="请输入会员姓名或手机号"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
        <div className="product-search-outer">
          <input
            type="text"
            placeholder="搜索商品..."
            value={productSearchTerm}
            onChange={(e) => setProductSearchTerm(e.target.value)}
          />
          <i className="fas fa-search search-icon"></i>
        </div>
      </div>

      <div className="cashier-container">
        {/* 左侧会员和购物车区域 */}
        <div className="checkout-container">
          {/* 会员信息 */}
          <div className="member-section">
            <h3><i className="fas fa-user"></i> 会员信息</h3>

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(member => (
                  <div key={member.recordId} className="search-result-item" onClick={() => selectMember(member)}>
                    <div className="member-info">
                      <span className="member-name">{member.fields.member_name}</span>
                      <span className="member-phone">{member.fields.phonenumber}</span>
                    </div>
                    <span className="member-balance">¥{parseFloat(member.fields['Remaining sum'] || member.fields.Remaining_sum || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 选中的会员信息 */}
            {selectedMember && (
              <div className="selected-member">
                <div className="member-header">
                  <h4>{selectedMember.fields.member_name}</h4>
                  <button onClick={clearMember} className="clear-btn">×</button>
                </div>
                <div className="member-details">
                  <p><i className="fas fa-phone"></i> {selectedMember.fields.phonenumber}</p>
                  <p><i className="fas fa-wallet"></i> 余额: ¥{parseFloat(selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          {/* 购物车 */}
          <div className="cart-section">
            <h3><i className="fas fa-shopping-cart"></i> 购物车</h3>
            {selectedProducts.length === 0 ? (
              <div className="empty-cart">
                <i className="fas fa-shopping-cart"></i>
                <p>购物车为空</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {selectedProducts.map(product => (
                    <div key={product.recordId} className="cart-item">
                      <div className="item-info">
                        <span className="item-name">{product.fields.name}</span>
                        <span className="item-price">¥{parseFloat(product.fields.member_price || product.fields.price || 0).toFixed(2)}</span>
                      </div>
                      <div className="item-actions">
                        <div className="quantity-control">
                          <button onClick={() => updateProductQuantity(product.recordId, product.quantity - 1)}>-</button>
                          <span>{product.quantity}</span>
                          <button onClick={() => updateProductQuantity(product.recordId, product.quantity + 1)}>+</button>
                        </div>
                        <span className="item-subtotal">¥{(parseFloat(product.fields.member_price || product.fields.price || 0) * product.quantity).toFixed(2)}</span>
                        <button onClick={() => removeProduct(product.recordId)} className="remove-btn">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div className="cart-total">
                    <span>总计:</span>
                    <strong>¥{calculateTotal().toFixed(2)}</strong>
                  </div>
                  <div className="cart-actions">
                    <button onClick={clearCart} className="clear-cart-btn">清空</button>
                    <button 
                      onClick={handleCheckout} 
                      disabled={isProcessing || !selectedMember} 
                      className="checkout-btn"
                    >
                      {isProcessing ? '处理中...' : '结账'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* 右侧商品区域 */}
        <div className="products-container">
          {/* 商品分类 */}
          <div className="categories">
            {categories.map(category => (
              <button
                key={category}
                className={activeCategory === category ? 'active' : ''}
                onClick={() => setActiveCategory(category)}
              >
                <i className={`fas ${category === '全部' ? 'fa-th-large' : category === '服务' ? 'fa-concierge-bell' : 'fa-box'}`}></i> {category}
              </button>
            ))}
          </div>

          {/* 商品列表 */}
          <div className="products-section">
            {isLoadingProducts ? (
              <LoadingSpinner />
            ) : (
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <div key={product.recordId} className="product-item">
                    <h4>{product.fields.name}</h4>
                    <div className="product-details">
                      <p>¥{parseFloat(product.fields.member_price || product.fields.price || 0).toFixed(2)}</p>
                      <button onClick={() => addProduct(product)} className="add-to-cart-btn">
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default FrontendCashier;