import React, { useState, useEffect } from 'react';
import ApiService from '../services/apiService';
import productService from '../services/productService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/member-operation.css';
import '../styles/global-enhancement.css';
import '../styles/search-box.css';

function MemberConsume() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [consumeAmount, setConsumeAmount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isConsuming, setIsConsuming] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 商品相关状态
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [consumeType, setConsumeType] = useState('amount'); // 'amount' 或 'product'
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // 搜索会员
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setMessage({ type: 'error', text: '请输入搜索关键词' });
      return;
    }

    setIsSearching(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await ApiService.getAllMembers();
      if (response.success) {
        const members = response.data.records;
        const filteredMembers = members.filter(member => 
          member.fields.member_name?.includes(searchTerm) ||
          member.fields.phonenumber?.includes(searchTerm)
        );
        setSearchResults(filteredMembers);
        
        if (filteredMembers.length === 0) {
          setMessage({ type: 'info', text: '未找到匹配的会员' });
        }
      } else {
        setMessage({ type: 'error', text: '搜索失败：' + response.message });
      }
    } catch (error) {
      console.error('搜索会员失败:', error);
      setMessage({ type: 'error', text: '搜索失败，请稍后重试' });
    } finally {
      setIsSearching(false);
    }
  };

  // 选择会员
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setSearchResults([]);
    setSearchTerm('');
    setMessage({ type: '', text: '' });
  };

  // 加载商品列表
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await productService.getAllProducts();
      if (response.success && response.data && Array.isArray(response.data.records)) {
        // 只显示上架的商品
        const availableProducts = response.data.records.filter(product => 
          product.fields && product.fields.status === '上架'
        );
        setProducts(availableProducts);
      } else {
        console.error('加载商品失败:', response.error || '数据格式错误');
        setProducts([]);
      }
    } catch (error) {
      console.error('加载商品失败:', error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // 添加商品到购物车
  const addProductToCart = (product) => {
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

  // 更新商品数量
  const updateProductQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => p.recordId !== productId));
    } else {
      setSelectedProducts(selectedProducts.map(p => 
        p.recordId === productId ? { ...p, quantity } : p
      ));
    }
  };

  // 计算商品总价
  const calculateProductTotal = () => {
    return selectedProducts.reduce((total, product) => {
      return total + (product.fields.price * product.quantity);
    }, 0);
  };

  // 处理消费
  const handleConsume = async () => {
    if (!selectedMember) {
      setMessage({ type: 'error', text: '请先选择要消费的会员' });
      return;
    }

    let amount = 0;
    let consumeDetails = '';

    if (consumeType === 'amount') {
      amount = parseFloat(consumeAmount);
      if (!amount || amount <= 0) {
        setMessage({ type: 'error', text: '请输入有效的消费金额' });
        return;
      }
      consumeDetails = `金额消费 ¥${amount}`;
    } else {
      if (selectedProducts.length === 0) {
        setMessage({ type: 'error', text: '请选择要购买的商品' });
        return;
      }
      amount = calculateProductTotal();
      consumeDetails = `商品消费：${selectedProducts.map(p => `${p.fields.name} x${p.quantity}`).join(', ')} 总计 ¥${amount}`;
    }

    const currentBalance = selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0;
    if (amount > currentBalance) {
      setMessage({ 
        type: 'error', 
        text: `余额不足！当前余额：¥${currentBalance}，需要消费：¥${amount}，缺少：¥${(amount - currentBalance).toFixed(2)}` 
      });
      return;
    }

    setIsConsuming(true);
    setMessage({ type: '', text: '' });

    try {
      // 准备商品详情信息
      let productDetails = null;
      if (consumeType === 'product' && selectedProducts.length > 0) {
        productDetails = selectedProducts.map(p => `${p.fields.name} x${p.quantity}`).join(', ');
      }
      
      const response = await ApiService.consumeMember(selectedMember.recordId, amount, productDetails);

      if (response.success) {
        // 如果是商品消费，需要更新库存
        if (consumeType === 'product') {
          for (const product of selectedProducts) {
            if (product.fields.kind === '普通商品') {
              const newQuantity = product.fields.remaining_quantity - product.quantity;
              await productService.updateInventory(product.recordId, newQuantity);
            }
          }
        }

        setMessage({ 
          type: 'success', 
          text: `消费成功！${selectedMember.fields.member_name} ${consumeDetails}，剩余余额：¥${response.data.newBalance}` 
        });
        setConsumeAmount('');
        setSelectedProducts([]);
        // 更新选中会员的余额显示
        setSelectedMember({
          ...selectedMember,
          fields: {
            ...selectedMember.fields,
            'Remaining sum': response.data.newBalance
          }
        });
      } else {
        if (response.message.includes('余额不足')) {
          setMessage({ 
            type: 'error', 
            text: `余额不足！${response.message}` 
          });
        } else {
          setMessage({ type: 'error', text: '消费失败：' + response.message });
        }
      }
    } catch (error) {
      console.error('消费失败:', error);
      setMessage({ type: 'error', text: '消费失败，请稍后重试' });
    } finally {
      setIsConsuming(false);
    }
  };

  // 重置选择
  const handleReset = () => {
    setSelectedMember(null);
    setSearchTerm('');
    setSearchResults([]);
    setConsumeAmount('');
    setSelectedProducts([]);
    setMessage({ type: '', text: '' });
  };

  // 检查余额是否足够
  const checkBalance = () => {
    if (!selectedMember) return null;
    
    let amount = 0;
    if (consumeType === 'amount') {
      if (!consumeAmount) return null;
      amount = parseFloat(consumeAmount);
    } else {
      if (selectedProducts.length === 0) return null;
      amount = calculateProductTotal();
    }
    
    const currentBalance = selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0;
    
    if (amount > currentBalance) {
      return {
        sufficient: false,
        shortfall: amount - currentBalance
      };
    }
    
    return {
      sufficient: true,
      remaining: currentBalance - amount
    };
  };

  const balanceCheck = checkBalance();

  return (
    <div className="member-operation-container">
      <div className="page-header member-consume">
        <h2>会员消费</h2>
        <p>搜索并选择会员进行消费操作</p>
      </div>

      {/* 搜索区域 */}
      <div className="search-container">
        <div className="search-wrapper">
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="输入会员姓名或手机号搜索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            onClick={handleSearch} 
            disabled={isSearching}
            className="search-button"
          >
            <i className="fas fa-search"></i>
            {isSearching ? '搜索中...' : '搜索'}
          </button>
          {searchTerm && (
            <button className="clear-search" onClick={() => {
              setSearchTerm('');
              setSearchResults([]);
            }}>
              <i className="fas fa-times"></i>
              清空
            </button>
          )}
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <h4>搜索结果：</h4>
            <div className="member-list">
              {searchResults.map((member) => (
                <div 
                  key={member.recordId} 
                  className="member-item"
                  onClick={() => handleSelectMember(member)}
                >
                  <div className="member-info">
                    <span className="member-name">{member.fields.member_name}</span>
                    <span className="member-phone">{member.fields.phonenumber}</span>
                    <span className="member-balance">
                      余额：¥{member.fields['Remaining sum'] || member.fields.Remaining_sum || 0}
                    </span>
                  </div>
                  <button className="select-btn">选择</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 选中的会员信息 */}
      {selectedMember && (
        <div className="selected-member">
          <h4>选中的会员：</h4>
          <div className="member-card">
            <div className="member-details">
              <p><strong>姓名：</strong>{selectedMember.fields.member_name}</p>
              <p><strong>手机号：</strong>{selectedMember.fields.phonenumber}</p>
              <p><strong>当前余额：</strong>¥{selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0}</p>
              <p><strong>会员等级：</strong>{selectedMember.fields.member_level || '普通会员'}</p>
            </div>
            <button onClick={handleReset} className="reset-btn">重新选择</button>
          </div>
        </div>
      )}

      {/* 消费操作区域 */}
      {selectedMember && (
        <div className="operation-section">
          <h4>消费操作：</h4>
          
          {/* 消费类型选择 */}
          <div className="consume-type-selection">
            <label>消费类型：</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="amount"
                  checked={consumeType === 'amount'}
                  onChange={(e) => setConsumeType(e.target.value)}
                />
                <span>金额消费</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="product"
                  checked={consumeType === 'product'}
                  onChange={(e) => setConsumeType(e.target.value)}
                />
                <span>商品消费</span>
              </label>
            </div>
          </div>

          {/* 金额消费 */}
          {consumeType === 'amount' && (
            <div className="amount-consume">
              <div className="amount-input">
                <label>消费金额：</label>
                <input
                  type="number"
                  placeholder="请输入消费金额"
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="currency">元</span>
              </div>
              
              <div className="quick-amounts">
                <span>快捷金额：</span>
                {[10, 20, 50, 100, 200].map(amount => (
                  <button 
                    key={amount}
                    onClick={() => setConsumeAmount(amount.toString())}
                    className="quick-amount-btn"
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 商品消费 */}
          {consumeType === 'product' && (
            <div className="product-consume">
              <h5>选择商品：</h5>
              {isLoadingProducts ? (
                <LoadingSpinner text="正在加载商品数据..." size="medium" />
              ) : (
                <div className="product-list">
                  {products.map(product => (
                    <div key={product.recordId} className="product-item">
                      <div className="product-info">
                        <h6>{product.fields.name}</h6>
                        <p className="product-specs">{product.fields.specifications}</p>
                        <p className="product-price">¥{product.fields.price}</p>
                        {product.fields.kind === '普通商品' && (
                          <p className="product-stock">库存：{product.fields.remaining_quantity} {product.fields.unit}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => addProductToCart(product)}
                        className="add-to-cart-btn"
                        disabled={product.fields.kind === '普通商品' && product.fields.remaining_quantity <= 0}
                      >
                        添加
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 购物车 */}
              {selectedProducts.length > 0 && (
                <div className="shopping-cart">
                  <h5>已选商品：</h5>
                  <div className="cart-items">
                    {selectedProducts.map(product => (
                      <div key={product.recordId} className="cart-item">
                        <div className="item-info">
                          <span className="item-name">{product.fields.name}</span>
                          <span className="item-price">¥{product.fields.price}</span>
                        </div>
                        <div className="quantity-controls">
                          <button 
                            onClick={() => updateProductQuantity(product.recordId, product.quantity - 1)}
                            className="quantity-btn"
                          >
                            -
                          </button>
                          <span className="quantity">{product.quantity}</span>
                          <button 
                            onClick={() => updateProductQuantity(product.recordId, product.quantity + 1)}
                            className="quantity-btn"
                            disabled={product.fields.kind === '普通商品' && product.quantity >= product.fields.remaining_quantity}
                          >
                            +
                          </button>
                        </div>
                        <div className="item-total">¥{(product.fields.price * product.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="cart-total">
                    <strong>总计：¥{calculateProductTotal().toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 余额检查提示 */}
          {balanceCheck && (
            <div className={`balance-check ${balanceCheck.sufficient ? 'sufficient' : 'insufficient'}`}>
              {balanceCheck.sufficient ? (
                <span className="balance-ok">
                  ✓ 余额充足，消费后剩余：¥{balanceCheck.remaining.toFixed(2)}
                </span>
              ) : (
                <span className="balance-error">
                  ✗ 余额不足，还需要：¥{balanceCheck.shortfall.toFixed(2)}
                </span>
              )}
            </div>
          )}
          
          <button 
            onClick={handleConsume}
            disabled={isConsuming || 
              (consumeType === 'amount' && !consumeAmount) || 
              (consumeType === 'product' && selectedProducts.length === 0) ||
              (balanceCheck && !balanceCheck.sufficient)
            }
            className={`consume-btn ${balanceCheck && !balanceCheck.sufficient ? 'disabled' : ''}`}
          >
            {isConsuming ? '消费中...' : '确认消费'}
          </button>
        </div>
      )}

      {/* 消息提示 */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default MemberConsume;