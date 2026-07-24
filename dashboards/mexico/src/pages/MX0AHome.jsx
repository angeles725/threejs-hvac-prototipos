import Breadcrumb from '../components/Breadcrumb.jsx';
import SiteIframe from '../components/SiteIframe.jsx';
import { FONTS } from '../theme';

/**
 * MX0A/HOME — embebe el UX sanluis-ux original con datos simulados
 * servidos por el Vite plugin niagara-mock.
 */
export default function MX0AHome() {
  return (
    <div style={styles.root}>
      <Breadcrumb siteCode="MX0A" page="Home" />
      <SiteIframe
        src="/snls/index.html"
        title="MX0A San Luis Potosí — Dashboard"
        themeStorageKey="snls.user.theme"
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
