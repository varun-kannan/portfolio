export const SPEC = [
  ['Title', 'Software Engineer · Surfboard Payments'],
  ['Experience', '4+ years'],
  ['Transactions', '1M+ / month'],
  ['Terminals', '35K registered · 25k+ live'],
  ['Users', '50K+'],
  ['Events / day', '10M+'],
  ['Certification', 'EMV L3 · PCI-DSS', true],
];

export const MARQUEE = [
  'Payments infrastructure',
  'Terminal management',
  'Acquirer integration & L3',
  'EMV and card cryptography',
  'Distributed systems',
];

export const WORK = [
  {
    id: 'W—05',
    title: 'Auth Gateway & acquirer integration',
    role: 'Primary author · PCI-DSS scope',
    when: 'Feb 2022 — present',
    body: [
      'Encrypted transport, ISO 8583 message building, PIN translation through a hardware security module, and response mapping — written from scratch inside an environment where card data has to be impossible to leak, not just unlikely.',
      'Three acquirers live and certified end to end. Every provider speaks a dialect; the shared library absorbs most of it, but certification is still weeks in a lab, not a config change.',
    ],
    seam: 'Every acquirer speaks a dialect. The shared library absorbs most of it — certification is still weeks in a lab.',
    metrics: '1M+ transactions/month · 200+ peak TPS · <500 ms p99 · EMV L3 certified',
    tags: ['TypeScript', 'Fastify', 'ISO 8583', 'HSM · DUKPT', 'PCI DSS'],
  },
  {
    id: 'W—04',
    title: 'Terminal Management System',
    role: 'Owner · 1,088 commits',
    when: '2022 — present',
    body: [
      "Every terminal in the field is registered, configured and updated from here. If a device can't read its config it can't take a card, so nothing in this system is allowed to go offline.",
      'That included the day its history outgrew the database and three billion rows were repartitioned under a live fleet with no maintenance window. Fleet actions are eventually consistent — a powered-off terminal reads as pending, not failed, and the interface has to say so.',
    ],
    seam: 'A powered-off terminal reads as pending, not failed — and the interface has to say so.',
    metrics: '35K terminals registered · 25k+ live · 3B+ rows moved · zero seconds downtime',
    tags: ['NestJS', 'PostgreSQL', 'Redis', 'MQTT'],
  },
  {
    id: 'W—03',
    title: 'Offline card acceptance',
    role: 'Double-Up · CheckoutX · surflink',
    when: '2023 — present',
    body: [
      'Merchants on weak coverage were losing sales outright. Accepting a card offline moves the risk decision onto the device itself — and a crash mid-queue must never double-charge or quietly lose a sale.',
      'Built across the terminal, the app and the backend. Offline trades certainty for availability; it only works because settlement expects the mess and absorbs it.',
    ],
    metrics: '170k+ offline payments settled · no duplicates',
    tags: ['Kotlin', 'Flutter', 'EMV · BER-TLV', 'SoftPOS'],
  },
  {
    id: 'W—02',
    title: 'Terminal Director & SurfSignal',
    role: 'Connection server · event backbone',
    when: '2023 — present',
    body: [
      'The server every terminal connects to, the wire protocol it speaks, and the event backbone the rest of the estate reads from — delivery acknowledged end to end rather than hoped for.',
    ],
    metrics: '10M+ events/day · 99.9% uptime',
    tags: ['Express', 'Redis Streams', 'gRPC'],
  },
  {
    id: 'W—01',
    title: 'Software Manager & Task Manager',
    role: 'Release pipeline · fleet telemetry',
    when: '2024 — present',
    body: [
      'Releases to 25,000 live devices, where an infrastructure failure retries in place and a rejection starts clean. Fleet commands and telemetry aggregate in memory, so the database never carries the write load.',
    ],
    tags: ['NestJS', 'Redis', 'State machines'],
  },
];

