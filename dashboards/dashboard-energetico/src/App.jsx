import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { useEnergySimulation } from './hooks/useEnergySimulation.js';
import { useViewport } from './hooks/useViewport.js';

export default function App() {
  const [section, setSection] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const data = useEnergySimulation(15000);
  const { isDesktop } = useViewport();

  const handleSelect = (id) => {
    setSection(id);
    if (!isDesktop) setDrawerOpen(false);
  };

  return (
    <div style={styles.shell}>
      <Sidebar
        section={section}
        onSelect={handleSelect}
        isDesktop={isDesktop}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      {!isDesktop && drawerOpen && (
        <div className="sidebar-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
      <div style={styles.main}>
        <TopBar
          data={data}
          isDesktop={isDesktop}
          onToggleMenu={() => setDrawerOpen(v => !v)}
        />
        <div style={styles.content} className="grid-bg">
          <Dashboard data={data} section={section} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px 24px 32px',
    position: 'relative',
  },
};
