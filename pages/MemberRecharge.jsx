import React, { useState } from 'react';
import { message } from 'antd';
import ApiService from '../services/apiService';
import '../styles/member-operation.css';
import '../styles/global-enhancement.css';
import '../styles/search-box.css';

function MemberRecharge() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isRecharging, setIsRecharging] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
        setMessage({ 
          type: 'success', 
          text: `充值成功！${selectedMember.fields.member_name} 充值 ¥${amount}，当前余额：¥${response.data.newBalance}` 
        });
        setRechargeAmount('');
        // 更新选中会员的余额显示
        setSelectedMember({
          ...selectedMember,
          fields: {
            ...selectedMember.fields,
            'Remaining sum': response.data.newBalance
          }
        });
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

  // 重置选择
  const handleReset = () => {
    setSelectedMember(null);
    setSearchTerm('');
    setSearchResults([]);
    setRechargeAmount('');
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="member-operation-container">
      <div className="page-header member-recharge">
        <h2>会员充值</h2>
        <p>为会员办理充值业务</p>
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

      {/* 充值操作区域 */}
      {selectedMember && (
        <div className="operation-section">
          <h4>充值操作：</h4>
          <div className="amount-input">
            <label>充值金额：</label>
            <input
              type="number"
              placeholder="请输入充值金额"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            <span className="currency">元</span>
          </div>
          <div className="quick-amounts">
            <span>快捷金额：</span>
            {[50, 100, 200, 500, 1000].map(amount => (
              <button 
                key={amount}
                onClick={() => setRechargeAmount(amount.toString())}
                className="quick-amount-btn"
              >
                ¥{amount}
              </button>
            ))}
          </div>
          <button 
            onClick={handleRecharge}
            disabled={isRecharging || !rechargeAmount}
            className="recharge-btn"
          >
            {isRecharging ? '充值中...' : '确认充值'}
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

export default MemberRecharge;