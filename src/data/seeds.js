export const UNDEFINED_ROLE = 'Cargo indefinido'

export const ROLE_ORDER = [
  UNDEFINED_ROLE,
  'Jovem Aprendiz',
  'Estagiário',
  'Mecânico',
  'Mecânico Sênior',
  'Supervisor',
  'Gerente',
  'Diretor',
  'Dono',
  'Dev',
]

export const ROLE_RANK = Object.fromEntries(ROLE_ORDER.map((role, index) => [role, index]))

export const PRICE_TABLE = {
  tuning: {
    Turbo: [33600],
    Suspensão: [10240, 20480, 30720, 40960],
    Transmissão: [15360, 30720, 46080, 61440],
    Motor: [15360, 30720, 46080, 61440, 76800],
    Freios: [10240, 20480, 30720],
    Hidraulico: [9000],
  },
  fullTuning: 221800,
  blindagem: [19200, 38400, 57600, 76800, 96000],
  fullBlindagem: 308800,
  items: [
    { key: 'reparo_pneu', label: 'Reparo Pneu', price: 2500 },
    { key: 'reparo', label: 'Reparo', price: 4500 },
    { key: 'kit_reparo', label: 'Kit Reparo', price: 3000, durability: 4 },
    { key: 'kit_master', label: 'Kit Master', price: 5000, max: 1, durability: 2 },
    { key: 'kit_drift', label: 'Kit Drift', price: 25000 },
    { key: 'pneu', label: 'Pneu', price: 2700, durability: 3 },
    { key: 'chave_inglesa', label: 'Chave Inglesa', price: 6000 },
    { key: 'nitro', label: 'Nitro', price: 25000, max: 1 },
  ],
  aesthetics: [
    { key: 'mudanca', label: 'Mudança estética', price: 5000 },
    { key: 'camaleao', label: 'Cor camaleão', price: 10000 },
    { key: 'fumaca', label: 'Fumaça', price: 9000 },
    { key: 'extras', label: 'Extras', price: 3500 },
  ],
  towing: { base: 2000, per2Km: 2500 },
  dmv: [
    { key: '2500', label: 'DMV', price: 2500, materials: false },
    { key: '3500', label: 'DMV + materiais para craft', price: 3500, materials: true },
  ],
}

export const ROLE_GROUPS = [
  'Dono', 'Diretor', 'Gerente', 'Supervisor', 'Mecânico Sênior', 'Mecânico', 'Estagiário', 'Jovem Aprendiz'
]