// Roughly chronological: terminal management came first, acquirer work later.
export const EXPERIENCE_POINTS = [
  'Own the terminal management system behind 35,000 registered devices, 1,088 commits as primary author',
  'Built the acquirer integration layer from nothing — three providers live, EMV L3 certified end to end',
  'Shipped offline card acceptance across device, app and backend — 170k+ payments settled, no duplicates',
  'Repartitioned three billion rows under a live fleet with no maintenance window',
  'Currently on acquirer integration and L3 certification for new markets',
];

export const CAPABILITIES = [
  { n: '01', area: 'Payments', title: 'Card acceptance and authorization', items: ['PCI DSS', 'EMV · L3 certification', 'ISO 8583 · ISO 7816', 'BER-TLV', 'DUKPT · PIN translation', 'HSM key management'] },
  { n: '02', area: 'Backend', title: 'Services that stay up', items: ['TypeScript · JavaScript', 'Node.js · NestJS', 'Fastify · Express', 'REST · gRPC', 'Webhooks'] },
  { n: '03', area: 'Data & messaging', title: 'State, events and queues', items: ['PostgreSQL · MySQL', 'Redis · Redis Streams', 'MongoDB · SQLite', 'MQTT · Pub/Sub', 'Partitioning · migrations'] },
  { n: '04', area: 'Device & mobile', title: 'Software on the terminal', items: ['Kotlin · Android', 'Flutter · Dart', 'SoftPOS', 'Native bridges', 'On-device diagnostics'] },
  { n: '05', area: 'Architecture', title: 'How the pieces fit', items: ['Microservices', 'Event-driven systems', 'State machines', 'Idempotency', 'Google Cloud · Kubernetes', 'Docker · CI/CD'] },
];

export const PROJECTS = [
  {
    id: 'P—002',
    kind: 'CLI · TypeScript',
    name: 'jobscout',
    href: 'https://github.com/varun-kannan/jobscout',
    body: 'Searches nineteen job sources in parallel and ranks every posting by how many of your actual skills it asks for. Your résumé becomes a skill graph; each posting is parsed against the same vocabulary, so Postgres, PostgreSQL and psql count once instead of missing three times.',
    decision: "The ranker is arithmetic, not a model's opinion — so the ordering is reproducible, explainable and free, and every posting gets measured rather than sampled. The AI sits alongside the count, never replacing it.",
    note: 'Nothing auto-applies: there is no browser-automation library in the dependency tree, so the tool is physically incapable of submitting a form. Runs entirely local — one binary, no account, no server.',
    tags: ['Bun', 'TypeScript', 'SQLite', 'Ink TUI', '400 tests'],
  },
  {
    id: 'P—001',
    kind: 'REST API · TypeScript',
    name: 'library',
    href: 'https://github.com/varun-kannan/library',
    body: 'A book-lending service on Fastify, TypeORM and PostgreSQL — JWT auth with roles, transactional row-locked lending, and a load-balanced stack of nginx plus three replicas behind one published port.',
    decisionLead: 'Turning ',
    decisionEm: 'synchronize',
    decision:
      " off. It diffed entities against the live schema on every boot and silently ran whatever DDL closed the gap — including dropping a renamed column's data — and it makes running more than one replica unsafe. Migrations are now the only way the schema changes.",
    note: 'Passwords are scrypt from node:crypto, not bcrypt — a native addon would have meant python3, make and g++ in the Docker build. Sign-in answers identically whether the account is missing or the password is wrong, and the tests measure that rather than assume it. The README lists the known gaps.',
    tags: ['Fastify', 'TypeORM', 'PostgreSQL', 'Docker · nginx', '150 tests'],
  },
];

export const APPROACH = [
  'Keep the risky part small, and everything else away from it.',
  'Write the thing other people build on top of.',
  'Shipping is the start of owning it.',
  'When it breaks, read the real traffic — not the docs.',
];

export const SECTIONS = [
  ['work', '01 Work'],
  ['experience', '02 Experience'],
  ['capabilities', '03 Capabilities'],
  ['independent', '04 Independent'],
  ['approach', '05 Approach'],
  ['contact', '06 Contact'],
];

export const EMAIL = 'varunk461160@gmail.com';
export const GITHUB = 'https://github.com/varun-kannan';
export const LINKEDIN = 'https://linkedin.com/in/varun-n-7a6516256';
