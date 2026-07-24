import React from 'react';
import HeroKPI from '../components/HeroKPI.jsx';
import DemandChart from '../components/DemandChart.jsx';
import PowerDonut from '../components/PowerDonut.jsx';
import IsoFacility from '../components/IsoFacility.jsx';
import ZoneHeatmap from '../components/ZoneHeatmap.jsx';
import TariffBands from '../components/TariffBands.jsx';
import AlertsFeed from '../components/AlertsFeed.jsx';
import BudgetRing from '../components/BudgetRing.jsx';
import TopConsumers from '../components/TopConsumers.jsx';

export default function Overview({ data }) {
  return (
    <>
      <HeroKPI data={data} />

      <div className="r-grid r-row-2">
        <DemandChart data={data} />
        <PowerDonut data={data} />
      </div>

      <div style={{ marginTop: 18 }}>
        <IsoFacility data={data} />
      </div>

      <div className="r-grid r-row-3-asym" style={{ marginTop: 18 }}>
        <TariffBands data={data} />
        <BudgetRing data={data} />
        <TopConsumers data={data} />
      </div>

      <div className="r-grid r-row-2" style={{ marginTop: 18 }}>
        <ZoneHeatmap data={data} />
        <AlertsFeed data={data} />
      </div>
    </>
  );
}

const styles = {};
