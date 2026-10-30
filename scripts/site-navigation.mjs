const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const link = (label, href, { download = false, className = '' } = {}) => `<a${className ? ` class="${className}"` : ''} href="${esc(href)}"${download ? ' download' : ''}>${esc(label)}</a>`;
const group = (label, links) => `<details class="site-nav-group"><summary>${esc(label)}</summary><ul>${links.map(item => `<li>${item}</li>`).join('')}</ul></details>`;

export function renderNavigation(audience, { pack, resources } = {}) {
  let items;
  let label;
  if (audience === 'learners') {
    label = 'For learners';
    items = [
      '<button class="site-nav-primary" id="start-daily" type="button">Today’s board</button>',
      '<button id="start-practice" type="button">Practice</button>',
      group('Explore', [link('The 16 thinking skills', '#skill-gallery'), link('Lessons & case studies', '/articles/')]),
      group('Your progress', [link('Your skill map', '#profile-title'), link('Leaderboard', '#leaderboard-title')]),
      link('For Instructors ↗', '/instructors/', { className: 'site-nav-switch' })
    ];
  } else if (audience === 'student') {
    label = 'Student activity';
    items = [
      link('Warm-up', '#warm-up'), link('Main activity', '#main-activity'), link('Exit ticket', '#exit-ticket'),
      group('Keep learning', [link('Student handout · PDF', pack.downloads.studentPdf, { download: true }), link('Practice this skill', pack.practiceHref), link('Learner home', '/learners/')])
    ];
  } else {
    label = 'For instructors';
    items = [link('Teaching packs', '/instructors/#teaching-packs', { className: 'site-nav-primary' })];
    if (pack) items.push(group('This lesson', [
      link('Learning goals & preparation', '#overview'), link('Teaching plan', '#teaching-plan'),
      link('Warm-up', '#warm-up'), link('Main activity', '#main-activity'), link('Discussion', '#discussion'),
      link('Exit ticket', '#exit-ticket'), link('Assessment & adaptations', '#assessment')
    ]));
    items.push(
      group('Explore', [link('The 16 thinking skills', '/instructors/#skills'), link('Lessons & case studies', '/articles/'), link('Curriculum & planning', '/instructors/#resources')]),
      group('Downloads', [
        ...(pack ? [link('This teaching pack · ZIP', pack.downloads.zip, { download: true })] : []),
        link('All 16 teaching packs · ZIP', '/output/teaching-packs/xixteen-all-16-teaching-packs.zip', { download: true }),
        link('Complete curriculum · PDF', '/' + resources.master.href, { download: true }),
        link('How the skills fit together · PDF', '/' + resources.synthesis.href, { download: true }),
        link('Reusable lesson template', '/docs/lesson-template.md', { download: true })
      ]),
      link('For Learners ↗', '/learners/', { className: 'site-nav-switch' })
    );
  }
  return `<header class="site-header"><div class="site-header-bar"><a class="site-brand" href="/" aria-label="XiXteen home">XiXteen<span>${label}</span></a><button class="site-menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" hidden>Menu<span class="site-menu-icon" aria-hidden="true"></span></button><nav class="site-nav" id="site-navigation" aria-label="${label} navigation">${items.join('')}</nav></div></header>`;
}
