import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import vikaUserService from '../services/vikaService';

import '../styles/login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // 清除错误信息
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 使用维格表验证登录
      const isValid = await vikaUserService.validateLogin(credentials.username, credentials.password);
      
      if (isValid) {
        // 登录成功
        login(true);
        navigate('/dashboard');
      } else {
        // 登录失败
        setError('用户名或密码错误');
      }
    } catch (error) {
      console.error('登录验证失败:', error);
      setError('登录验证失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-header slide-in-top">
          <div className="login-logo pulse">
            <i className="fas fa-users-cog"></i>
          </div>
          <h2>会员管理系统</h2>
          <p className="text-muted">请输入您的登录凭据</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              <i className="fas fa-user me-2"></i>
              用户名
            </label>
            <input
              type="text"
              className="form-control"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="请输入用户名"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <i className="fas fa-lock me-2"></i>
              密码
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="请输入密码"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-login"
            disabled={loading || !credentials.username || !credentials.password}
          >
            <i className="fas fa-sign-in-alt me-2"></i>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>


      </div>

      <div className="login-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>
    </div>
  );
};

export default Login;