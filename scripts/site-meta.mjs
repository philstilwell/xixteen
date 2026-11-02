const esc = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function socialMetadata(title, description, path) {
  return `<!-- social-meta:start -->
<meta property="og:type" content="website"><meta property="og:site_name" content="XiXteen"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="https://xixteen.com${path}"><meta property="og:image" content="https://xixteen.com/assets/gateway/learners-v2-original.png"><meta property="og:image:alt" content="Learners exploring an argument map together"><meta name="twitter:card" content="summary_large_image">
<!-- social-meta:end -->`;
}
