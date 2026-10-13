const metrics = document.querySelector('#metrics');
const method = document.querySelector('#method');
const list = document.querySelector('#trace-list');
const detail = document.querySelector('#detail');
let traces = [];
let results = [];
let activeFilter = 'all';

function element(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function renderMetrics(summary) {
  metrics.replaceChildren();
  for (const [label, value] of [['Traces', summary.total], ['Passed', summary.passed], ['Failures exposed', summary.failed], ['Pass rate', `${summary.passRate}%`]]) {
    const card = element('div', 'metric');
    card.append(element('strong', '', value), element('span', '', label));
    metrics.append(card);
  }
}

function renderDetail(result) {
  const trace = traces.find(item => item.id === result.id);
  detail.replaceChildren();
  const top = element('div', 'detail-top');
  top.append(element('span', `badge ${result.passed ? 'pass' : 'fail'}`, result.passed ? 'PASS' : 'FAIL'), element('span', 'score', `${result.score}/100`));
  detail.append(top, element('h3', '', result.title), element('p', 'request', `“${trace.request}”`), element('p', 'provenance', trace.provenance));
  const checks = element('div', 'checks');
  for (const item of result.checks) {
    const row = element('details', `check ${item.passed ? 'pass' : 'fail'}`);
    if (!item.passed) row.open = true;
    const summary = element('summary', '', `${item.passed ? '✓' : '×'} ${item.label}`);
    const notes = element('ul');
    item.details.forEach(note => notes.append(element('li', '', note)));
    row.append(summary, notes);
    checks.append(row);
  }
  const raw = element('details', 'raw');
  raw.append(element('summary', '', 'Inspect raw trace'), element('pre', '', JSON.stringify(trace, null, 2)));
  detail.append(checks, raw);
}

function renderList() {
  list.replaceChildren();
  const visible = results.filter(result => activeFilter === 'all' || (activeFilter === 'passed' ? result.passed : !result.passed));
  for (const result of visible) {
    const button = element('button', 'trace-card');
    button.type = 'button';
    button.append(element('span', `dot ${result.passed ? 'pass' : 'fail'}`), element('span', 'trace-copy'));
    button.lastElementChild.append(element('b', '', result.title), element('small', '', `${result.category} · ${result.score}/100`));
    button.addEventListener('click', () => {
      document.querySelectorAll('.trace-card').forEach(item => item.classList.toggle('selected', item === button));
      renderDetail(result);
    });
    list.append(button);
  }
  if (visible[0]) {
    list.firstElementChild.classList.add('selected');
    renderDetail(visible[0]);
  }
}

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  renderList();
}));

try {
  const response = await fetch('/api/traces');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  traces = data.traces;
  results = data.evaluation.results;
  renderMetrics(data.evaluation.summary);
  method.textContent = data.evaluation.methodology;
  renderList();
} catch (error) {
  metrics.replaceChildren(element('p', 'error', `The evaluation could not be loaded: ${error.message}`));
}
