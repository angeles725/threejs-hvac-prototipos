import PlantasMap from './components/PlantasMap.jsx';
import MX60Home from './pages/MX60Home.jsx';
import MX0AHome from './pages/MX0AHome.jsx';
import { useHashRoute, navigate } from './lib/HashRouter';

/**
 * Sites con vista dedicada en la demo.
 * Las demás plantas (MX29, MX80, MX292, Garret) NO navegan — quedan en
 * popup del Home según definición del cliente.
 */
var SITES_WITH_VIEW = { MX60: true, MX0A: true };

export default function App() {
  var path = useHashRoute();

  function handleSelectPlant(plant) {
    if (SITES_WITH_VIEW[plant.id]) {
      navigate('/' + plant.id);
    } else {
      // Plantas sin vista todavía — no rompemos el flujo, solo log
      console.log('[demo] Sin vista dedicada todavía:', plant.id);
    }
  }

  if (path === '/MX60') return <MX60Home />;
  if (path === '/MX0A') return <MX0AHome />;
  return <PlantasMap onSelectPlant={handleSelectPlant} />;
}
