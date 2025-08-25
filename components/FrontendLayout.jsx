import React from 'react';
import { Outlet } from 'react-router-dom';
import FrontendNavigation from './FrontendNavigation';
import '../styles/frontend-layout.css';

function FrontendLayout() {
  return (
    <div className="frontend-layout">
      <div className="frontend-sidebar">
        <FrontendNavigation />
      </div>
      
      <div className="frontend-main">
        <div className="frontend-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default FrontendLayout;