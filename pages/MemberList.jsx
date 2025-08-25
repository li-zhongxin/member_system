import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthModal from '../components/AuthModal';
import '../styles/memberlist.css';
import '../styles/global-enhancement.css';

function MemberList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState({
    searchTerm: '',
    status: 'all',
    level: 'all'
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState(null);
  


  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllMembers();
      if (response.success) {
        setMembers(response.data.records || []);
        setError(null);
      } else {
        setError('获取会员数据失败: ' + response.message);
      }
    } catch (err) {
      console.error('获取会员数据错误:', err);
      setError('获取会员数据失败: ' + (err.response?.data?.message || err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 批量选择处理函数
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedMembers(filteredMembers.map(member => member.recordId));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (recordId) => {
    setSelectedMembers(prev => {
      const newSelected = prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId];
      
      // 更新全选状态
      setSelectAll(newSelected.length === filteredMembers.length && filteredMembers.length > 0);
      return newSelected;
    });
  };

  // 批量删除
  const handleBatchDelete = async () => {
    setPendingDeleteAction({
      type: 'batch',
      memberIds: selectedMembers,
      count: selectedMembers.length
    });
    setShowAuthModal(true);
  };

  // 导出选中会员
  const handleExportSelected = () => {
    const selectedMemberData = members.filter(member => selectedMembers.includes(member.recordId));
    exportToCSV(selectedMemberData, `selected_members_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // 导出全部会员
  const handleExportAll = () => {
    exportToCSV(filteredMembers, `all_members_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // CSV导出函数
  const exportToCSV = (data, filename) => {
    const headers = ['会员姓名', '会员等级', '会员状态', '余额', '手机号码', '注册日期', '备注'];
    const csvContent = [
      headers.join(','),
      ...data.map(member => [
        member.fields.member_name || '',
        member.fields.member_level || '',
        member.fields.member_status || '',
        member.fields['Remaining sum'] || member.fields.Remaining_sum || 0,
        member.fields.phonenumber || '',
        member.fields.date ? new Date(member.fields.date).toLocaleDateString() : '',
        (member.fields.note || '').replace(/,/g, '；') // 替换逗号避免CSV格式问题
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (recordId) => {
    const member = members.find(m => m.recordId === recordId);
    setPendingDeleteAction({
      type: 'single',
      recordId,
      memberName: member?.fields?.member_name || '未知会员'
    });
    setShowAuthModal(true);
  };

  // 执行删除操作
  const executeDelete = async () => {
    if (!pendingDeleteAction) return;

    try {
      setProcessing(true);
      
      if (pendingDeleteAction.type === 'single') {
        const response = await ApiService.deleteMember(pendingDeleteAction.recordId);
        if (response.success) {
          setMembers(members.filter(member => member.recordId !== pendingDeleteAction.recordId));
          alert('会员删除成功！');
        } else {
          setError('删除会员失败: ' + response.message);
        }
      } else if (pendingDeleteAction.type === 'batch') {
        const deletePromises = pendingDeleteAction.memberIds.map(recordId => ApiService.deleteMember(recordId));
        const results = await Promise.allSettled(deletePromises);
        
        const successCount = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
        const failCount = pendingDeleteAction.memberIds.length - successCount;
        
        if (successCount > 0) {
          // 重新获取会员列表
          await fetchMembers();
          setSelectedMembers([]);
          setSelectAll(false);
        }
        
        if (failCount === 0) {
          alert(`成功删除 ${successCount} 个会员！`);
        } else {
          alert(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
        }
      }
    } catch (error) {
      console.error('删除失败:', error);
      setError('删除失败，请稍后重试');
    } finally {
      setProcessing(false);
    }
  };

  // 打开充值模态框
  const openRechargeModal = (member) => {
    setSelectedMember(member);
    setAmount('');
    setShowRechargeModal(true);
  };

  // 打开消费模态框
  const openConsumeModal = (member) => {
    setSelectedMember(member);
    setAmount('');
    setShowConsumeModal(true);
  };

  // 处理充值
  const handleRecharge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('请输入有效的充值金额');
      return;
    }

    try {
      setProcessing(true);
      const response = await ApiService.rechargeMember(selectedMember.recordId, parseFloat(amount));

      if (response.success) {
        alert(`充值成功！${selectedMember.fields.member_name} 充值了 ¥${amount}`);
        setShowRechargeModal(false);
        fetchMembers(); // 刷新会员列表
      } else {
        alert('充值失败: ' + response.message);
      }
    } catch (error) {
      alert('充值失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    } finally {
      setProcessing(false);
    }
  };

  // 处理消费
  const handleConsume = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('请输入有效的消费金额');
      return;
    }

    try {
      setProcessing(true);
      const response = await ApiService.consumeMember(selectedMember.recordId, parseFloat(amount));

      if (response.success) {
        alert(`消费成功！${selectedMember.fields.member_name} 消费了 ¥${amount}`);
        setShowConsumeModal(false);
        fetchMembers(); // 刷新会员列表
      } else {
        alert('消费失败: ' + response.message);
      }
    } catch (error) {
      alert('消费失败: ' + (error.message || '未知错误'));
    } finally {
      setProcessing(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.fields.member_name.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
                         member.fields.phonenumber.includes(filter.searchTerm);
    const matchesStatus = filter.status === 'all' || member.fields.member_status === filter.status;
    const matchesLevel = filter.level === 'all' || member.fields.member_level === filter.level;
    
    return matchesSearch && matchesStatus && matchesLevel;
  });

  const getMemberStatusBadge = (status) => {
    switch (status) {
      case '启用':
        return <span className="badge member-status-active">启用</span>;
      case '停用':
        return <span className="badge member-status-inactive">停用</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const getMemberLevelBadge = (level) => {
    switch (level) {
      case '黄金':
        return <span className="badge member-level-gold">黄金</span>;
      case '白银':
        return <span className="badge member-level-silver">白银</span>;
      case '青铜':
        return <span className="badge member-level-bronze">青铜</span>;
      case '铂金':
        return <span className="badge member-level-platinum">铂金</span>;
      case '钻石':
        return <span className="badge member-level-diamond">钻石</span>;
      case '黑金':
        return <span className="badge member-level-black">黑金</span>;
      default:
        return <span className="badge bg-secondary">{level}</span>;
    }
  };

  if (loading && members.length === 0) {
    return <LoadingSpinner text="正在加载会员数据..." size="large" />;
  }

  return (
    <div className="member-list-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title">会员管理</h1>
        <div className="d-flex gap-2">
          {selectedMembers.length > 0 && (
            <>
              <button
                className="btn btn-danger"
                onClick={handleBatchDelete}
                disabled={processing}
              >
                <i className="fas fa-trash me-2"></i>
                批量删除 ({selectedMembers.length})
              </button>
              <button
                className="btn btn-success"
                onClick={handleExportSelected}
              >
                <i className="fas fa-download me-2"></i>
                导出选中
              </button>
            </>
          )}
          <button
            className="btn btn-info"
            onClick={handleExportAll}
          >
            <i className="fas fa-file-export me-2"></i>
            导出全部
          </button>
          <Link to="/members/add" className="btn btn-primary">
            <i className="fas fa-user-plus me-2"></i>新增会员
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="搜索会员姓名或手机号..."
                  name="searchTerm"
                  value={filter.searchTerm}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
              >
                <option value="all">所有状态</option>
                <option value="启用">启用</option>
                <option value="停用">停用</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                name="level"
                value={filter.level}
                onChange={handleFilterChange}
              >
                <option value="all">所有等级</option>
                <option value="黑金">黑金</option>
                <option value="钻石">钻石</option>
                <option value="铂金">铂金</option>
                <option value="黄金">黄金</option>
                <option value="白银">白银</option>
                <option value="青铜">青铜</option>
              </select>
            </div>
          </div>
        </div>
      </div>



      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover member-table mb-0">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="form-check-input"
                    />
                  </th>
                  <th>会员姓名</th>
                  <th>会员等级</th>
                  <th>会员状态</th>
                  <th>余额</th>
                  <th>手机号码</th>
                  <th>注册日期</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member, index) => (
                    <tr key={member.recordId} className="fade-in" style={{animationDelay: `${index * 0.05}s`}}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.recordId)}
                          onChange={() => handleSelectMember(member.recordId)}
                          className="form-check-input"
                        />
                      </td>
                      <td>{member.fields.member_name}</td>
                      <td>{getMemberLevelBadge(member.fields.member_level)}</td>
                      <td>{getMemberStatusBadge(member.fields.member_status)}</td>
                      <td>¥{(member.fields['Remaining sum'] || member.fields.Remaining_sum || 0).toLocaleString()}</td>
                      <td>{member.fields.phonenumber}</td>
                      <td>
                        {member.fields.date ? 
                          new Date(member.fields.date).toLocaleDateString() !== 'Invalid Date' ? 
                            new Date(member.fields.date).toLocaleDateString() : 
                            '-' : 
                          '-'}
                      </td>
                      <td>{member.fields.note || '-'}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/members/edit/${member.recordId}`} className="btn btn-sm btn-outline-primary" title="编辑">
                            <i className="fas fa-edit"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openRechargeModal(member)}
                            title="充值"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => openConsumeModal(member)}
                            title="消费"
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(member.recordId)}
                            title="删除"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <div className="empty-state">
                        <i className="fas fa-search fa-3x mb-3"></i>
                        <h5>未找到会员</h5>
                        <p className="text-muted">没有符合条件的会员记录</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 充值模态框 */}
      {showRechargeModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-plus-circle text-success me-2"></i>
                  会员充值
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRechargeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedMember && (
                  <div>
                    <div className="mb-3">
                      <strong>会员信息：</strong>
                      <div className="mt-2">
                        <span className="badge bg-primary me-2">{selectedMember.fields.member_name}</span>
                        <span className="badge bg-info me-2">{selectedMember.fields.member_level}</span>
                        <span className="text-muted">当前余额: ¥{(selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="rechargeAmount" className="form-label">充值金额</label>
                      <div className="input-group">
                        <span className="input-group-text">¥</span>
                        <input
                          type="number"
                          className="form-control"
                          id="rechargeAmount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="请输入充值金额"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRechargeModal(false)}
                  disabled={processing}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleRecharge}
                  disabled={processing || !amount}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      充值中...
                    </>
                  ) : (
                    <>确认充值</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 消费模态框 */}
      {showConsumeModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-minus-circle text-warning me-2"></i>
                  会员消费
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConsumeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedMember && (
                  <div>
                    <div className="mb-3">
                      <strong>会员信息：</strong>
                      <div className="mt-2">
                        <span className="badge bg-primary me-2">{selectedMember.fields.member_name}</span>
                        <span className="badge bg-info me-2">{selectedMember.fields.member_level}</span>
                        <span className="text-muted">当前余额: ¥{(selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="consumeAmount" className="form-label">消费金额</label>
                      <div className="input-group">
                        <span className="input-group-text">¥</span>
                        <input
                          type="number"
                          className="form-control"
                          id="consumeAmount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="请输入消费金额"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      {selectedMember && amount && parseFloat(amount) > (selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0) && (
                        <div className="text-danger mt-2">
                          <i className="fas fa-exclamation-triangle me-1"></i>
                          余额不足！还差 ¥{(parseFloat(amount) - (selectedMember.fields['Remaining sum'] || selectedMember.fields.Remaining_sum || 0)).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConsumeModal(false)}
                  disabled={processing}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleConsume}
                  disabled={processing || !amount}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      消费中...
                    </>
                  ) : (
                    <>确认消费</>
                  )}
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
          ? `确定要删除会员「${pendingDeleteAction?.memberName}」吗？此操作不可恢复，需要管理员权限。`
          : `确定要删除选中的 ${pendingDeleteAction?.count} 个会员吗？此操作不可恢复，需要管理员权限。`
        }
      />
    </div>
  );
};

export default MemberList;