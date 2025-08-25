import React, { useState } from 'react';
import ApiService from '../services/apiService';
import '../styles/frontend-recharge.css';
import '../styles/global-enhancement.css';

function FrontendRecharge() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRecharging, setIsRecharging] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 快捷充值金额
  const quickAmounts = [50, 100, 200, 500, 1000];

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

  // 快捷充值
  const handleQuickRecharge = (amount) => {
    setRechargeAmount(amount.toString());
  };

  // 处理充值
  const handleRecharge = async () => {
    if (!selectedMember) {
      setMessage({ type: 'error', text: '请先选择要充值的会员' });
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: '请输入有效的充值金额' });
      return;
    }

    setIsRecharging(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await ApiService.rechargeMember(selectedMember.recordId, amount);
      
      if (response.success) {
        const newBalance = (selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0) + amount;
        setMessage({ 
          type: 'success', 
          text: `充值成功！充值金额：¥${amount}，当前余额：¥${newBalance.toFixed(2)}` 
        });
        
        // 更新会员信息
        setSelectedMember({
          ...selectedMember,
          fields: {
            ...selectedMember.fields,
            'Remaining sum': newBalance,
            Remaining_sum: newBalance
          }
        });
        
        // 清空充值金额
        setRechargeAmount('');
      } else {
        setMessage({ type: 'error', text: '充值失败：' + response.message });
      }
    } catch (error) {
      console.error('充值失败:', error);
      setMessage({ type: 'error', text: '充值失败，请稍后重试' });
    } finally {
      setIsRecharging(false);
    }
  };

  // 清空选择
  const clearSelection = () => {
    setSelectedMember(null);
    setSearchResults([]);
    setSearchTerm('');
    setRechargeAmount('');
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="frontend-recharge">
      <div className="recharge-container">
        <div className="recharge-header">
          <h2>会员充值</h2>
        </div>

        {/* 会员搜索区域 */}
        <div className="member-search-section">
          <h3>选择会员</h3>
          <div className="search-input-group">
            <input
              type="text"
              placeholder="输入会员姓名或手机号"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="search-btn"
            >
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>搜索结果：</h4>
              <div className="members-list">
                {searchResults.map((member) => (
                  <div 
                    key={member.recordId} 
                    className="member-item"
                    onClick={() => handleSelectMember(member)}
                  >
                    <div className="member-info">
                      <div className="member-name">{member.fields.member_name}</div>
                      <div className="member-phone">{member.fields.phonenumber}</div>
                      <div className="member-level">{member.fields.member_level}</div>
                      <div className="member-balance">当前余额：¥{member.fields['Remaining sum'] || member.fields.Remaining_sum || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 选中的会员信息 */}
        {selectedMember && (
          <div className="selected-member-section">
            <div className="section-header">
              <h3>选中会员</h3>
              <button onClick={clearSelection} className="clear-btn">重新选择</button>
            </div>
            
            <div className="member-card">
              <div className="member-details">
                <div className="detail-item">
                  <label>姓名：</label>
                  <span>{selectedMember.fields.member_name}</span>
                </div>
                <div className="detail-item">
                  <label>手机号：</label>
                  <span>{selectedMember.fields.phonenumber}</span>
                </div>
                <div className="detail-item">
                  <label>会员等级：</label>
                  <span>{selectedMember.fields.member_level}</span>
                </div>
                <div className="detail-item">
                  <label>当前余额：</label>
                  <span className="balance">¥{selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 充值区域 */}
        {selectedMember && (
          <div className="recharge-section">
            <h3>充值金额</h3>
            
            {/* 快捷充值按钮 */}
            <div className="quick-amounts">
              <label>快捷充值：</label>
              <div className="amount-buttons">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => handleQuickRecharge(amount)}
                    className={`amount-btn ${rechargeAmount === amount.toString() ? 'active' : ''}`}
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义金额输入 */}
            <div className="custom-amount">
              <label>自定义金额：</label>
              <div className="amount-input-group">
                <span className="currency">¥</span>
                <input
                  type="number"
                  placeholder="请输入充值金额"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="amount-input"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* 充值预览 */}
            {rechargeAmount && parseFloat(rechargeAmount) > 0 && (
              <div className="recharge-preview">
                <div className="preview-item">
                  <span>充值金额：</span>
                  <span className="amount">¥{parseFloat(rechargeAmount).toFixed(2)}</span>
                </div>
                <div className="preview-item">
                  <span>充值后余额：</span>
                  <span className="new-balance">
                    ¥{((selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0) + parseFloat(rechargeAmount)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* 充值按钮 */}
            <div className="recharge-actions">
              <button
                onClick={handleRecharge}
                disabled={isRecharging || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
                className="recharge-btn"
              >
                {isRecharging ? '充值中...' : '确认充值'}
              </button>
            </div>
          </div>
        )}
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

export default FrontendRecharge;