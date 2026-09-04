import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="pixel-logo"><div className="pixel-text">LOADING</div></div>
      <div className="loading-bar"><div className="loading-progress"></div></div>
      <div className="loading-text">INITIALIZING CODE MANAGER</div>
    </div>
  );
}
