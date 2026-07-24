import Breadcrumb from '../components/Breadcrumb.jsx';
import SiteIframe from '../components/SiteIframe.jsx';
import { FONTS } from '../theme';

/**
 * MX60/HOME — embebe el UX chihuahua-ux original con datos simulados
 * servidos por el Vite plugin niagara-mock.
 */
export default function MX60Home() {
  return (
    <div style={styles.root}>
      <Breadcrumb siteCode="MX60" page="Home" />
      <SiteIframe
        src="/sites/mx60/index.html"
        title="MX60 Chihuahua — Dashboard"
        themeStorageKey="mx60.user.theme"
      />
    </div>
  );
}

var styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text-primary)',
    fontFamily: FONTS.body,
  },
};
