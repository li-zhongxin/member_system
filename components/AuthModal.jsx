import React, { useState } from 'react';
import '../styles/auth-modal.css';

function AuthModal({ isOpen, onClose, onConfirm, title = '身份验证', message = '请输入管理员密码以确认此操作' }) {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // 管理员密码（实际项目中应该从后端验证）
  const ADMIN_PASSWORD = 'admin123';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsVerifying(true);
    setError('');

    // 模拟验证延迟
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        onConfirm();
        handleClose();
      } else {
        setError('密码错误，请重试');
      }
      setIsVerifying(false);
    }, 500);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setIsVerifying(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="auth-modal-body">
          <div className="auth-message">
            <i className="fas fa-shield-alt"></i>
            <p>{message}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">管理员密码</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理员密码"
                className={`form-input ${error ? 'error' : ''}`}
                autoFocus
              />
              {error && <span className="error-message">{error}</span>}
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                className="cancel-btn"
                disabled={isVerifying}
              >
                取消
              </button>
              <button
                type="submit"
                className="confirm-btn"
                disabled={isVerifying}
              >
                {isVerifying ? '验证中...' : '确认'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;