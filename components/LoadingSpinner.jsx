import React from 'react';
import '../styles/loading-spinner.css';

const LoadingSpinner = ({ text = '正在加载中...', size = 'medium' }) => {
  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${size}`}></div>
      <div className="loading-text">{text}</div>
    </div>
  );
};

export default LoadingSpinner;