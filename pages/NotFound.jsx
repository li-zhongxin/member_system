import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/notfound.css';

function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">页面未找到</h2>
        <p className="not-found-text">您访问的页面不存在或已被移除</p>
        <Link to="/" className="btn btn-primary btn-lg mt-3">
          <i className="fas fa-home me-2"></i>返回首页
        </Link>
      </div>
    </div>
  );
}

export default NotFound;